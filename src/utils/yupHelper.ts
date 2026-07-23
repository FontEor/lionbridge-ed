/* eslint-disable @typescript-eslint/no-explicit-any */
import { toEventTime } from "@/utils/dateHelpers";
import {
  string,
  number,
  addMethod,
  type AnyObject,
  ObjectSchema,
  ValidationError,
} from "yup";
import {
  addMinutes,
  addTime,
  formatToISODate,
  subtractMinutes,
} from "./dateHelpers";
import dayjs from "dayjs";
import { t } from "i18next";

const DAY_START_DISPLAY = "4:00 AM";
const DAY_START_TIME = "04:00:00";
declare module "yup" {
  interface StringSchema {
    datetimeNoTz(message?: string): this;
    isoDate(message?: string): this;
    startBeforeEnd(
      otherField: string,
      isStart?: boolean,
      message?: string,
    ): this;
    isBetween(start: string, end: string, message: string): this;
  }
  interface NumberSchema {
    dateTimeBoundary(params: {
      timeField: string;
      isStart?: boolean;
      message?: string;
    }): this;
  }
}

addMethod(
  string,
  "datetimeNoTz",
  function (message = "Valid time format is required.") {
    return this.matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/, message);
  },
);
addMethod(
  string,
  "isoDate",
  function (message = "Valid date format is required.") {
    return this.matches(/^\d{4}-\d{2}-\d{2}$/, message);
  },
);
addMethod(
  string,
  "startBeforeEnd",
  function (
    otherField: string,
    isStart = true,
    message = t("message.validation.startEndTimeConflict"),
  ) {
    return this.test("startBeforeEnd", message, function (value) {
      const otherTime = this.parent[otherField];
      if (!value || !otherTime) {
        return true;
      }
      return isStart
        ? dayjs(value).isBefore(otherTime)
        : dayjs(otherTime).isBefore(value);
    });
  },
);
addMethod(string, "isBetween", function (start: string, end: string, message) {
  return this.test("isBetween", message, function (value) {
    return dayjs(value).isBetween(start, end, null, "[]");
  });
});
addMethod(
  number,
  "dateTimeBoundary",
  function ({
    timeField,
    isStart = true,
    message = `Time must be between ${DAY_START_DISPLAY} and ${DAY_START_DISPLAY} of the next day`,
  }) {
    return this.test("dateTimeBoundary", message, function (value) {
      const date = this.parent.eventDate
        ? this.parent.eventDate
        : formatToISODate(new Date());
      const time = this.parent[timeField];
      if (!time || !date || !value) {
        return true;
      }
      if (isStart) {
        const minTime = `${date}T${DAY_START_TIME}`;
        return !dayjs(subtractMinutes(time, value)).isBefore(minTime);
      }
      const maxTime = formatToISODate(addTime(date, 1)) + `T${DAY_START_TIME}`;
      return dayjs(addMinutes(time, value)).isBefore(maxTime);
    });
  },
);

export function validateData<T extends AnyObject>(
  data: T,
  schema: ObjectSchema<T, any, any>,
) {
  return schema
    .validate(data, { abortEarly: false })
    .catch((error: ValidationError) => {
      const errors = error.inner.reduce(
        (err, current) => {
          if (current.path) {
            err[current.path as keyof T] = current.message;
          }
          return err;
        },
        {} as Record<keyof T, string>,
      );
      return Promise.reject(errors);
    });
}

export const transformDateTime = (
  value: string,
  _originValue: string,
  _context: any,
  options: any,
) => {
  if (!value) {
    return null;
  }
  const date = options.originalValue.eventDate || options.context?.eventDate;
  if (value.match(/^\d{2}:\d{2}$/)) {
    return toEventTime(value, date ? date : formatToISODate(new Date()));
  }
  return value;
};

export const intNumber = (defaultValue?: number) =>
  number()
    .nullable()
    .transform((value) => {
      return ["", null, undefined].includes(value) ? defaultValue : value;
    })
    .min(0)
    .integer();

export const dateTimeSchema = () => {
  const base = string().transform(transformDateTime).datetimeNoTz();

  return {
    before(compareTo: string) {
      return base.startBeforeEnd(compareTo, true);
    },
    after(compareTo: string) {
      return base.startBeforeEnd(compareTo, false);
    },
    isBetween: (start: string, end: string, message: string) => {
      return base.isBetween(start, end, message);
    },
  };
};
