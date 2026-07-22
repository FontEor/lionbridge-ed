import type { GridEventProps, FunctionRoom, BookingProps } from "@/types/index";
import { formatLocalDate, isPastDate } from "@/utils/dateHelpers";
import { EVENT_ACTION_TYPE, FUNCTION_ROOM_STATUS } from "@/utils/constants";
import { BookingStatus, isEventBlocked } from "@/utils/eventsGridUtils";
import { omit, toNumber } from "lodash-es";
import dayjs from "dayjs";
import BigNumber from "bignumber.js";

export const transformOriginDataToEditViewData = (event: GridEventProps) => {
  const defaultValues = omit(event, ["eventOrders"]);
  if (defaultValues.startDateTime) {
    defaultValues.startDateTime = formatLocalDate(
      defaultValues.startDateTime,
      "HH:mm",
    );
  }
  if (defaultValues.endDateTime) {
    defaultValues.endDateTime = formatLocalDate(
      defaultValues.endDateTime,
      "HH:mm",
    );
  }
  defaultValues.requestRoomBlock = isEventBlocked(
    defaultValues.eventStatusCode,
    defaultValues.requestRoomBlock,
  );
  defaultValues.alternatePostAs = defaultValues.alternatePostAs ?? "";
  return defaultValues;
};

export const processFunctionRooms = (rooms: Array<FunctionRoom>) => {
  return rooms
    .filter((room) => room.roomStatusCode !== FUNCTION_ROOM_STATUS.PC)
    .map((room: FunctionRoom) => ({
      ...room,
      alternateRoomName: room.alternateRoomName || room.roomName,
    }));
};

export const isEventReadonly = (
  event: GridEventProps,
  booking: BookingProps,
) => {
  return booking.status === BookingStatus.Actual || isPastDate(event.eventDate);
};

export const getEventModalType = (
  event: GridEventProps,
  booking: BookingProps,
) => {
  // The lock-related logic will be added later.
  if (isEventReadonly(event, booking)) return EVENT_ACTION_TYPE.VIEW;
  return EVENT_ACTION_TYPE.EDIT;
};

export const getDateRange = (startDate: string, endDate: string) => {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  const templateWithYear = "MMM D, YYYY";
  const templateWithoutYear = "MMM D";
  if (start.year() === end.year()) {
    return `${start.format(templateWithoutYear)} - ${end.format(templateWithYear)}`;
  } else {
    return `${start.format(templateWithYear)} - ${end.format(templateWithYear)}`;
  }
};

export function isDateInRange(
  targetDate: string,
  startDate: string,
  endDate: string,
) {
  const target = dayjs(targetDate);
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  if (!target.isValid() || !start.isValid() || !end.isValid()) {
    return false;
  }
  const [actualStart, actualEnd] = start.isAfter(end)
    ? [end, start]
    : [start, end];
  return target.isBetween(actualStart, actualEnd, null, "[]");
}

export const getValidNumber = (value?: string | number) => {
  const num = toNumber(value);
  return isFinite(num) ? num : 0;
};

export const calculateFBTotal = (
  attendance?: number | string,
  avg?: number | string,
) => {
  const att = getValidNumber(attendance);
  const average = getValidNumber(avg);
  return new BigNumber(att).multipliedBy(average).toFixed(2);
};
