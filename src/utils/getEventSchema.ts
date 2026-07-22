import "@/utils/yupHelper";
import { number, NumberSchema, object, string } from "yup";
import i18n from "../i18n";
import { useBookingStore } from "@/stores";
import { queryClient } from "./globalQueryClient";
import type { AnyObject, Schema, StringSchema } from "yup";
import { FUNCTION_ROOM_STATUS } from "@/utils/constants";
import type { TestContext } from "yup";
import dayjs from "dayjs";
import { dateTimeSchema, intNumber } from "@/utils/yupHelper";
import {
  blockedEventStatus,
  isDepartmentNotesEvent,
} from "@/utils/eventsGridUtils";
import { queryKeys } from "@/utils/queryKey";
import type { LookUpDataProps, FunctionRoom } from "@/types/booking.types";

const getEventSchema = () => {
  const bookingInfo = useBookingStore.getState().bookingInfo!;
  const { functionRoomMap } =
    queryClient.getQueryData<LookUpDataProps>(
      queryKeys.hotelConfig.functionRoom(bookingInfo.propertyCode),
    ) ?? ({ functionRoomMap: {} } as LookUpDataProps);
  const requiredMessage = i18n.t("message.fieldRequired");
  const DAY_START_DISPLAY = "4:00 AM";
  const maxPostAsLength = 75;
  const maxAlternatePostAsLength = 45;

  function createTestError(message: string, that: TestContext<AnyObject>) {
    return that.createError({
      message: message,
      path: that.path,
    });
  }

  function testAttendanceMax(
    schema: NumberSchema,
    message: string,
    type: "error" | "warning" = "error",
  ): NumberSchema {
    return schema.test("max", message, function (value) {
      if (value === undefined || value === null) {
        return true;
      }
      const { setupCode, functionRoomCode } = this.parent;
      const functionRoom = functionRoomMap?.[functionRoomCode] as FunctionRoom;
      if (!functionRoom) {
        return true;
      }
      const createError = (num?: number | null) =>
        createTestError(message.replace("{num}", num?.toString() ?? ""), this);

      if (type === "error") {
        const fireCodeMax = functionRoom.fireCodeMax;
        const isValid = fireCodeMax ? value <= fireCodeMax : true;
        return isValid ? true : createError(fireCodeMax);
      }
      if (type === "warning") {
        const setupMaxSeat = functionRoom.setupType?.find(
          (type: any) => type.setupCode === setupCode,
        )?.maxSeat;
        const isValid = setupMaxSeat ? value <= setupMaxSeat : true;
        return isValid ? true : createError(setupMaxSeat);
      }
      return true;
    });
  }

  function requiredDependOnBlock(schema: Schema) {
    return schema.when(["requestRoomBlock", "eventStatusCode"], {
      is: (requestRoomBlock: boolean, eventStatusCode: string) =>
        requestRoomBlock ?? eventStatusCode === blockedEventStatus,
      then: (schema) =>
        schema
          .transform((value) =>
            typeof value === "string" ? value?.trim() : value,
          )
          .required(requiredMessage),
      otherwise: (schema) => schema.nullable(),
    });
  }

  function testFunctionRoom() {
    return string().test("functionRoom", "", function (value) {
      const { eventDate } = this.parent;
      if (!eventDate || !value) {
        return true;
      }
      const functionRoom = functionRoomMap?.[value] as FunctionRoom;
      if (!functionRoom) {
        return createTestError(
          i18n.t("message.validation.roomPermanentlyClosed"),
          this,
        );
      }
      const {
        roomStatusCode,
        maintainanceStartDate: startDate,
        maintainanceEndDate: endDate,
      } = functionRoom;
      if (roomStatusCode === FUNCTION_ROOM_STATUS.PC) {
        return createTestError(
          i18n.t("message.validation.roomPermanentlyClosed"),
          this,
        );
      }
      if (
        roomStatusCode === FUNCTION_ROOM_STATUS.TC &&
        dayjs(eventDate).isBetween(dayjs(startDate), dayjs(endDate), null, "[]")
      ) {
        return createTestError(
          i18n.t("message.validation.roomTemporarilyClosed"),
          this,
        );
      }
      return true;
    });
  }

  function testDateInPast(schema: StringSchema) {
    return schema.test(
      "dateInPast",
      i18n.t("message.validation.eventDateInPast"),
      function (value) {
        if (!value) {
          return true;
        }
        return !dayjs(value).isBefore(dayjs(), "day");
      },
    );
  }

  function testEventDateOutsideRange(day = 5) {
    return string().test(
      "eventDateOutsideRange",
      i18n.t("message.validation.eventDateOutsideBookingRange", { num: day }),
      function (value) {
        if (!value) {
          return true;
        }
        const { arrivalDate, departureDate } = bookingInfo || {};
        if (arrivalDate && dayjs(value).diff(arrivalDate, "day") < -day) {
          return false;
        }
        if (departureDate && dayjs(value).diff(departureDate, "day") > day) {
          return false;
        }
        return true;
      },
    );
  }

  function skipValidationForDepartment(baseSchema: Schema, schema: Schema) {
    return baseSchema.when(["eventCode"], {
      is: (eventCode: string) => isDepartmentNotesEvent(eventCode),
      then: (schema) => schema.nullable(),
      otherwise: () => schema,
    });
  }

  const eventErrorSchema = object({
    postAsName: string()
      .max(
        maxPostAsLength,
        i18n.t("message.validation.maxLengthString", { num: maxPostAsLength }),
      )
      .required(requiredMessage),
    alternatePostAs: string()
      .nullable()
      .max(
        maxAlternatePostAsLength,
        i18n.t("message.validation.maxLengthString", {
          num: maxAlternatePostAsLength,
        }),
      ),
    eventDate: testDateInPast(string().required(requiredMessage).isoDate()),
    startDateTime: requiredDependOnBlock(
      dateTimeSchema().before("endDateTime"),
    ),
    endDateTime: requiredDependOnBlock(dateTimeSchema().after("startDateTime")),
    eventCode: requiredDependOnBlock(string()),
    attendance: skipValidationForDepartment(
      intNumber(),
      testAttendanceMax(
        intNumber().required(requiredMessage),
        i18n.t("message.validation.exceedsRoomOccupancyLimit"),
        "error",
      ),
    ),
    functionRoomCode: skipValidationForDepartment(
      string(),
      requiredDependOnBlock(testFunctionRoom()),
    ),
    setupCode: requiredDependOnBlock(string()),
    setupMins: skipValidationForDepartment(
      intNumber(),
      intNumber(0).dateTimeBoundary({
        timeField: "startDateTime",
        isStart: true,
        message: i18n.t("message.validation.setupTimeTooEarly", {
          time: DAY_START_DISPLAY,
        }),
      }),
    ),
    dismantleMins: skipValidationForDepartment(
      intNumber(),
      intNumber(0).dateTimeBoundary({
        timeField: "endDateTime",
        isStart: false,
        message: i18n.t("message.validation.dismantleTimeTooLate", {
          time: DAY_START_DISPLAY,
        }),
      }),
    ),
  });
  const eventWarningSchema = object({
    attendance: skipValidationForDepartment(
      number(),
      testAttendanceMax(
        number(),
        i18n.t("message.validation.exceedsSetupCapacityLimit"),
        "warning",
      ),
    ),
    eventDate: testEventDateOutsideRange(),
  });

  return { eventErrorSchema, eventWarningSchema };
};
export default getEventSchema;
