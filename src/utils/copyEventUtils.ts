import { cloneDeep } from "lodash-es";
import { syncEventsCopiedDateTime } from "@/utils/eventsGridUtils";
import type {
  EventProps,
  EventOrderProps,
  EventOrderItemProps,
} from "@/types/booking.types";

export type IdGenerator = () => string;

let counter = 0;
const defaultGenId: IdGenerator = () => `${Date.now()}-${counter++}`;

export const createIdGenerator = (): IdGenerator => {
  let index = 0;
  return () => `${Date.now()}-${index++}`;
};

export function copyEventOrderItem(
  item: EventOrderItemProps,
  date: string,
  genId: IdGenerator = defaultGenId,
): EventOrderItemProps {
  const newItem = cloneDeep(item);
  delete newItem.eventOrderItemSid;
  for (const itemName of newItem.itemNames ?? []) {
    delete itemName.eoiItemNameLangMapSid;
  }
  newItem.id = genId();
  syncEventsCopiedDateTime(date, newItem, ["serveDtTm"]);
  return newItem;
}

export function copyEventOrder(
  order: EventOrderProps,
  date: string,
  genId: IdGenerator = defaultGenId,
): EventOrderProps {
  const newOrder = cloneDeep(order);
  delete newOrder.eventNumber;
  delete newOrder.eventOrderID;
  delete newOrder.eventOrderNumber;
  newOrder.id = genId();
  syncEventsCopiedDateTime(date, newOrder, ["endDateTime", "startDateTime"]);
  newOrder.items = (newOrder.items ?? []).map((item: EventOrderItemProps) =>
    copyEventOrderItem(item, date, genId),
  );
  return newOrder;
}

export function copyEvent(
  event: EventProps,
  date: string,
  genId: IdGenerator = defaultGenId,
): EventProps {
  const newEvent = cloneDeep(event);
  delete newEvent.eventNumber;
  newEvent.id = genId();
  newEvent.eventDate = date;
  syncEventsCopiedDateTime(date, newEvent, [
    "dismantleDateTime",
    "setupDateTime",
    "startDateTime",
    "endDateTime",
  ]);
  newEvent.dirty = true;
  newEvent.eventOrders = (newEvent.eventOrders ?? []).map(
    (order: EventOrderProps) => copyEventOrder(order, date, genId),
  );
  return newEvent;
}
