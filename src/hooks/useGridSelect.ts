/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEventStore } from "@/stores/eventStore";
import { useBookingStore } from "@/stores/bookingStore";
import { useCallback, useMemo } from "react";
import type { BookingProps } from "@/types/booking.types";
import { isEventReadonly } from "@/utils/eventModalUtils";
import { useGetOrderGrid } from "./useCommon";
import { useGlobalStore } from "@/stores/store";

export const useIsEventsHasReadOnly = () => {
  const bookingInfo = useBookingStore.useBookingInfo();

  const selectedEvents = useEventStore.useSelectedEvents();

  const isEventsHasReadOnly = useMemo(() => {
    return selectedEvents.some((event) =>
      isEventReadonly(event, bookingInfo as BookingProps),
    );
  }, [bookingInfo, selectedEvents]);

  return isEventsHasReadOnly;
};

export const useSelectedOrderInfo = () => {
  const selectedEventOrders = useEventStore.useSelectedEventOrders();
  const orderInfo = useMemo(() => {
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

  return orderInfo;
};

export const useIsMixedSelect = () => {
  const selectedEvents = useEventStore((state) => state.selectedEvents);
  const selectedItems = useEventStore((state) => state.selectedItems);
  const selectedOrders = useSelectedOrderInfo();

  const isMixedSelect = useMemo(() => {
    return (
      [
        selectedEvents.length > 0,
        selectedItems.size > 0,
        selectedOrders.count > 0,
      ].filter(Boolean).length > 1
    );
  }, [selectedEvents.length, selectedItems.size, selectedOrders.count]);

  return isMixedSelect;
};

export function useRedrawSelectedOrders() {
  const selectedEventOrders = useEventStore.useSelectedEventOrders();
  const getOrderGrid = useGetOrderGrid();
  const redrawSelectedOrders = useCallback(() => {
    const eventRowKeys = Object.keys(selectedEventOrders);
    for (const eventRowKey of eventRowKeys) {
      const rows: any[] = [];
      const detailGrid = getOrderGrid(eventRowKey);
      detailGrid?.api?.forEachNode((node) => {
        if (!node.detail) {
          rows.push(node);
        }
      });
      detailGrid?.api?.redrawRows({ rowNodes: rows });
    }
  }, [getOrderGrid, selectedEventOrders]);
  return redrawSelectedOrders;
}

export function useRedrawSelectedItems() {
  const selectedItems = useEventStore.useSelectedItems();
  const gridRef = useGlobalStore.useEventGridRef();
  const redrawSelectedItems = useCallback(() => {
    const api = gridRef?.current?.api;
    if (!api) return;
    api.forEachDetailGridInfo((orderGridInfo) => {
      orderGridInfo.api?.forEachDetailGridInfo((itemGridInfo) => {
        const rows: any[] = [];
        itemGridInfo.api?.forEachNode((node) => {
          if (selectedItems.has(node.id as string)) {
            rows.push(node);
          }
        });
        if (rows.length > 0) {
          itemGridInfo.api?.redrawRows({ rowNodes: rows });
        }
      });
    });
  }, [gridRef, selectedItems]);
  return redrawSelectedItems;
}

export function useClearGridSelections() {
  const clearSelectedOrders = useEventStore.useClearSelectedOrders();
  const clearSelectedItems = useEventStore.useClearSelectedItems();
  const redrawSelectedOrders = useRedrawSelectedOrders();
  const redrawSelectedItems = useRedrawSelectedItems();
  const isCopyOrder = useEventStore.useIsCopyOrder();
  const setIsCopyOrder = useEventStore.useSetIsCopyOrder();
  const isCopyItem = useEventStore.useIsCopyItem();
  const setIsCopyItem = useEventStore.useSetIsCopyItem();
  const gridRef = useGlobalStore.useEventGridRef();
  const clearGridSelections = useCallback(() => {
    if (gridRef) {
      gridRef.current?.api.forEachDetailGridInfo((detailGridInfo) => {
        detailGridInfo.api?.forEachDetailGridInfo((itemDetailInfo) => {
          itemDetailInfo.api?.deselectAll();
        });
        detailGridInfo.api?.deselectAll();
      });
      gridRef.current?.api.deselectAll();
      clearSelectedOrders();
      clearSelectedItems();
      if (isCopyOrder) {
        redrawSelectedOrders();
        setIsCopyOrder(false);
      }
      if (isCopyItem) {
        redrawSelectedItems();
        setIsCopyItem(false);
      }
    }
  }, [
    gridRef,
    clearSelectedOrders,
    clearSelectedItems,
    isCopyOrder,
    isCopyItem,
    redrawSelectedOrders,
    redrawSelectedItems,
    setIsCopyOrder,
    setIsCopyItem,
  ]);
  return clearGridSelections;
}
