import { validateData } from "@/utils/yupHelper";
import getEventSchema from "./getEventSchema";
import getItemSchema from "@/utils/getItemSchema";
import getOrderSchema from "@/utils/getOrderSchema";

import type {
  GridEventProps,
  EventOrderProps,
  CreateEditEventOrderParams,
  EventOrderItemProps,
} from "@/types/booking.types";
import type { AnyObject } from "yup";

export const validateItem = async (
  item: EventOrderItemProps,
  order: EventOrderProps,
) => {
  const _item = { ...item, errors: null };
  const itemSchema = getItemSchema(0, order);
  await validateData(_item, itemSchema).catch((error) => {
    _item.errors = error;
  });
  return _item;
};

export const validateOrder = async (order: EventOrderProps) => {
  const orderSchema = getOrderSchema();
  const _order = { ...order, errors: null };
  if (_order.items?.length) {
    _order.items = await Promise.all(
      _order.items.map(async (item) => validateItem(item, _order)),
    );
  }
  await validateData(
    _order as unknown as CreateEditEventOrderParams,
    orderSchema,
  ).catch((error) => {
    _order.errors = error;
  });
  _order.childrenHasError = _order.items?.some((item) => item.errors);
  return _order;
};

export const validateOrders = async (orders: EventOrderProps[] = []) => {
  const newOrders = await Promise.all(
    orders.map((order) => validateOrder(order)),
  );
  return newOrders;
};

export const validateEvent = async (event: GridEventProps) => {
  const { eventErrorSchema, eventWarningSchema } = getEventSchema();
  const _event = { ...event, errors: null, warnings: null };
  _event.eventOrders = await validateOrders(_event.eventOrders);
  await validateData(_event as AnyObject, eventErrorSchema).catch((error) => {
    _event.errors = error;
  });
  await validateData(_event as AnyObject, eventWarningSchema).catch(
    (warnings) => {
      _event.warnings = warnings;
    },
  );
  _event.childrenHasError = _event.eventOrders.some(
    (order) => order.errors || order.childrenHasError,
  );
  return _event;
};

export const validateEvents = async (events: GridEventProps[] = []) => {
  const newEvents = await Promise.all(
    events.map((event) => validateEvent(event)),
  );
  return newEvents;
};
