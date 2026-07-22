/* eslint-disable @typescript-eslint/no-unused-vars */
import { useMemo, useCallback } from "react";
import type {
  SelectionChangedEvent,
  IDetailCellRendererParams,
  ICellRendererParams,
  RowGroupOpenedEvent,
  RowDataUpdatedEvent,
  RowValueChangedEvent,
  GridApi,
  RowClassRules,
  RowEditingStartedEvent,
} from "ag-grid-community";
import type { CellEditingStartedEvent } from "ag-grid-enterprise";
import type { CustomCellEditorProps } from "ag-grid-react";

import { useTranslation } from "react-i18next";
import { validateOrder } from "@/utils/validation";

import {
  MeatballRenderer,
  TimeEditor,
  NumberCellEditor,
  SelectCellRenderer,
  CustomTooltip,
} from "@/pages/bookings/events/components";
import type { EventOrderProps, EventProps } from "@/types/booking.types";
import {
  eventTimeFormatter,
  createValueFormatters,
  getterOrderRevenueCurrentSum,
  comparatorTime,
  GroupSelectionColumnDef,
  rowSelection,
  getOrderRowId,
  isEventOrderRowMaster,
  getEventRowKey,
  postSortRows,
  getOrderRowKey,
  syncItemServeTimeWhenOrderChange,
  syncItemAttendanceWhenOrderChange,
  syncItemGuaranteeWhenOrderChange,
  getErrorCellClass,
  tooltipValueGetter,
  getEditable,
} from "@/utils/eventsGridUtils";
import { useEventStore } from "@/stores/eventStore";
import { noop } from "@/utils/common";
import { useEventOrderData } from "./useEvents";
import {
  TENDER_CODE,
  DAY_START_TIME,
  DAY_END_TIME,
  EVENT_ORDER_RULES,
} from "@/utils/constants";
import useItemGrid from "./useItemGrid";
import useGridUpdate from "./useGridUpdate";
import {
  isResumeEventOrder,
  isSpecialOrderType,
} from "@/utils/eventOrderModalUtils";
import { toEventTime, updateEventTimeDate } from "@/utils/dateHelpers";

export default function useOrderGrid() {
  const { t } = useTranslation();

  const eventOrderData = useEventOrderData();
  const { eventOrderTypes, eventOrderTenderTypes } = eventOrderData;
  const setIsDirty = useEventStore.useSetIsDirty();
  const setSelectedEventOrders = useEventStore.useSetSelectedEventOrders();
  const setCurrentEditingRow = useEventStore.useSetCurrentEditingRow();
  const { itemDetailCellRendererParams } = useItemGrid();
  const {
    resetGridRowHeight,
    setEventDataDirty,
    getEventNode,
    updateEventOrderData,
  } = useGridUpdate();

  const { eventOrderTypeFormatter, eventOrderTenderTypeFormatter } = useMemo(
    () =>
      createValueFormatters({
        eventOrderType: eventOrderTypes?.eventOrderTypeMap,
        eventOrderTenderType: eventOrderTenderTypes?.eventOrderTenderMap,
      }),
    [eventOrderTenderTypes, eventOrderTypes],
  );

  const onRowEditingStarted = useCallback(
    (params: RowEditingStartedEvent) => {
      setCurrentEditingRow({ ...params.data });
    },
    [setCurrentEditingRow],
  );

  const onRowValueChanged = useCallback(
    async (event: RowValueChangedEvent) => {
      const { data: newData } = event.node;
      const eventNode = getEventNode(event.context?.eventRowKey);

      newData.startDateTime = updateEventTimeDate(
        newData.startDateTime,
        eventNode.data?.eventDate,
      );
      newData.endDateTime = updateEventTimeDate(
        newData.endDateTime,
        eventNode.data?.eventDate,
      );

      const oldData = useEventStore.getState()
        .currentEditingRow as EventOrderProps;
      syncItemServeTimeWhenOrderChange(oldData, newData);
      syncItemAttendanceWhenOrderChange(oldData, newData);
      syncItemGuaranteeWhenOrderChange(oldData, newData);

      const validatedOrder = await validateOrder(newData);

      setEventDataDirty(event.context?.eventRowKey);
      updateEventOrderData(event.context?.eventRowKey, validatedOrder);
      event.api.applyTransaction({ update: [{ ...validatedOrder }] });
      setIsDirty(true);
      setCurrentEditingRow(null);
    },
    [
      setEventDataDirty,
      setIsDirty,
      updateEventOrderData,
      getEventNode,
      setCurrentEditingRow,
    ],
  );

  const getEditor = useCallback((api: GridApi, id: string) => {
    const editors = api.getCellEditorInstances({
      columns: [id],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editorIns: any = editors.length > 0 ? editors[0] : null;
    return editorIns || null;
  }, []);

  const onOrderTypeChange = useCallback(
    (
      params: CustomCellEditorProps | CellEditingStartedEvent,
      value: number,
    ) => {
      if (value) {
        const { api } = params;

        const nameEditor = getEditor(api, "postAsName");
        if (
          eventOrderTypes?.eventOrderTypeMap &&
          eventOrderTypes?.eventOrderTypeMap[value]
        ) {
          nameEditor?.eEditor.setValue(
            eventOrderTypes?.eventOrderTypeMap[value],
          );
        }

        const tenderTypeEditor = getEditor(api, "tenderTypeCode");
        const fbIndicator = eventOrderTypes?.fbIndicatorMap.get(value);
        if (fbIndicator === true) {
          tenderTypeEditor?.eEditor.setValue(TENDER_CODE.BANQUET_CHECK);
        } else if (fbIndicator === false) {
          tenderTypeEditor?.eEditor.setValue(TENDER_CODE.NA);
        }

        const estimateAttendEditor = getEditor(api, "attendanceEstimate");
        const guranteeAttendEditor = getEditor(api, "attendanceGuarantee");
        const attendSetEditor = getEditor(api, "attendanceSet");
        if (isResumeEventOrder(value)) {
          estimateAttendEditor?.updateValue(0);
          guranteeAttendEditor?.updateValue(0);
          attendSetEditor?.updateValue(0);
        }
        const startTimeEditor = getEditor(api, "startDateTime");
        const endTimeEditor = getEditor(api, "endDateTime");
        const eventNode = getEventNode(params.context?.eventRowKey);
        if (isSpecialOrderType(value)) {
          const startTime = toEventTime(
            DAY_START_TIME,
            eventNode?.data.startDateTime,
          );
          const endTime = toEventTime(
            DAY_END_TIME,
            eventNode?.data.endDateTime,
          );
          startTimeEditor?.updateValue(startTime);
          endTimeEditor?.updateValue(endTime);
        } else {
          startTimeEditor?.updateValue(
            eventNode?.data.startDateTime
              ? eventNode?.data.startDateTime
              : undefined,
          );
          endTimeEditor?.updateValue(
            eventNode?.data.endDateTime
              ? eventNode?.data.endDateTime
              : undefined,
          );
        }
      }
    },
    [eventOrderTypes, getEditor, getEventNode],
  );

  const rowClassRules = useMemo<RowClassRules>(() => {
    return {
      "border-y-main-sky-500! border-y-2! copied border-dashed shadow-[0px_-2px_0px] shadow-main-sky-100":
        (params) => {
          const eventRowKey = params.context.eventRowKey;
          if (!useEventStore.getState().isCopyOrder) return false;
          return useEventStore
            .getState()
            .selectedEventOrders[
              eventRowKey
            ]?.some((order) => getOrderRowKey(order) === getOrderRowKey(params.data) && !params.node.detail);
        },
      "border-b-main-sky-500! border-b-2! border-dashed!": (params) => {
        if (params.node.detail || params.node.expanded) return false;
        const orderRowKey = getOrderRowKey(params.data);
        return Array.from(useEventStore.getState().selectedItems.values()).some(
          (item) => item.orderRowKey === orderRowKey,
        );
      },
    };
  }, []);

  const eventOrderDetailCellRendererParams = useMemo(() => {
    return (params: ICellRendererParams) => {
      return {
        detailGridOptions: {
          masterDetail: true,
          groupDefaultExpanded: 0,
          context: { eventRowKey: getEventRowKey(params.data) },
          isRowMaster: isEventOrderRowMaster,
          embedFullWidthRows: true,
          getRowId: getOrderRowId,
          rowClassRules: rowClassRules,
          columnDefs: [
            {
              field: "eventOrderNumber",
              headerName: t("label.eventOrder"),
              width: 135,
              editable: false,
            },
            {
              field: "startDateTime",
              headerName: t("label.start"),
              valueFormatter: eventTimeFormatter,
              width: 120,
              comparator: comparatorTime,
              cellEditor: TimeEditor,
            },
            {
              field: "endDateTime",
              headerName: t("label.end"),
              valueFormatter: eventTimeFormatter,
              width: 120,
              comparator: comparatorTime,
              cellEditor: TimeEditor,
            },
            {
              field: "postAsName",
              headerName: t("label.eventDisplayName"),
              width: 172,
              cellEditor: "agTextCellEditor",
              cellEditorParams: {
                maxLength: 75,
              },
            },
            {
              field: "readerBoardIndicator",
              headerName: t("label.display"),
              tooltipValueGetter: noop,
              width: 90,
              cellEditor: "agCheckboxCellEditor",
              onCellValueChanged: onRowValueChanged,
            },
            {
              field: "eventOrderTypeCode",
              headerName: t("label.type"),
              width: 128,
              valueFormatter: eventOrderTypeFormatter,
              cellEditor: "agRichSelectCellEditor",
              cellEditorParams: {
                values: eventOrderTypes?.eventOrderTypeList.map(
                  (i) => i.eventOrderTypeLookupSid,
                ),
                formatValue: (value: number) =>
                  value
                    ? (eventOrderTypes?.eventOrderTypeMap[value] ?? value)
                    : null,
                cellRenderer: SelectCellRenderer,
                cellRendererParams: {
                  onCellValueChange: onOrderTypeChange,
                },
                searchType: "matchAny",
                allowTyping: true,
                valuePlaceholder: t("label.selectEventType"),
              },
            },
            {
              field: "attendanceEstimate",
              headerName: t("label.attendance"),
              width: 93,
              cellStyle: {
                textAlign: "right",
              },
              cellEditor: NumberCellEditor,
              cellEditorParams: { maxLength: 10 },
            },
            {
              field: "attendanceGuarantee",
              headerName: t("button.guaranteed"),
              width: 123,
              cellStyle: {
                textAlign: "right",
              },
              cellEditor: NumberCellEditor,
              cellEditorParams: { maxLength: 10 },
            },
            {
              field: "attendanceSet",
              headerName: t("label.set"),
              width: 81,
              cellStyle: {
                textAlign: "right",
              },
              cellEditor: NumberCellEditor,
              cellEditorParams: { maxLength: 10 },
            },
            {
              field: "currentRevenue",
              headerName: t("heading.revenue"),
              valueGetter: getterOrderRevenueCurrentSum,
              width: 131,
              editable: false,
              cellStyle: {
                textAlign: "right",
              },
            },
            {
              field: "finalDetailedIndicator",
              headerName: t("label.detailed"),
              width: 161,
              cellEditor: "agCheckboxCellEditor",
              onCellValueChanged: onRowValueChanged,
            },
            {
              field: "tenderTypeCode",
              headerName: t("label.tenderType"),
              width: 161,
              valueFormatter: eventOrderTenderTypeFormatter,
              cellEditor: "agRichSelectCellEditor",
              cellEditorParams: {
                values: eventOrderTenderTypes?.eventOrderTenderTypeList.map(
                  (i) => i.tenderTypeLookupSid,
                ),
                formatValue: (value: number) =>
                  value
                    ? (eventOrderTenderTypes?.eventOrderTenderMap[value] ??
                      value)
                    : null,
                searchType: "matchAny",
                allowTyping: true,
                valuePlaceholder: t("label.selectEventType"),
              },
            },
            {
              field: "diagramUrl",
              headerName: t("label.diagram"),
              width: 161,
              editable: false,
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
              cellRendererParams: { type: "order" },
              sortable: false,
              filter: false,
              editable: false,
              pinned: "right",
              suppressMovable: true,
            },
          ],
          editType: "fullRow",
          popupParent: document.querySelector("body"),
          stopEditingWhenCellsLoseFocus: true,
          selectionColumnDef: GroupSelectionColumnDef,
          rowSelection,
          detailRowAutoHeight: true,
          suppressHorizontalScroll: true,
          defaultColDef: {
            headerTooltipValueGetter: (props) =>
              props.valueFormatted || props.value,
            tooltipValueGetter: tooltipValueGetter,
            resizable: false,
            cellClassRules: getErrorCellClass(),
            tooltipComponent: CustomTooltip,
            editable: getEditable,
          },
          onRowGroupOpened: (_event: RowGroupOpenedEvent<EventOrderProps>) => {
            const orderRowKey = getOrderRowKey(_event.data!);
            const hasSelectedItems = Array.from(
              useEventStore.getState().selectedItems.values(),
            ).some((item) => item.orderRowKey === orderRowKey);
            if (hasSelectedItems) {
              _event.api.redrawRows({ rowNodes: [_event.node] });
            }
            resetGridRowHeight();
          },
          onRowEditingStarted,
          onRowValueChanged: (event) => {
            onRowValueChanged(event);
          },
          onRowDataUpdated: (_event: RowDataUpdatedEvent<EventOrderProps>) => {
            resetGridRowHeight();
          },
          onSelectionChanged: (
            event: SelectionChangedEvent<EventOrderProps>,
          ) => {
            const selectedEventOrders =
              event.selectedNodes?.map((node) => node.data!) ?? [];
            setSelectedEventOrders(
              getEventRowKey(params.data),
              selectedEventOrders,
            );
          },
          postSortRows: (params) => postSortRows(params, EVENT_ORDER_RULES),
          detailCellRendererParams: itemDetailCellRendererParams,
          onFirstDataRendered: (params) => {
            params.api.collapseAll();
          },
        },
        getDetailRowData: (params) => {
          params.successCallback(params.data.eventOrders);
        },
      } as IDetailCellRendererParams<EventProps, EventOrderProps>;
    };
  }, [
    rowClassRules,
    t,
    eventOrderTypeFormatter,
    eventOrderTenderTypeFormatter,
    onRowEditingStarted,
    onRowValueChanged,
    itemDetailCellRendererParams,
    resetGridRowHeight,
    eventOrderTypes,
    eventOrderTenderTypes,
    onOrderTypeChange,
    setSelectedEventOrders,
  ]);

  return {
    eventOrderDetailCellRendererParams,
  };
}
