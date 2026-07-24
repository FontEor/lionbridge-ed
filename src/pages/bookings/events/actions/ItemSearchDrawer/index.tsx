/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { AgGridReact } from "ag-grid-react";
import { themeQuartz } from "ag-grid-community";

import Drawer from "@/components/Drawer";
import Tooltip from "@/components/Tooltip.tsx";
import { EVENT_ACTION_TYPE, SimpleThemeOptions } from "@/utils/constants";
import type {
  GetCatalogItemsParams,
  GridEventProps,
  EventOrderItemProps,
} from "@/types/booking.types";

import { useEventStore } from "@/stores/eventStore";
import { useSelectedOrderInfo } from "@/hooks/useGridSelect";
import useCommonModal from "@/hooks/events/useCommonModal";

import ItemList from "./ItemList";
import Search from "./Search";
import SearchResults from "./SearchResults";
import { isArray } from "lodash-es";
import { useChangesNotification } from "@/hooks/useCommon";
import {
  getOrderGrid,
  updateEventOrderData,
  setEventDataDirty,
} from "@/utils/gridNodeUtils";

const _theme = themeQuartz.withParams(SimpleThemeOptions);
export default function ItemSearchDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [queryParams, setQueryParams] = useState<GetCatalogItemsParams>();
  const theme = useMemo(() => {
    return _theme;
  }, []);
  const itemAddedGridRef = useRef<AgGridReact<GridEventProps>>(null);
  const selectedEventOrderInfo = useSelectedOrderInfo();
  const selectedEventOrders = useEventStore.useSelectedEventOrders();
  const isEventDrawerDirty = useEventStore.useIsEventDrawerDirty();
  const setIsDirty = useEventStore.useSetIsDirty();
  const changeNotification = useChangesNotification();

  const selectedOrders = useMemo(() => {
    const orders = [];
    for (const rowKey in selectedEventOrders) {
      if (selectedEventOrders[rowKey]) {
        const rowKeyOrders = selectedEventOrders[rowKey].map((item) => ({
          ...item,
          eventRowKey: rowKey,
        }));
        orders.push(...rowKeyOrders);
      }
    }
    return {
      list: orders,
      title: orders.map((order) => order.eventOrderNumber).join(", "),
    };
  }, [selectedEventOrders]);

  const { confirmText, cancelText, onCloseDirectly, onCloseWhenNoChanges } =
    useCommonModal({
      type: EVENT_ACTION_TYPE.EDIT,
      onClose,
    });

  const addItemInfoFromOrder = useCallback(
    (items: EventOrderItemProps[], order: any) => {
      return items.map((item) => {
        if (item.eventOrderItemSid) return item;
        return {
          ...item,
          serveDtTm: order.startDateTime,
          quantityOrdered: order.attendanceEstimate,
          quantityGuaranteed: order.attendanceGuarantee,
        };
      });
    },
    [],
  );

  const onSubmit = useCallback(() => {
    const orders = selectedOrders.list;
    let newItems: any[] = [];

    itemAddedGridRef.current?.api.forEachNode((node) => {
      newItems.push({ ...node.data });
    });

    if (orders.length === 1) {
      orders[0].items = newItems;
    } else {
      for (const order of orders) {
        newItems = addItemInfoFromOrder(newItems, order);
        if (isArray(order.items)) {
          const newItemsArr = [...order.items, ...newItems];
          order.items = newItemsArr;
        } else {
          order.items = newItems;
        }
      }
    }

    setIsDirty(true);
    onCloseDirectly();
    changeNotification();

    orders.forEach((order) => {
      const evenOrderGridRef = getOrderGrid(order.eventRowKey);
      evenOrderGridRef?.api?.applyTransaction({
        update: [{ ...order }],
      });
      updateEventOrderData(order.eventRowKey, order);
      setEventDataDirty(order.eventRowKey);
    });
  }, [
    selectedOrders.list,
    setIsDirty,
    onCloseDirectly,
    changeNotification,
    addItemInfoFromOrder,
  ]);

  return (
    <>
      <Drawer
        title={
          selectedEventOrderInfo.count > 1
            ? t("button.bulkAddItem")
            : t("button.modifyItemList")
        }
        open={open}
        onClose={onCloseWhenNoChanges}
        showCloseIcon
        bodyClassName="p-0 max-md:pr-0 overflow-y-visible"
        confirmText={confirmText}
        cancelText={cancelText}
        className="w-[1251px]"
        onConfirm={onSubmit}
        confirmDisabled={!isEventDrawerDirty}
      >
        <div className="flex h-full">
          <div className="flex w-[575px] flex-col border-r border-grayscale-400">
            <div className="flex h-15 items-center px-8 font-semibold">
              <span className="shrink-0">
                {selectedOrders.list.length > 1
                  ? t("label.eventOrders")
                  : t("label.eventOrder")}
              </span>
              <Tooltip
                position="bottom"
                containerClassName="flex-1 w-0 flex"
                triggerClassName="max-w-full truncate"
                className="max-w-90 -translate-y-2"
                content={selectedOrders.title}
              >
                : {selectedOrders.title}
              </Tooltip>
            </div>
            <ItemList
              theme={theme}
              gridRef={itemAddedGridRef}
              selectedOrders={selectedOrders}
            />
          </div>
          <div className="flex w-[676px] flex-col">
            <div className="px-6 pt-8 text-lg font-semibold">
              {t("label.itemCatalogSearch")}
            </div>
            <Search onSubmit={setQueryParams} isOpen={open} />
            <SearchResults
              theme={theme}
              itemAddedGridRef={itemAddedGridRef}
              queryParams={queryParams}
            />
          </div>
        </div>
      </Drawer>
    </>
  );
}
