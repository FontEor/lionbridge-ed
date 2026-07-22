import Button from "@/components/Button";
import { Block, Close, Info, Paste } from "@/components/Icons";
import { useChangesNotification } from "@/hooks/useCommon";
import {
  useClearGridSelections,
  useRedrawSelectedOrders,
  useSelectedOrderInfo,
} from "@/hooks/useGridSelect";
import { useEventStore } from "@/stores";
import { useGlobalStore } from "@/stores/store";
import { copyEventOrder, createIdGenerator } from "@/utils/copyEventUtils";
import { formatToTime } from "@/utils/dateHelpers";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { validateEvents } from "@/utils/validation";

export default function PasteActionBar() {
  const selectedEvents = useEventStore.useSelectedEvents();
  const eventGridRef = useGlobalStore.useEventGridRef();
  const setIsCopyOrder = useEventStore.useSetIsCopyOrder();
  const redrawSelectedOrders = useRedrawSelectedOrders();
  const { t } = useTranslation();
  const clearGridSelections = useClearGridSelections();
  const selectedEventOrderInfo = useSelectedOrderInfo();
  const selectedEventOrders = useEventStore.useSelectedEventOrders();
  const changeNotification = useChangesNotification();
  const setIsDirty = useEventStore.useSetIsDirty();

  const handleEventOrderPaste = useCallback(async () => {
    const orders = Object.values(selectedEventOrders).flat();
    if (orders.length === 0 || selectedEvents.length === 0) return;
    const genId = createIdGenerator();
    for (const event of selectedEvents) {
      const newOrders = orders.map((order) => {
        const newOrder = copyEventOrder(order, event.eventDate, genId);
        newOrder.startDateTime = event.startDateTime;
        newOrder.endDateTime = event.endDateTime;
        newOrder.attendanceEstimate = event.attendance;
        newOrder.finalDetailedIndicator = false;
        const orderStartTime = formatToTime(order.startDateTime);
        newOrder.items?.forEach((item) => {
          if (formatToTime(item.serveDtTm) === orderStartTime) {
            item.serveDtTm = event.startDateTime;
          }
        });
        return newOrder;
      });
      event.eventOrders = [...(event.eventOrders ?? []), ...newOrders];
      event.dirty = true;
    }
    const _validatedEvents = await validateEvents(selectedEvents);
    useGlobalStore.getState().eventGridRef?.current?.api.applyTransaction({
      update: _validatedEvents,
    });
    changeNotification();
    setIsDirty(true);
    clearGridSelections();
  }, [
    selectedEventOrders,
    selectedEvents,
    changeNotification,
    setIsDirty,
    clearGridSelections,
  ]);

  return (
    <>
      <div className="flex items-center gap-6 max-md:gap-4">
        {selectedEvents.length === 0 ? (
          <div className="flex gap-2 text-sm font-semibold">
            <Info className="size-4.5" />
            {t("copy.selectRowsToPaste")}
          </div>
        ) : (
          <Button
            variant="tertiary"
            size="small"
            className="truncate px-0 text-white"
            startIcon={<Paste />}
            onClick={handleEventOrderPaste}
          >
            {t("button.paste")}
          </Button>
        )}
      </div>
      <div className="flex items-center gap-4 max-md:gap-2">
        <Button
          variant="tertiary"
          size="small"
          className="truncate px-0 text-white"
          startIcon={<Block />}
          onClick={() => {
            setIsCopyOrder(false);
            redrawSelectedOrders();
            eventGridRef?.current?.api.deselectAll();
          }}
        >
          {t("button.cancelCopy")}
        </Button>
        <div className="ml-0.5 shrink-0 truncate text-sm font-semibold">
          {t("button.numSelected", {
            num: selectedEvents.length
              ? selectedEvents.length
              : selectedEventOrderInfo.count,
          })}
        </div>
        <div
          onClick={clearGridSelections}
          className="flex size-8 cursor-pointer items-center justify-center rounded hover:bg-main-sky-450"
        >
          <Close />
        </div>
      </div>
    </>
  );
}
