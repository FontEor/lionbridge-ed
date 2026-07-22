import { useTranslation } from "react-i18next";
import { FormProvider } from "react-hook-form";
import { useEffect, useMemo } from "react";
import { debounce } from "lodash-es";

import Drawer from "@/components/Drawer";
import InputDateTime from "@/components/InputDateTime";
import FormItem from "@/components/Form/FormItem";
import Select from "@/components/Select";
import { Input } from "@/components/Input";
import Checkbox from "@/components/Checkbox";
import { NumberInput } from "@/components/NumberInput";
import Button from "@/components/Button";
import EventOrderRevenue from "./EventOrderRevenue";
import AddChangeLog from "./OrderChangeLog";

import {
  useEventOrderStamp,
  useEventOrderTypes,
  useMealPeriods,
  useEventOrderTender,
} from "@/hooks/useLookups";
import useEventOrderModal, {
  type useEventOrderModalProps,
} from "@/hooks/events/useEventOrderModal";
import useCommonModal from "@/hooks/events/useCommonModal";

import {
  EVENT_ACTION_TYPE,
  TENDER_CODE,
  DAY_START_TIME,
  DAY_END_TIME,
} from "@/utils/constants";
import {
  isResumeEventOrder,
  isSpecialOrderType,
} from "@/utils/eventOrderModalUtils";
import { formatToTime, formatLocalDate } from "@/utils/dateHelpers";

import { useBookingStore } from "@/stores/bookingStore";
import { useEventStore } from "@/stores/eventStore";

export default function EventOrderDrawer({
  open,
  onClose,
  type,
  gridRef,
  eventInfo,
  eventOrderNumber,
  ...params
}: useEventOrderModalProps & {
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { confirmText, cancelText, onCloseDirectly, onCloseWhenNoChanges } =
    useCommonModal({
      type,
      onClose,
    });

  const bookingInfo = useBookingStore.useBookingInfo();
  const isEventDrawerDirty = useEventStore.useIsEventDrawerDirty();
  const { methods, onSubmit } = useEventOrderModal({
    open,
    type,
    onClose: onCloseDirectly,
    gridRef,
    eventInfo,
    ...params,
  });

  const {
    reset,
    watch,
    setValue,
    trigger,
    handleSubmit,
    formState: { errors },
  } = methods;

  const [eventOrderTypeCode, eventOrderID] = watch([
    "eventOrderTypeCode",
    "eventOrderID",
  ]);

  const eventNumbers = useMemo(() => {
    const eventNumber = eventInfo?.eventNumber;
    return eventNumber ? `#${eventNumber}` : "";
  }, [eventInfo?.eventNumber]);

  const eventOrderDate = useMemo(() => {
    const date = eventInfo?.eventDate;
    if (!date) return "";
    return formatLocalDate(date, "ddd MMM D, YYYY");
  }, [eventInfo?.eventDate]);

  const eventDisplayName = useMemo(() => {
    return eventInfo?.postAsName;
  }, [eventInfo?.postAsName]);

  const {
    data: { stampList } = {
      stampList: [],
    },
  } = useEventOrderStamp();
  const {
    data: { eventOrderTenderTypeList } = {
      eventOrderTenderTypeList: [],
    },
  } = useEventOrderTender();

  const {
    data: { eventOrderTypeList, eventOrderTypeMap, fbIndicatorMap } = {},
  } = useEventOrderTypes();

  const {
    data: { mealPeriodMap } = {
      mealPeriodMap: {},
    },
  } = useMealPeriods(bookingInfo?.propertyCode);

  useEffect(() => {
    if (eventOrderTypeCode) {
      if (isSpecialOrderType(eventOrderTypeCode)) {
        setValue("startDateTime", DAY_START_TIME);
        setValue("endDateTime", DAY_END_TIME);
      } else {
        setValue(
          "startDateTime",
          eventInfo.startDateTime
            ? formatToTime(eventInfo.startDateTime)
            : undefined,
        );
        setValue(
          "endDateTime",
          eventInfo.endDateTime
            ? formatToTime(eventInfo.endDateTime)
            : undefined,
        );
      }
      trigger("startDateTime");
      trigger("endDateTime");
    }
  }, [eventOrderTypeCode, setValue, eventInfo, trigger]);

  useEffect(() => {
    const fbIndicator = eventOrderTypeCode
      ? fbIndicatorMap?.get(eventOrderTypeCode)
      : undefined;
    if (fbIndicator === true) {
      setValue("tenderTypeCode", TENDER_CODE.BANQUET_CHECK);
    } else if (fbIndicator === false) {
      setValue("tenderTypeCode", TENDER_CODE.NA);
    }
    if (isResumeEventOrder(eventOrderTypeCode)) {
      setValue("attendanceEstimate", 0);
      setValue("attendanceGuarantee", 0);
      setValue("attendanceSet", 0);
    }
  }, [setValue, fbIndicatorMap, eventOrderTypeCode]);

  useEffect(() => {
    if (
      eventOrderTypeMap &&
      eventOrderTypeCode &&
      eventOrderTypeMap?.[eventOrderTypeCode]
    ) {
      setValue("postAsName", eventOrderTypeMap?.[eventOrderTypeCode]);
      trigger("postAsName");
    }
  }, [eventOrderTypeMap, eventOrderTypeCode, setValue, trigger]);

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        reset();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open, reset]);

  const mealPeriod = useMemo(() => {
    if (
      mealPeriodMap &&
      eventOrderTypeCode &&
      mealPeriodMap[eventOrderTypeCode]
    ) {
      return mealPeriodMap[eventOrderTypeCode];
    } else {
      return null;
    }
  }, [mealPeriodMap, eventOrderTypeCode]);

  const additionalFooterButtons = useMemo(() => {
    return (
      <>
        {type === EVENT_ACTION_TYPE.EDIT ? (
          <Button variant="secondary" className="min-w-30" size="small">
            {t("button.collaborativeDiagramming")}
          </Button>
        ) : null}
        {eventOrderID ? (
          <AddChangeLog orderId={eventOrderID as number} />
        ) : null}
      </>
    );
  }, [t, type, eventOrderID]);

  const title = useMemo(() => {
    return type === EVENT_ACTION_TYPE.CREATE
      ? t("label.newEventOrder")
      : `${type === EVENT_ACTION_TYPE.EDIT ? t("heading.editEventOrder") : t("heading.viewEventOrder")}${eventOrderNumber ? ": #" + eventOrderNumber : ""}`;
  }, [eventOrderNumber, t, type]);

  return (
    <>
      <Drawer
        title={title}
        open={open}
        onClose={onCloseWhenNoChanges}
        size="large"
        showCloseIcon
        confirmText={confirmText}
        cancelText={cancelText}
        onConfirm={debounce(handleSubmit(onSubmit), 200)}
        confirmDisabled={
          (!isEventDrawerDirty && type === EVENT_ACTION_TYPE.EDIT) ||
          Object.keys(errors).length !== 0
        }
        additionalPrefixButton={additionalFooterButtons}
      >
        <FormProvider {...methods}>
          <form>
            {/* Event Order Information */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  {!isSpecialOrderType(eventOrderTypeCode) && (
                    <span className="form-section-title">
                      {t("label.eventOrderInformation")}
                    </span>
                  )}
                  <div className="inline-flex gap-8 text-xs tracking-[1px] uppercase">
                    {eventNumbers && (
                      <span>
                        {t("label.eventNumber")}: {eventNumbers}
                      </span>
                    )}
                    <span>
                      {t("label.eventDisplayName")}: {eventDisplayName}
                    </span>
                  </div>
                </div>
                <span className="text-sm leading-4 font-semibold text-black">
                  *{t("label.required")}
                </span>
              </div>
              <div className="flex gap-6 pt-2">
                <FormItem
                  label={t("label.type")}
                  name="eventOrderTypeCode"
                  className="w-1/2"
                  required={true}
                >
                  <Select
                    placeholder=""
                    className="w-full"
                    options={eventOrderTypeList}
                    filedNames={{
                      label: "description",
                      value: "eventOrderTypeLookupSid",
                    }}
                    multiple={false}
                    search={true}
                    size="small"
                    searchPlaceholder={`${t("button.search")}...`}
                  />
                </FormItem>
                {!isSpecialOrderType(eventOrderTypeCode) && (
                  <FormItem
                    label={t("label.mealPeriod")}
                    name="mealPeriod"
                    className="w-1/2"
                  >
                    <div className="flex h-full items-center text-sm leading-4 text-grayscale-700">
                      {mealPeriod || "—"}
                    </div>
                  </FormItem>
                )}
              </div>
              {!isSpecialOrderType(eventOrderTypeCode) && (
                <>
                  <div className="flex gap-6">
                    <FormItem
                      label={t("label.tenderType")}
                      name="tenderTypeCode"
                      className="w-1/2"
                      tooltipClassName="max-w-62"
                      question={t("message.tenderTypeTooltip")}
                    >
                      <Select
                        placeholder=""
                        className="w-full"
                        multiple={false}
                        search={true}
                        size="small"
                        searchPlaceholder={`${t("button.search")}...`}
                        options={eventOrderTenderTypeList}
                        filedNames={{
                          label: "description",
                          value: "tenderTypeLookupSid",
                        }}
                      />
                    </FormItem>
                    <FormItem
                      label={t("label.stampType")}
                      name="stampIds"
                      className="w-1/2"
                      tooltipClassName="max-w-62"
                      question={t("message.stampTypeTooltip")}
                    >
                      <Select
                        placeholder=""
                        className="w-full"
                        multiple={true}
                        search={true}
                        size="small"
                        options={stampList}
                        tooltip={false}
                        filedNames={{
                          label: "description",
                          value: "eventOrderStampLookupSid",
                        }}
                        countable={true}
                        searchPlaceholder={`${t("button.search")}...`}
                      />
                    </FormItem>
                  </div>
                  <div className="flex gap-6">
                    <FormItem
                      label={t("label.eventDisplayName")}
                      required
                      name="postAsName"
                      className="w-1/2"
                    >
                      <Input size="small" className="w-full" />
                    </FormItem>
                    <FormItem
                      label={t("label.alternateLangName")}
                      name="alternatePostAs"
                      className="w-1/2"
                    >
                      <Input size="small" className="w-full" />
                    </FormItem>
                  </div>
                  <div>
                    <FormItem name="readerBoardIndicator" className="w-1/2">
                      <Checkbox label={t("label.displayToSignage")} />
                    </FormItem>
                  </div>
                </>
              )}
            </div>
            <hr className="form-section-hr" />
            {/* Event Order Details */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                {!isSpecialOrderType(eventOrderTypeCode) && (
                  <span className="form-section-title">
                    {t("label.eventOrderDetails")}
                  </span>
                )}
                <span className="text-xs tracking-[1px] uppercase">
                  {t("label.eventOrderDate")}: {eventOrderDate}
                </span>
              </div>
              <div className="flex gap-6 pt-2">
                <FormItem
                  required
                  label={t("label.startTime")}
                  name="startDateTime"
                  className="w-1/2"
                  onBlur={() => trigger("endDateTime")}
                >
                  <InputDateTime className="w-full" size="small" type="time" />
                </FormItem>
                <FormItem
                  required
                  label={t("label.endTime")}
                  name="endDateTime"
                  className="w-1/2"
                  onBlur={() => trigger("startDateTime")}
                >
                  <InputDateTime className="w-full" size="small" type="time" />
                </FormItem>
              </div>
              {!isSpecialOrderType(eventOrderTypeCode) && (
                <div className="flex gap-6">
                  <FormItem
                    required
                    label={t("label.attendance")}
                    name="attendanceEstimate"
                    className="w-1/3"
                  >
                    <NumberInput
                      className="w-full"
                      size="small"
                      maxLength={10}
                    />
                  </FormItem>
                  <FormItem
                    label={t("button.guaranteed")}
                    tooltipClassName="max-w-62"
                    question={t("message.guaranteeTooltip")}
                    name="attendanceGuarantee"
                    className="w-1/3"
                  >
                    <NumberInput
                      className="w-full"
                      size="small"
                      maxLength={10}
                      placeholder="0"
                    />
                  </FormItem>
                  <FormItem
                    label={t("label.set")}
                    tooltipClassName="max-w-62"
                    question={t("message.setTooltip")}
                    name="attendanceSet"
                    className="w-1/3"
                  >
                    <NumberInput
                      className="w-full"
                      size="small"
                      maxLength={10}
                      placeholder="0"
                    />
                  </FormItem>
                </div>
              )}
            </div>
            {!isSpecialOrderType(eventOrderTypeCode) && (
              <hr className="form-section-hr" />
            )}
            {/* Event Order Details */}
            {!isSpecialOrderType(eventOrderTypeCode) && (
              <div className="flex flex-col gap-4">
                <p className="form-section-title">{t("heading.revenue")}</p>
                <div>
                  <FormItem
                    name="finalDetailedIndicator"
                    className="w-1/2"
                    label={t("label.detailOption")}
                  >
                    <Checkbox label={t("label.detailed")} />
                  </FormItem>
                </div>
                <EventOrderRevenue />
              </div>
            )}
          </form>
        </FormProvider>
      </Drawer>
    </>
  );
}
