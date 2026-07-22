import type { EventOrderProps } from "@/types/booking.types";
import { formatToTime } from "@/utils/dateHelpers";
import {
  EVENT_ORDER_TYPE_DEPARTMENT_NOTES,
  EVENT_ORDER_TYPE_RESUME,
} from "@/utils/constants";

export const transformOriginDataToEditViewData = (
  eventOrder: EventOrderProps,
) => {
  const defaultValues = { ...eventOrder };
  if (defaultValues.startDateTime) {
    defaultValues.startDateTime = formatToTime(defaultValues.startDateTime);
  }
  if (defaultValues.endDateTime) {
    defaultValues.endDateTime = formatToTime(defaultValues.endDateTime);
  }
  defaultValues.alternatePostAs = defaultValues.alternatePostAs ?? "";
  return defaultValues;
};

export const isDepNotesEventOrder = (value: number | string) => {
  return Number(value) === EVENT_ORDER_TYPE_DEPARTMENT_NOTES;
};

export const isResumeEventOrder = (value: number | string) => {
  return Number(value) === EVENT_ORDER_TYPE_RESUME;
};

export const isSpecialOrderType = (value: number | string): boolean => {
  return isDepNotesEventOrder(value) || isResumeEventOrder(value);
};
