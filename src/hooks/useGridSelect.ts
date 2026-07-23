/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEventStore } from "@/stores/eventStore";
import { useCallback, useMemo } from "react";
import { getOrderGrid } from "./useCommon";
import { useGlobalStore } from "@/stores/store";
import {
  getEventRowKey,
  getOrderRowKey,
  isEventReadonly,
} from "@/utils/eventsGridUtils";
import type { GridApi, IRowNode } from "ag-grid-community";

export const useIsEventsHasReadOnly = () => {
  const selectedEvents = useEventStore.useSelectedEvents();

  const isEventsHasReadOnly = useMemo(() => {
    return selectedEvents.some((event) => isEventReadonly(event));
  }, [selectedEvents]);

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
  const eventGrid = useGlobalStore.useEventGridRef();
  const redrawSelectedOrders = useCallback(() => {
    const eventRowKeys = Object.keys(selectedEventOrders);
    const eventRows: any[] = [];
    for (const eventRowKey of eventRowKeys) {
      const orderRows: any[] = [];
      const detailGrid = getOrderGrid(eventRowKey);
      detailGrid?.api?.forEachNode((node) => {
        if (!node.detail) {
          orderRows.push(node);
        }
      });
      eventGrid?.current?.api?.forEachNode((node) => {
        if (
          !node.detail &&
          node.data &&
          (eventRowKeys.includes(getEventRowKey(node.data)) ||
            isEventReadonly(node.data))
        ) {
          eventRows.push(node);
        }
      });
      detailGrid?.api?.redrawRows({ rowNodes: orderRows });
    }
    eventGrid?.current?.api.redrawRows({ rowNodes: eventRows });
  }, [eventGrid, getOrderGrid, selectedEventOrders]);
  return redrawSelectedOrders;
}

export function useRedrawSelectedItems() {
  const selectedItems = useEventStore.useSelectedItems();
  const gridRef = useGlobalStore.useEventGridRef();
  const redrawSelectedItems = useCallback(() => {
    const api = gridRef?.current?.api;
    if (!api || selectedItems.size === 0) return;

    const eventRowKeys = new Set<string>();
    const orderRowKeys = new Set<string>();
    selectedItems.forEach((item) => {
      eventRowKeys.add(item.eventRowKey);
      orderRowKeys.add(item.orderRowKey);
    });

    const redrawMatchingRows = (
      gridApi: GridApi | undefined,
      shouldRedraw: (node: IRowNode) => boolean,
    ) => {
      const rows: IRowNode[] = [];
      gridApi?.forEachNode((node) => {
        if (shouldRedraw(node)) rows.push(node);
      });
      if (rows.length > 0) gridApi?.redrawRows({ rowNodes: rows });
    };

    redrawMatchingRows(api, (node) =>
      !!node.data &&
      !node.detail &&
      eventRowKeys.has(getEventRowKey(node.data)),
    );

    api.forEachDetailGridInfo((orderGridInfo) => {
      redrawMatchingRows(orderGridInfo.api, (node) =>
        !!node.data &&
        !node.detail &&
        orderRowKeys.has(getOrderRowKey(node.data)),
      );
      orderGridInfo.api?.forEachDetailGridInfo((itemGridInfo) => {
        redrawMatchingRows(itemGridInfo.api, (node) =>
          selectedItems.has(node.id as string),
        );
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
