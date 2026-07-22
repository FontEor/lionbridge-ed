import Drawer from "@/components/Drawer";
import { useTranslation, Trans } from "react-i18next";
import { useEventStore } from "@/stores/eventStore";
import { useEffect, useMemo, useState } from "react";
import Checkbox from "@/components/Checkbox";
import dayjs from "dayjs";
import { formatDateWithLocale } from "@/utils/dateHelpers";
import DateInput from "@/components/DateInput";
import { useBookingStore } from "@/stores/bookingStore";
import { useGlobalStore } from "@/stores/store";
import type { EventProps } from "@/types/booking.types";
import { useClearGridSelections } from "@/hooks/useGridSelect";
import { useChangesNotification } from "@/hooks/useCommon";
import { copyEvent, createIdGenerator } from "@/utils/copyEventUtils";

export default function CopyEventDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const copiedEvents = useEventStore.useSelectedEvents();
  const setIsDirty = useEventStore.useSetIsDirty();
  const bookingInfo = useBookingStore.useBookingInfo();
  const [dates, setDates] = useState<string[]>([]);
  const [otherDate, setOtherDate] = useState<string>("");
  const eventGridRef = useGlobalStore.useEventGridRef();
  const clearGridSelections = useClearGridSelections();
  const changeNotification = useChangesNotification();

  useEffect(() => {
    if (!open) {
      setDates([]);
      setOtherDate("");
    }
  }, [open]);

  const counts = useMemo(() => {
    let orderCount = 0,
      itemCount = 0;
    for (const event of copiedEvents) {
      if (event.eventOrders) {
        orderCount += event.eventOrders.length;
        for (const order of event.eventOrders) {
          if (order.items) {
            itemCount += order.items.length;
          }
        }
      }
    }
    return { eventCount: copiedEvents.length, orderCount, itemCount };
  }, [copiedEvents]);

  const bookingDates = useMemo(() => {
    const dates = new Set<string>(),
      current = dayjs().startOf("day");
    if (bookingInfo) {
      const { arrivalDate, departureDate } = bookingInfo;
      let date = dayjs(arrivalDate);
      const endDay = dayjs(departureDate);
      while (date.isBefore(endDay) || date.isSame(endDay, "day")) {
        if (!date.isBefore(current)) dates.add(date.format("YYYY-MM-DD"));
        date = date.add(1, "day");
      }
    }
    return [...dates];
  }, [bookingInfo]);

  const onSubmit = () => {
    const pasteDates = [...dates];
    if (otherDate) pasteDates.push(otherDate);
    const genId = createIdGenerator();
    const pasteEvents: EventProps[] = [];
    for (const event of copiedEvents) {
      for (const date of pasteDates) {
        pasteEvents.push(copyEvent(event, date, genId));
      }
    }
    eventGridRef?.current?.api.applyTransaction({
      add: pasteEvents,
    });
    changeNotification();
    setIsDirty(true);
    clearGridSelections();
    onClose();
  };

  return (
    <Drawer
      title={t("heading.copyEvent")}
      open={open}
      onClose={onClose}
      onConfirm={onSubmit}
      showCloseIcon
      confirmText={t("button.paste")}
      cancelText={t("button.cancel")}
      size="medium"
      confirmDisabled={dates.length === 0 && !otherDate}
    >
      <form className="flex flex-col gap-6">
        <div className="text-xs leading-4">
          <Trans
            i18nKey={
              counts.orderCount === 0
                ? "copy.copyPasteEvent"
                : counts.itemCount === 0
                  ? "copy.copyPasteEventAndOrder"
                  : "copy.copyPasteEventAndOrderAndItem"
            }
            components={{ strong: <strong /> }}
            values={counts}
          />
        </div>
        <div className="text-sm leading-4 font-semibold">
          * {t("label.selectDatesToPaste")}
        </div>
        <div className="flex flex-col gap-3">
          <label className="text-sm leading-4 font-semibold">
            {t("label.bookingDates")}
          </label>
          <Checkbox.Group
            onChange={(value) => {
              setDates(value as string[]);
            }}
            wrapperClassName="grid grid-cols-3 gap-2"
            options={bookingDates.map((date) => ({
              label: formatDateWithLocale(date, "DD-MMM-YYYY (dd)"),
              value: date,
            }))}
            value={dates}
          />
        </div>
        <div className="flex flex-col gap-3">
          <div className="text-sm leading-4 font-semibold">
            {t("label.otherDate")}
          </div>
          <DateInput
            formatStr="DD-MMM-YYYY (dd)"
            wrapperClassName="w-[251px]"
            value={otherDate}
            min={dayjs().format("YYYY-MM-DD")}
            onChange={(event) => {
              setOtherDate(event.target.value);
            }}
          />
        </div>
      </form>
    </Drawer>
  );
}
