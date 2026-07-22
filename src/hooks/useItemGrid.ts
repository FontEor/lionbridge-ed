import { useMemo, useCallback } from "react";
import {
  type IDetailCellRendererParams,
  type RowSelectedEvent,
  type GridReadyEvent,
  type ICellRendererParams,
  type GridOptions,
  type RowClassRules,
} from "ag-grid-community";
import { useTranslation } from "react-i18next";
import {
  type EventOrderProps,
  type EventOrderItemProps,
} from "@/types/booking.types";
import {
  CustomTooltip,
  MeatballRenderer,
} from "@/pages/bookings/events/components";
import {
  ItemSelectionColumnDef,
  rowSelection,
  getItemRowId,
  getItemRowKey,
  eventTimeFormatter,
  moneyFormatter,
  createValueFormatters,
  createArrayValueFormatter,
  comparatorTime,
  getOrderRowKey,
  getErrorCellClass,
  tooltipValueGetter,
} from "@/utils/eventsGridUtils";
import { formatItemName, formatItemDesc } from "@/utils/itemModalUtils";
import { NodeLevelMap } from "@/utils/constants";
import { useEventOrderData } from "./useEvents";
import { useEventStore } from "@/stores/eventStore";
import useGridUpdate from "./useGridUpdate";

export default function useItemGrid() {
  const { t } = useTranslation();
  const setSelectedItems = useEventStore.useSetSelectedItems();
  const { resetGridRowHeight } = useGridUpdate();

  const { itemTopics, unitOfMeasureTypes, catalogSectionTypes } =
    useEventOrderData();
  const { uomFormatter, sectionFormatter } = useMemo(
    () =>
      createValueFormatters({
        uom: unitOfMeasureTypes?.unitOfMeasureMap,
        section: catalogSectionTypes?.catalogSectionsMap,
      }),
    [
      unitOfMeasureTypes?.unitOfMeasureMap,
      catalogSectionTypes?.catalogSectionsMap,
    ],
  );

  const onGridReady = useCallback((params: GridReadyEvent) => {
    const { api } = params;
    const selectedItems = useEventStore.getState().selectedItems;
    if (selectedItems.size) {
      api?.forEachNode((node) => {
        if (selectedItems.has(node?.id as string)) {
          node?.setSelected(true);
        }
      });
    }
  }, []);

  const rowClassRules = useMemo<RowClassRules>(() => {
    return {
      "border-main-sky-500! border-2! border-dashed shadow-[0px_-2px_0px] shadow-main-sky-100":
        (params) => {
          if (!useEventStore.getState().isCopyItem) return false;
          return useEventStore
            .getState()
            .selectedItems.has(getItemRowKey(params.data));
        },
      "select-disable": (params) => {
        if (!useEventStore.getState().isCopyItem) return false;
        return !useEventStore
          .getState()
          .selectedItems.has(getItemRowKey(params.data));
      },
    };
  }, []);

  const itemDetailCellRendererParams = useMemo(() => {
    return (params: ICellRendererParams) => {
      return {
        detailGridOptions: {
          context: {
            orderRowKey: getOrderRowKey(params.data),
            ...params.context,
          },
          getRowId: getItemRowId,
          columnDefs: [
            {
              headerName: t("label.displayName"),
              width: 150,
              valueGetter: formatItemName,
            },
            {
              headerName: t("label.description"),
              width: 353,
              valueGetter: formatItemDesc,
            },
            {
              field: "serveDtTm",
              headerName: t("label.serveTime"),
              width: 108,
              valueFormatter: eventTimeFormatter,
              comparator: comparatorTime,
            },
            {
              field: "quantityOrdered",
              headerName: t("label.expectedQuantity"),
              width: 94,
              cellStyle: {
                textAlign: "right",
              },
            },
            {
              field: "quantityGuaranteed",
              headerName: t("label.guaranteedQuantity"),
              width: 98,
              cellStyle: {
                textAlign: "right",
              },
            },
            {
              field: "itemPrice",
              headerName: t("label.price"),
              width: 97,
              cellStyle: {
                textAlign: "right",
              },
              valueFormatter: moneyFormatter,
            },
            {
              field: "sectionLookupSid",
              headerName: t("label.section"),
              width: 97,
              valueFormatter: sectionFormatter,
            },
            {
              field: "pricePointLookupSid",
              headerName: t("label.unitOfMeasure"),
              width: 168,
              valueFormatter: uomFormatter,
            },
            {
              field: "display",
              headerName: t("label.displayItem"),
              width: 144,
            },
            {
              field: "displayQuantity",
              headerName: t("label.displayQuantity"),
              width: 179,
            },
            {
              field: "topicSids",
              headerName: t("label.topics"),
              valueFormatter: createArrayValueFormatter(itemTopics?.topicsMap),
            },
            {
              suppressNavigable: true,
              sortable: false,
              filter: false,
              cellClass: "empty-fill-column",
              headerClass: "empty-fill-column",
              flex: 1,
            },
            {
              field: "",
              width: 1,
              minWidth: 1,
              maxWidth: 1,
              cellRenderer: MeatballRenderer,
              sortable: false,
              filter: false,
              pinned: "right",
            },
          ],
          selectionColumnDef: ItemSelectionColumnDef,
          rowSelection: {
            ...rowSelection,
            isRowSelectable: (node) => {
              if (!useEventStore.getState().isCopyItem) return true;
              return useEventStore
                .getState()
                .selectedItems.has(node.id as string);
            },
          },
          rowClassRules,
          suppressHorizontalScroll: true,
          defaultColDef: {
            headerTooltipValueGetter: (props) =>
              props.valueFormatted || props.value,
            tooltipComponent: CustomTooltip,
            tooltipValueGetter: tooltipValueGetter,
            resizable: false,
            cellClassRules: getErrorCellClass(),
          },
          onGridReady: onGridReady,
          onRowSelected: (event: RowSelectedEvent<EventOrderItemProps>) => {
            const { node, data, context } = event;
            setSelectedItems(
              node.id as string,
              {
                rowKey: node.id as string,
                data: data as EventOrderItemProps,
                ...context,
                level: NodeLevelMap.Item,
              },
              node.isSelected() as boolean,
            );
          },
          onRowDataUpdated: resetGridRowHeight,
        } as GridOptions,
        getDetailRowData: (params) => {
          params.successCallback(params.data?.items || []);
        },
      } as IDetailCellRendererParams<EventOrderProps, EventOrderItemProps>;
    };
  }, [
    t,
    setSelectedItems,
    itemTopics,
    uomFormatter,
    sectionFormatter,
    onGridReady,
    resetGridRowHeight,
    rowClassRules,
  ]);
  return {
    itemDetailCellRendererParams,
  };
}
