import { useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { ValueGetterParams } from "ag-grid-community";
import clsx from "clsx";
import { FormProvider } from "react-hook-form";
import { debounce } from "lodash-es";

import Drawer from "@/components/Drawer";
import FormItem from "@/components/Form/FormItem";
import { Input } from "@/components/Input";
import Checkbox from "@/components/Checkbox";
import Toggle from "@/components/Toggle";
import { Question } from "@/components/Icons";
import InputDateTime from "@/components/InputDateTime";
import Select from "@/components/Select";
import { NumberInput } from "@/components/NumberInput";
import Status, { type StatusTypes } from "@/components/Status";
import DateInput from "@/components/DateInput";
import Tooltip from "@/components/Tooltip";
import type { OptionProps } from "@/components/Select/type";

import EventRevenue from "./EventRevenue";
import { EVENT_ACTION_TYPE, FUNCTION_ROOM_STATUS } from "@/utils/constants";
import {
  getDateRange,
  isDateInRange,
  processFunctionRooms,
} from "@/utils/eventModalUtils";
import {
  EVENT_TYPE_DEPARTMENT_NOTES,
  REQUIRED_WHEN_BLOCKED,
} from "@/utils/constants";
import {
  getEventStatusTypeAndValue,
  isDepartmentNotesEvent,
} from "@/utils/eventsGridUtils";

import {
  useEventSetupQuery,
  useEventTypeQuery,
  useFunctionRooms,
  useEventStatus,
} from "@/hooks/useLookups";
import useEventDrawerAction, {
  type useEventModalProps,
} from "@/hooks/events/useEventModal";
import useCommonModal from "@/hooks/events/useCommonModal";
import type { FunctionRoom } from "@/types/booking.types";
import { useEventStore } from "@/stores/eventStore";
import { useBookingStore } from "@/stores/bookingStore";

export default function EventDrawer({
  open,
  onClose,
  type,
  defaultValues,
  gridRef,
}: useEventModalProps) {
  const { t } = useTranslation();
  const { confirmText, cancelText, onCloseDirectly, onCloseWhenNoChanges } =
    useCommonModal({
      type,
      onClose,
    });
  const bookingInfo = useBookingStore.useBookingInfo();
  const { warnings, methods, onSubmit, onSubmitError, handleTypeChange } =
    useEventDrawerAction({
      open,
      onClose: onCloseDirectly,
      type,
      defaultValues,
      gridRef,
    });
  const isEventDrawerDirty = useEventStore.useIsEventDrawerDirty();
  const { handleSubmit, watch, trigger } = methods;

  const [
    eventCode,
    eventNumber,
    requestRoomBlock,
    eventStatusCode,
    optionCode,
    functionRoomCode,
    eventDate,
  ] = watch([
    "eventCode",
    "eventNumber",
    "requestRoomBlock",
    "eventStatusCode",
    "optionCode",
    "functionRoomCode",
    "eventDate",
  ]);
  const isDepartmentNotes = useMemo(
    () => isDepartmentNotesEvent(eventCode),
    [eventCode],
  );
  const title = useMemo(() => {
    return type === EVENT_ACTION_TYPE.CREATE
      ? t("label.addEvent")
      : `${type === EVENT_ACTION_TYPE.EDIT ? t("heading.editEvent") : t("heading.viewEvent")}${eventNumber ? ": #" + eventNumber : ""}`;
  }, [eventNumber, t, type]);
  const heldFromQuestionRef = useRef<HTMLSpanElement>(null);
  const heldOverQuestionRef = useRef<HTMLSpanElement>(null);
  const {
    data: { eventTypeList } = {
      eventTypeList: [],
    },
  } = useEventTypeQuery();

  const {
    data: { statusMap } = {
      statusMap: undefined,
    },
  } = useEventStatus();

  const { data: { setupCodeList } = { setupCodeList: [] } } =
    useEventSetupQuery();
  const {
    data: { functionRoomList: originFunctionRoomList, functionRoomMap } = {
      functionRoomList: [],
      functionRoomMap: {},
    },
  } = useFunctionRooms(bookingInfo?.propertyCode);
  const statusInfo = useMemo(() => {
    return getEventStatusTypeAndValue({
      context: { bookInfo: bookingInfo, eventStatus: statusMap || {} },
      data: { eventStatusCode, optionCode },
    } as ValueGetterParams);
  }, [bookingInfo, statusMap, optionCode, eventStatusCode]);
  const functionRoomList = useMemo(() => {
    return processFunctionRooms(originFunctionRoomList);
  }, [originFunctionRoomList]);

  const displayAlternative = watch("displayAlternative");
  const functionRoomDisplayed = useCallback(() => {
    const room = functionRoomMap[functionRoomCode];
    return (
      (displayAlternative
        ? room?.alternateRoomName || room?.roomName
        : room?.roomName) ?? functionRoomCode
    );
  }, [functionRoomMap, functionRoomCode, displayAlternative]);
  const functionRoomSelectFiledNames = useMemo(() => {
    return displayAlternative
      ? { label: "alternateRoomName", value: "roomCode" }
      : { label: "roomName", value: "roomCode" };
  }, [displayAlternative]);

  const renderFunctionRoomItem = useCallback(
    (room: FunctionRoom, selected: boolean) => {
      const {
        roomStatusCode,
        maintainanceStartDate,
        maintainanceEndDate,
        alternateRoomName,
        roomName,
      } = room;

      const isEventDateInRange = isDateInRange(
        eventDate,
        maintainanceStartDate!,
        maintainanceEndDate!,
      );

      const displayRoomName = displayAlternative ? alternateRoomName : roomName;
      const className = clsx(
        "ems-menu-item",
        selected && "bg-main-sky-300 ems-item-checked",
      );
      return roomStatusCode === FUNCTION_ROOM_STATUS.TC &&
        isEventDateInRange ? (
        <div className={clsx(className, "text-grayscale-700 italic")}>
          {displayRoomName} (
          {t("label.tempClosed", {
            closurePeriod: getDateRange(
              maintainanceStartDate!,
              maintainanceEndDate!,
            ),
          })}
          )
        </div>
      ) : (
        <div className={className}>{displayRoomName}</div>
      );
    },
    [displayAlternative, eventDate, t],
  );

  return (
    <>
      <Drawer
        title={title}
        open={open}
        onClose={onCloseWhenNoChanges}
        confirmText={confirmText}
        cancelText={cancelText}
        onConfirm={debounce(handleSubmit(onSubmit, onSubmitError), 200)}
        size="large"
        showCloseIcon
        confirmDisabled={!isEventDrawerDirty && type === EVENT_ACTION_TYPE.EDIT}
      >
        <FormProvider {...methods}>
          <form>
            {/* Event Information */}
            <div className="flex flex-col gap-4">
              <div className="flex justify-between">
                <span className="form-section-title">
                  {t("heading.eventInformation")}
                </span>
                <span className="text-sm leading-4 font-semibold text-black">
                  *{t("label.required")}
                </span>
              </div>
              <div className="flex gap-6 pt-2">
                <FormItem
                  label={t("label.type")}
                  name="eventCode"
                  className="w-1/2"
                  required={requestRoomBlock}
                  onChange={handleTypeChange}
                >
                  <Select
                    placeholder={t("label.selectEventType")}
                    className="w-full"
                    multiple={false}
                    search={true}
                    options={eventTypeList}
                    size="small"
                    filedNames={{ label: "eventType", value: "eventTypeCode" }}
                    searchPlaceholder={`${t("button.search")}...`}
                  />
                </FormItem>
                <div className="w-1/2"></div>
              </div>
              <div className="flex gap-6">
                <FormItem
                  label={t("label.eventDisplayName")}
                  required
                  name="postAsName"
                  className="w-1/2"
                >
                  <Input
                    size="small"
                    placeholder={t("label.enterDisplayName")}
                  />
                </FormItem>
                <FormItem
                  label={t("label.alternateLangName")}
                  name="alternatePostAs"
                  className="w-1/2"
                >
                  <Input
                    size="small"
                    placeholder={t("label.enterAlternateLangName")}
                  />
                </FormItem>
              </div>
              {!isDepartmentNotes && (
                <div>
                  <FormItem
                    required
                    name="readerBoardIndicator"
                    className="w-1/2"
                  >
                    <Checkbox label={t("label.displayToSignage")} />
                  </FormItem>
                </div>
              )}
            </div>
            <hr className="form-section-hr" />
            {/* Event Details */}
            <div className="flex flex-col gap-4">
              <p className="form-section-title">{t("heading.eventDetails")}</p>
              <div className="flex gap-6 pt-2">
                <FormItem
                  label={t("label.date")}
                  required
                  name="eventDate"
                  className="w-1/2"
                  onChange={() => trigger("functionRoomCode")}
                  warning={warnings?.["eventDate"]}
                >
                  <DateInput formatStr="DD-MMM-YYYY (dd)" />
                </FormItem>
                <div className="flex w-1/2 gap-6">
                  {!isDepartmentNotes && (
                    <>
                      <FormItem
                        label={t("label.blockOption")}
                        name="requestRoomBlock"
                        onChange={() => trigger(REQUIRED_WHEN_BLOCKED)}
                      >
                        <Checkbox
                          className="h-9"
                          label={t("label.block")}
                          disabled={
                            eventCode === EVENT_TYPE_DEPARTMENT_NOTES ||
                            type === EVENT_ACTION_TYPE.VIEW
                          }
                        />
                      </FormItem>
                      {type !== EVENT_ACTION_TYPE.CREATE && eventNumber && (
                        <FormItem
                          label={t("label.status")}
                          name="eventStatusCode"
                        >
                          <div className="flex h-9 flex-col justify-center">
                            <Status type={statusInfo.type as StatusTypes}>
                              {statusInfo.value}
                            </Status>
                          </div>
                        </FormItem>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-6">
                <FormItem
                  label={t("label.startTime")}
                  required={requestRoomBlock}
                  name="startDateTime"
                  className="w-1/2"
                  onBlur={() => trigger(["endDateTime", "setupMins"])}
                >
                  <InputDateTime className="w-full" size="small" type="time" />
                </FormItem>
                <FormItem
                  label={t("label.endTime")}
                  required={requestRoomBlock}
                  name="endDateTime"
                  className="w-1/2"
                  onBlur={() => trigger(["startDateTime", "dismantleMins"])}
                >
                  <InputDateTime className="w-full" size="small" type="time" />
                </FormItem>
              </div>
              {!isDepartmentNotes && (
                <>
                  <div className="flex gap-6">
                    <FormItem
                      label={t("label.setup")}
                      required={requestRoomBlock}
                      name="setupCode"
                      className="w-1/2"
                      onBlur={() => trigger(["attendance"])}
                    >
                      <Select
                        placeholder={t("label.selectSetup")}
                        className="w-full"
                        multiple={false}
                        search={true}
                        options={setupCodeList}
                        size="small"
                        filedNames={{
                          label: "setupType",
                          value: "setupTypeCode",
                        }}
                        searchPlaceholder={`${t("button.search")}...`}
                      />
                    </FormItem>
                    <FormItem
                      label={t("label.attendance")}
                      required
                      name="attendance"
                      className="w-1/2"
                      warning={warnings?.["attendance"]}
                    >
                      <NumberInput
                        size="small"
                        placeholder={t("label.enterAttendance")}
                        maxLength={10}
                      />
                    </FormItem>
                  </div>
                  <div className="flex gap-6">
                    <FormItem
                      label={t("label.setupMinutes")}
                      name="setupMins"
                      className="w-1/2"
                    >
                      <NumberInput
                        size="small"
                        placeholder="0"
                        maxLength={10}
                      />
                    </FormItem>
                    <FormItem
                      label={t("label.dismantleMinutes")}
                      name="dismantleMins"
                      className="w-1/2"
                    >
                      <NumberInput
                        size="small"
                        placeholder="0"
                        maxLength={10}
                      />
                    </FormItem>
                  </div>
                  <div className="flex gap-11">
                    <Tooltip
                      position="startBottom"
                      className={clsx(
                        "max-w-56 translate-x-6 px-2 py-1 after:hidden!",
                      )}
                      triggerElement={heldFromQuestionRef}
                      content={t("message.heldFromDesc")}
                    >
                      <div className="flex gap-1">
                        <FormItem required name="holdFromIndicator">
                          <Checkbox label={t("label.heldFrom")} />
                        </FormItem>
                        <span
                          ref={heldFromQuestionRef}
                          className="cursor-pointer"
                        >
                          <Question
                            className={clsx({
                              "text-grayscale-600":
                                type === EVENT_ACTION_TYPE.VIEW,
                            })}
                          />
                        </span>
                      </div>
                    </Tooltip>
                    <Tooltip
                      position="startBottom"
                      className={clsx(
                        "max-w-[276px] translate-x-6 px-2 py-1 after:hidden!",
                      )}
                      triggerElement={heldOverQuestionRef}
                      content={t("message.heldOverDesc")}
                    >
                      <div className="flex gap-1">
                        <FormItem required name="holdOverIndicator">
                          <Checkbox label={t("label.heldOver")} />
                        </FormItem>
                        <span
                          ref={heldOverQuestionRef}
                          className="cursor-pointer"
                        >
                          <Question
                            className={clsx({
                              "text-grayscale-600":
                                type === EVENT_ACTION_TYPE.VIEW,
                            })}
                          />
                        </span>
                      </div>
                    </Tooltip>
                  </div>
                </>
              )}
            </div>
            {!isDepartmentNotes && (
              <>
                <hr className="form-section-hr" />
                {/* Function Room */}
                <div className="flex flex-col gap-4">
                  <p className="form-section-title">
                    {t("label.functionRoom")}
                  </p>
                  {type !== EVENT_ACTION_TYPE.VIEW && (
                    <div className="flex items-center gap-2 pt-2">
                      <FormItem name="displayAlternative">
                        <Toggle size="small" />
                      </FormItem>
                      <span>{t("label.displayAlternateLangRoomName")}</span>
                    </div>
                  )}
                  <div className="flex gap-6">
                    <FormItem
                      label={t("label.functionRoom")}
                      className="w-1/2"
                      required={requestRoomBlock}
                      name="functionRoomCode"
                      onBlur={() => trigger(["attendance"])}
                    >
                      <Select
                        dropdownClassName="max-w-(--trigger-width)"
                        placeholder={t("label.selectFunctionRoom")}
                        className="w-full"
                        multiple={false}
                        search={true}
                        options={functionRoomList}
                        size="small"
                        filedNames={functionRoomSelectFiledNames}
                        renderItem={
                          renderFunctionRoomItem as unknown as OptionProps["renderItem"]
                        }
                        customDisplayValue={functionRoomDisplayed}
                        searchPlaceholder={`${t("button.search")}...`}
                      />
                    </FormItem>
                    <div className="w-1/2"></div>
                  </div>
                </div>
                <hr className="form-section-hr" />
                {/* Revenue */}
                <div className="flex flex-col gap-4">
                  <p className="form-section-title">{t("heading.revenue")}</p>
                  <EventRevenue />
                </div>
              </>
            )}
          </form>
        </FormProvider>
      </Drawer>
    </>
  );
}
