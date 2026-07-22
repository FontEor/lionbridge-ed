import i18n, { i18nInitial } from "@/i18n";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
/**
 * Format the date as a string in the local time zone (based on toLocaleDateString)
 * @param {Date|number|string|Array} input Input date (supports multiple formats)
 * @param {string} [format='ddd, DD-MMM-YYYY'] Return value when the date is invalid
 * @returns {string} Formatted date string in the local time zone
 */
dayjs.extend(isBetween);

export const defaultLocale = "en";
i18nInitial.then(() => dayjs.locale(i18n.language));

type DateOrTime = string | number | Date;

export const formatLocalDate = (
  input: DateOrTime,
  format: string = "ddd, DD-MMM-YYYY",
) => {
  return dayjs(input).format(format);
};

export const formatDateWithLocale = (
  input: DateOrTime,
  format: string,
  locale = defaultLocale,
) => {
  return dayjs(input).locale(locale).format(format);
};

export const formatToISODate = (input: DateOrTime) => {
  return formatLocalDate(input, "YYYY-MM-DD");
};
export const formatToISODateTime = (input: DateOrTime) => {
  return formatLocalDate(input, "YYYY-MM-DDTHH:mm:ss");
};
export const formatToTime = (input: DateOrTime) => {
  return formatLocalDate(input, "HH:mm");
};

export const addTime = (
  time: Date | string,
  amount: number,
  unit: dayjs.ManipulateType = "day",
) => {
  return dayjs(time).add(amount, unit).toDate();
};

export const addMinutes = (time: Date | string, mins: number) => {
  return dayjs(time).add(mins, "minute").toDate();
};
export const subtractMinutes = (time: Date | string, mins: number) => {
  return dayjs(time).subtract(mins, "minute").toDate();
};

export const toEventTime = (value: string, eventDate: string) => {
  let time;
  if (value) {
    const h = Number(value.split(":")[0]);
    const date = h < 4 ? addTime(eventDate, 1) : eventDate;
    time = formatToISODate(date) + "T" + value + ":00";
  } else {
    time = null;
  }
  return time;
};
export const updateEventTimeDate = (value: string, eventDate: string) => {
  if (!value || !eventDate) return value;
  const time = dayjs(value);
  const date =
    time.hour() < 4 ? dayjs(eventDate).add(1, "day") : dayjs(eventDate);
  return time
    .year(date.year())
    .month(date.month())
    .date(date.date())
    .format("YYYY-MM-DDTHH:mm:ss");
};

export const isPastDate = (date: string) => {
  return dayjs(date).isBefore(dayjs());
};

export const syncCopiedDatetime = (date: string, datetime: string) => {
  return dayjs(date)
    .add(dayjs(datetime).diff(dayjs(datetime).startOf("day")))
    .format("YYYY-MM-DDTHH:mm:ss");
};
