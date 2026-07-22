import { useMemo, useCallback } from "react";
import {
  type IDetailCellRendererParams,
  type RowSelectedEvent,
  type GridReadyEvent,
  type ICellRendererParams,
  type GridOptions,
  type RowClassRules,
  type RowClassParams,
  type RowValueChangedEvent,
} from "ag-grid-community";
import { useTranslation } from "react-i18next";
import {
  type EventOrderProps,
  type EventOrderItemProps,
} from "@/types/booking.types";
import {
  CustomTooltip,
  MeatballRenderer,
  TimeEditor,
  NumberCellEditor,
} from "@/pages/bookings/events/components";
import {
  ItemSelectionColumnDef,
  rowSelection,
  getItemRowId,
  eventTimeFormatter,
  moneyFormatter,
  createValueFormatters,
  createArrayValueFormatter,
  comparatorTime,
  getOrderRowKey,
  getErrorCellClass,
  tooltipValueGetter,
  getEditable,
  updateRowInList,
  getItemRowKey,
} from "@/utils/eventsGridUtils";
import {
  formatItemName,
  formatItemDesc,
  setItemName,
} from "@/utils/itemModalUtils";
import { validateItem } from "@/utils/validation";
import { NodeLevelMap } from "@/utils/constants";
import { useEventOrderData } from "./useEvents";
import { useEventStore } from "@/stores/eventStore";
import useGridUpdate from "./useGridUpdate";
import { updateEventTimeDate } from "@/utils/dateHelpers";

export default function useItemGrid() {
  const { t } = useTranslation();
  const setIsDirty = useEventStore.useSetIsDirty();
  const setSelectedItems = useEventStore.useSetSelectedItems();
  const {
    resetGridRowHeight,
    setEventDataDirty,
    getEventOrderItemData,
    updateEventOrderData,
  } = useGridUpdate();

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
    const isItemSelected = (params: RowClassParams) => {
      const { isCopyItem, selectedItems } = useEventStore.getState();
      return isCopyItem && selectedItems.has(getItemRowKey(params.data));
    };
    return {
      "border-main-sky-500! border-2! border-dashed shadow-[0px_-2px_0px] shadow-main-sky-100":
        isItemSelected,
      "select-disable": (params) => !isItemSelected(params),
    };
  }, []);

  const onRowValueChanged = useCallback(
    async (params: RowValueChangedEvent) => {
      setItemName(params.data, params.data.displayName);
      const { order, event } = getEventOrderItemData(
        params.node.id!,
        params.context.orderRowKey,
        params.context.eventRowKey,
      );

      params.data.serveDtTm = updateEventTimeDate(
        params.data.serveDtTm,
        event?.eventDate,
      );

      const validatedItem = await validateItem(params.data, order);
      setEventDataDirty(params.context?.eventRowKey);
      order.items = updateRowInList(order.items!, validatedItem, getItemRowKey);
      updateEventOrderData(params.context?.eventRowKey, order!);
      params.api.applyTransaction({
        update: [{ ...validatedItem }],
      });
      setIsDirty(true);
    },
    [
      getEventOrderItemData,
      updateEventOrderData,
      setEventDataDirty,
      setIsDirty,
    ],
  );

  const itemDetailCellRendererParams = useMemo(() => {
    return (params: ICellRendererParams) => {
      return {
        detailGridOptions: {
          context: {
            orderRowKey: getOrderRowKey(params.data),
            readonly: params.data.isReadOnly,
            ...params.context,
          },
          getRowId: getItemRowId,
          columnDefs: [
            {
              headerName: t("label.displayName"),
              field: "displayName",
              width: 150,
              valueGetter: formatItemName,
            },
            {
              headerName: t("label.description"),
              width: 353,
              valueGetter: formatItemDesc,
              editable: false,
            },
            {
              field: "serveDtTm",
              headerName: t("label.serveTime"),
              width: 120,
              valueFormatter: eventTimeFormatter,
              comparator: comparatorTime,
              cellEditor: TimeEditor,
            },
            {
              field: "quantityOrdered",
              headerName: t("label.expectedQuantity"),
              width: 94,
              cellStyle: {
                textAlign: "right",
              },
              cellEditor: NumberCellEditor,
              cellEditorParams: { maxLength: 10 },
            },
            {
              field: "quantityGuaranteed",
              headerName: t("label.guaranteedQuantity"),
              width: 98,
              cellStyle: {
                textAlign: "right",
              },
              cellEditor: NumberCellEditor,
              cellEditorParams: { maxLength: 10 },
            },
            {
              field: "itemPrice",
              headerName: t("label.price"),
              width: 97,
              cellStyle: {
                textAlign: "right",
              },
              valueFormatter: moneyFormatter,
              cellEditor: NumberCellEditor,
              cellEditorParams: { maxLength: 10 },
            },
            {
              field: "sectionLookupSid",
              headerName: t("label.section"),
              width: 97,
              valueFormatter: sectionFormatter,
              cellEditor: "agRichSelectCellEditor",
              cellEditorParams: {
                values: catalogSectionTypes?.catalogSectionList.map(
                  (i) => i.sectionLookupSid,
                ),
                formatValue: (value: number) =>
                  value
                    ? (catalogSectionTypes?.catalogSectionsMap[value] ?? value)
                    : null,
                searchType: "matchAny",
                allowTyping: true,
              },
            },
            {
              field: "pricePointLookupSid",
              headerName: t("label.unitOfMeasure"),
              width: 168,
              valueFormatter: uomFormatter,
              cellEditor: "agRichSelectCellEditor",
              cellEditorParams: {
                values: unitOfMeasureTypes?.unitOfMeasureList.map(
                  (i) => i.pricePointLookupSid,
                ),
                formatValue: (value: number) =>
                  value
                    ? (unitOfMeasureTypes?.unitOfMeasureMap[value] ?? value)
                    : null,
                searchType: "matchAny",
                allowTyping: true,
              },
            },
            {
              field: "display",
              headerName: t("label.displayItem"),
              width: 144,
              cellEditor: "agCheckboxCellEditor",
              onCellValueChanged: onRowValueChanged,
            },
            {
              field: "displayQuantity",
              headerName: t("label.displayQuantity"),
              width: 179,
              cellEditor: "agCheckboxCellEditor",
              onCellValueChanged: onRowValueChanged,
            },
            {
              field: "topicSids",
              headerName: t("label.topics"),
              valueFormatter: createArrayValueFormatter(itemTopics?.topicsMap),
              cellEditor: "agRichSelectCellEditor",
              cellEditorParams: {
                values: itemTopics?.topicsList.map((i) => i.itemTopicLookupSid),
                formatValue: (value: number) =>
                  value ? (itemTopics?.topicsMap[value] ?? value) : null,
                searchType: "matchAny",
                allowTyping: true,
                multiSelect: true,
              },
            },
            {
              suppressNavigable: true,
              sortable: false,
              filter: false,
              editable: false,
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
              cellRendererParams: { type: "item" },
              sortable: false,
              filter: false,
              editable: false,
              pinned: "right",
            },
          ],
          editType: "fullRow",
          popupParent: document.querySelector("body"),
          stopEditingWhenCellsLoseFocus: true,
          selectionColumnDef: ItemSelectionColumnDef,
          rowSelection,
          rowClassRules,
          suppressHorizontalScroll: true,
          defaultColDef: {
            headerTooltipValueGetter: (props) =>
              props.valueFormatted || props.value,
            tooltipComponent: CustomTooltip,
            tooltipValueGetter: tooltipValueGetter,
            resizable: false,
            cellClassRules: getErrorCellClass(),
            editable: getEditable,
          },
          onGridReady: onGridReady,
          onRowValueChanged: onRowValueChanged,
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
    catalogSectionTypes,
    unitOfMeasureTypes,
    onRowValueChanged,
  ]);
  return {
    itemDetailCellRendererParams,
  };
}
