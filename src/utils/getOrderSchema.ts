import { object, number, string, ObjectSchema } from "yup";
import i18n from "../i18n";
import { isDepNotesEventOrder } from "@/utils/eventOrderModalUtils";
import type { CreateEditEventOrderParams } from "@/types/booking.types";
import { dateTimeSchema, intNumber } from "@/utils/yupHelper";

const getOrderSchema = () => {
  const requiredMessage = i18n.t("message.fieldRequired");
  return object({
    eventOrderTypeCode: number().required(requiredMessage),
    postAsName: string().when(
      "eventOrderTypeCode",
      ([eventOrderTypeCode], schema) => {
        if (isDepNotesEventOrder(eventOrderTypeCode)) {
          return schema;
        }
        return schema.required(requiredMessage);
      },
    ),
    startDateTime: dateTimeSchema()
      .before("endDateTime")
      .required(requiredMessage),
    endDateTime: dateTimeSchema()
      .after("startDateTime")
      .required(requiredMessage),
    attendanceEstimate: intNumber().when(
      "eventOrderTypeCode",
      ([eventOrderTypeCode], schema) => {
        if (isDepNotesEventOrder(eventOrderTypeCode)) {
          return schema;
        }
        return schema.required(requiredMessage);
      },
    ),
  }) as ObjectSchema<CreateEditEventOrderParams>;
};

export default getOrderSchema;
