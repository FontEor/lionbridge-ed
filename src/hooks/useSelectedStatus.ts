import { useEventStore } from "@/stores/eventStore";
import { useBookingStore } from "@/stores/bookingStore";
import { useMemo } from "react";
import type { BookingProps } from "@/types/booking.types";
import { isEventReadonly } from "@/utils/eventModalUtils";

export default function useSelectedStatus() {
  const bookingInfo = useBookingStore.useBookingInfo();

  const selectedEvents = useEventStore.useSelectedEvents();
  const selectedEventOrders = useEventStore.useSelectedEventOrders();
  const selectedItems = useEventStore.useSelectedItems();

  const isEventsHasReadOnly = useMemo(() => {
    return selectedEvents.some((event) =>
      isEventReadonly(event, bookingInfo as BookingProps),
    );
  }, [bookingInfo, selectedEvents]);

  const selectedEventOrderInfo = useMemo(() => {
    let count = 0;
    let firstSelectedOrder;
    for (const rowKey in selectedEventOrders) {
      count += selectedEventOrders[rowKey].length;
      if (!firstSelectedOrder && count > 0) {
        firstSelectedOrder = {
          ...selectedEventOrders[rowKey][0],
          eventRowKey: rowKey,
        };
      }
    }
    return {
      count,
      eventOrder: firstSelectedOrder,
    };
  }, [selectedEventOrders]);

  return {
    isEventsHasReadOnly,
    selectedEventOrderInfo,
    selectedItems,
  };
}
