import { object, array, string, ObjectSchema } from "yup";
import { dateTimeSchema } from "@/utils/yupHelper";
import i18n from "../i18n";
import type {
  EventOrderItemProps,
  EventOrderProps,
} from "@/types/booking.types";

const getItemSchema = (langIndex: number, order: EventOrderProps) => {
  const requiredMessage = i18n.t("message.fieldRequired");
  return object({
    itemNames: array()
      .of(
        object({
          displayDescription: string(),
        }),
      )
      .test("lang-required", requiredMessage, function (arr) {
        if (!arr || !arr.length) return false;
        return arr[langIndex].displayDescription
          ? true
          : this.createError({
              message: requiredMessage,
              path: `${this.path}.${langIndex}.displayDescription`,
            });
      }),
    serveDtTm: dateTimeSchema()
      .isBetween(
        order.startDateTime,
        order.endDateTime,
        i18n.t("message.validation.timeIsBetween"),
      )
      .required(requiredMessage),
  }) as ObjectSchema<EventOrderItemProps>;
};

export default getItemSchema;
