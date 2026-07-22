/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useRef, useCallback, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import type {
  ColDef,
  GridReadyEvent,
  PostSortRowsParams,
  Theme,
} from "ag-grid-community";
import type {
  BookingProps,
  EventProps,
  GridEventProps,
} from "@/types/booking.types";
import { themeQuartz } from "ag-grid-community";
import {
  eventStatusDisplayValueGetter,
  eventTimeFormatter,
  eventDateFormatter,
  functionRoomValueFormatter,
  filterValueFormatter,
  comparatorFunRoom,
  comparatorSetupCode,
  comparatorEventCode,
  comparatorCheckbox,
  comparatorTime,
  checkboxFilterFormatter,
  eventSetupValueFormatter,
  blockStatusDisplayValueGetter,
  canEventBeBlocked,
  getterRevenueCurrentSum,
  rowSelection,
  getEventRowId,
  isEventRowMaster,
  EventSelectionColumnDef,
} from "@/utils/eventsGridUtils";
import { AgGridThemeOptions, EVENT_RULES } from "@/utils/constants";
import { noop, noopStr, compareFun } from "@/utils/common";
import { Trans, useTranslation } from "react-i18next";
import Actions from "./actions";
import {
  EventDateRenderer,
  MeatballRenderer,
  NoRowsOverlay,
  DiagramRenderer,
  StatusRenderer,
  TimeEditor,
  NumberCellEditor,
  SelectCellRenderer,
} from "./components";
import DateEditor from "./components/DateEditor";
import {
  eventTypeValueFormatter,
  numberFilterValueFormatter,
  postSortRows,
} from "@/utils/eventsGridUtils";
import LoadingOverlayComponent from "./components/LoadingOverlayComponent";
import { useEventStore } from "@/stores/eventStore";
import { normalizeSpaces } from "@/utils/stringHelpers";
import useEventHandles from "@/hooks/events/useEventHandles";
import { usePromptForBookingPage } from "@/hooks/usePrompt";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router";
import {
  bookingKey,
  eventsKey,
  useEventsGridData,
  useEventOrderData,
} from "@/hooks";
import useGrid from "@/hooks/useGrid";
import { debounce } from "lodash-es";
import { calculateMeatballTranslate } from "@/utils/eventsGridUtils";
import { useGlobalStore } from "@/stores/store";
import NumberCellRenderer from "./components/NumberCellRenderer";
import useOrderGrid from "@/hooks/useOrderGrid";
import clsx from "clsx";
import {
  useRedrawSelectedItems,
  useRedrawSelectedOrders,
} from "@/hooks/useGridSelect";

interface BookingEventsGridProps {
  bookingInfo: BookingProps;
}

const myTheme = themeQuartz.withParams(AgGridThemeOptions);
export default function BookingEventsGrid({
  bookingInfo,
}: BookingEventsGridProps) {
  const { t } = useTranslation();
  const { bookingNumber } = useParams();
  const {
    isLoading,
    events,
    eventTypes,
    eventStatus,
    functionRooms,
    eventSetups,
  } = useEventsGridData(bookingInfo);
  useEventOrderData();
  usePromptForBookingPage();
  const {
    onRowValueChanged,
    enrichEventsWithValidation,
    onEventTypeValueChanged,
    onCellEditingStarted,
    onRowEditingStarted,
  } = useEventHandles();
  const gridRef = useRef<AgGridReact<GridEventProps>>(null);
  const setEventGridRef = useGlobalStore.useSetEventGridRef();
  const quickFilterText = useEventStore.useQuickFilterText();
  const resetEventStore = useEventStore.useResetEventStore();
  const setOrderMeatballTranslateX =
    useEventStore.useSetOrderMeatballTranslateX();
  const isSaving = useEventStore.useIsSaving();
  const queryClient = useQueryClient();

  const gridContext = {
    bookingInfo,
    eventStatus: eventStatus?.statusMap,
    functionRooms: functionRooms?.functionRoomMap,
    functionRoomsList: functionRooms?.functionRoomList,
    eventTypes: eventTypes?.eventTypeMap,
    eventTypesList: eventTypes?.eventTypeList,
    eventSetups: eventSetups?.setupCodeMap,
    eventSetupsList: eventSetups?.setupCodeList,
  };

  const theme = useMemo<Theme | "legacy">(() => {
    return myTheme;
  }, []);

  const {
    statusBar,
    getComparator,
    defaultColDef,
    handleSortChanged,
    handleFilterChanged,
    onSelectionChanged,
    getRowHeight,
    onRowGroupOpened,
    rowClassRules,
    quickFilterMatcher,
  } = useGrid();
  const { eventOrderDetailCellRendererParams } = useOrderGrid();
  const isCopyOrder = useEventStore.useIsCopyOrder();
  const isCopyItem = useEventStore.useIsCopyItem();
  const setIsCopyOrder = useEventStore.useSetIsCopyOrder();
  const setIsCopyItem = useEventStore.useSetIsCopyItem();
  const clearSelectedOrders = useEventStore.useClearSelectedOrders();
  const redrawSelectedItems = useRedrawSelectedItems();
  const redrawSelectedOrders = useRedrawSelectedOrders();
  const colDefs = useMemo<ColDef[]>(
    () => [
      {
        field: "eventDate",
        headerName: t("label.date"),
        width: 152,
        cellRenderer: EventDateRenderer,
        editable: true,
        cellEditor: DateEditor,
        filterParams: {
          valueFormatter: eventDateFormatter,
          treeList: false,
          comparator: compareFun,
        },
        valueFormatter: eventDateFormatter,
        getQuickFilterText: eventDateFormatter,
      },
      {
        field: "startDateTime",
        headerName: t("label.start"),
        width: 120,
        valueFormatter: eventTimeFormatter,
        getQuickFilterText: eventTimeFormatter,
        filterParams: {
          valueFormatter: eventTimeFormatter,
          treeList: false,
        },
        comparator: comparatorTime,
        cellEditor: TimeEditor,
        editable: true,
      },
      {
        field: "endDateTime",
        headerName: t("label.end"),
        width: 120,
        valueFormatter: eventTimeFormatter,
        getQuickFilterText: eventTimeFormatter,
        filterParams: {
          valueFormatter: eventTimeFormatter,
          treeList: false,
        },
        comparator: comparatorTime,
        cellEditor: TimeEditor,
        editable: true,
      },
      {
        field: "postAsName",
        headerName: t("label.eventDisplayName"),
        width: 172,
        valueFormatter: ({ value }) => (value ? normalizeSpaces(value) : ""),
        editable: true,
        cellEditor: "agTextCellEditor",
        cellEditorParams: {
          maxLength: 75,
        },
      },
      {
        field: "readerBoardIndicator",
        headerName: t("label.display"),
        width: 90,
        tooltipValueGetter: noop,
        getQuickFilterText: noopStr,
        filterParams: {
          valueFormatter: checkboxFilterFormatter,
          comparator: comparatorCheckbox,
        },
        editable: true,
        onCellValueChanged: onRowValueChanged,
        cellEditor: "agCheckboxCellEditor",
      },
      {
        field: "eventCode",
        headerName: t("label.type"),
        width: 128,
        filterParams: {
          valueFormatter: filterValueFormatter,
        },
        editable: true,
        cellEditor: "agRichSelectCellEditor",
        cellEditorParams: {
          values: eventTypes?.eventTypeList.map((i) => i.eventTypeCode),
          formatValue: (value: string | null | undefined) =>
            value ? (eventTypes?.eventTypeMap[value] ?? value) : null,
          cellRenderer: SelectCellRenderer,
          cellRendererParams: {
            onCellValueChange: onEventTypeValueChanged,
          },
          searchType: "matchAny",
          allowTyping: true,
          filterList: true,
          valuePlaceholder: t("label.selectEventType"),
        },
        valueFormatter: eventTypeValueFormatter,
        comparator: getComparator(comparatorEventCode),
        getQuickFilterText: eventTypeValueFormatter,
      },
      {
        field: "setupCode",
        headerName: t("label.setup"),
        width: 128,
        filterParams: {
          valueFormatter: filterValueFormatter,
        },
        editable: true,
        cellEditor: "agRichSelectCellEditor",
        cellEditorParams: {
          values: eventSetups?.setupCodeList.map((i) => i.setupTypeCode),
          formatValue: (value: string | null | undefined) =>
            value ? (eventSetups?.setupCodeMap[value] ?? value) : null,
          searchType: "matchAny",
          allowTyping: true,
          filterList: true,
          valuePlaceholder: t("label.selectSetup"),
        },
        valueFormatter: eventSetupValueFormatter,
        comparator: getComparator(comparatorSetupCode),
        getQuickFilterText: eventSetupValueFormatter,
      },
      {
        field: "attendance",
        headerName: t("label.attendance"),
        editable: true,
        cellEditor: NumberCellEditor,
        cellEditorParams: { maxLength: 10 },
        width: 112,
        cellStyle: {
          textAlign: "right",
        },
      },
      {
        field: "currentRevenue",
        headerName: `${t("heading.revenue")} (${t("heading.current")})`,
        valueGetter: getterRevenueCurrentSum,
        width: 131,
        cellStyle: {
          textAlign: "right",
        },
        cellRenderer: NumberCellRenderer,
      },
      {
        field: "functionRoomCode",
        headerName: t("label.functionRoom"),
        width: 148,
        editable: true,
        cellEditor: "agRichSelectCellEditor",
        cellEditorParams: {
          values: functionRooms?.functionRoomList.map((i) => i.roomCode),
          formatValue: (value: string | null | undefined) =>
            value
              ? (functionRooms?.functionRoomMap[value]?.roomName ?? value)
              : null,
          searchType: "matchAny",
          allowTyping: true,
          filterList: true,
          valuePlaceholder: t("label.selectFunctionRoom"),
        },
        valueFormatter: functionRoomValueFormatter,
        comparator: getComparator(comparatorFunRoom),
        getQuickFilterText: functionRoomValueFormatter,
        filterParams: {
          valueFormatter: filterValueFormatter,
        },
      },
      {
        field: "eventStatusCode",
        headerName: t("label.status"),
        width: 161,
        valueGetter: eventStatusDisplayValueGetter,
        cellRenderer: StatusRenderer,
      },
      {
        field: "requestRoomBlock",
        headerName: t("label.block"),
        width: 80,
        tooltipValueGetter: noop,
        filterParams: {
          valueFormatter: checkboxFilterFormatter,
          comparator: comparatorCheckbox,
        },
        getQuickFilterText: noopStr,
        valueGetter: blockStatusDisplayValueGetter,
        cellRenderer: "agCheckboxCellRenderer",
        cellRendererParams: (params: any) => ({
          disabled: !canEventBeBlocked(params.data.eventCode),
        }),
        editable: true,
        onCellValueChanged: onRowValueChanged,
        cellEditor: "agCheckboxCellEditor",
      },
      {
        field: "holdFromIndicator",
        headerName: t("label.heldFrom"),
        width: 80,
        tooltipValueGetter: () => {
          return (
            <div className="max-w-54">
              <Trans
                i18nKey={"message.heldFromTooltip"}
                components={{ strong: <strong /> }}
              />
            </div>
          );
        },

        filterParams: {
          valueFormatter: checkboxFilterFormatter,
          comparator: comparatorCheckbox,
        },
        getQuickFilterText: noopStr,
        editable: true,
        onCellValueChanged: onRowValueChanged,
        cellEditor: "agCheckboxCellEditor",
      },
      {
        field: "holdOverIndicator",
        headerName: t("label.heldOver"),
        width: 80,
        tooltipValueGetter: () => {
          return (
            <div className="max-w-54">
              <Trans
                i18nKey={"message.heldOverTooltip"}
                components={{ strong: <strong /> }}
              />
            </div>
          );
        },
        filterParams: {
          valueFormatter: checkboxFilterFormatter,
          comparator: comparatorCheckbox,
        },
        getQuickFilterText: noopStr,
        editable: true,
        cellEditor: "agCheckboxCellEditor",
        onCellValueChanged: onRowValueChanged,
      },
      {
        field: "setupMins",
        headerName: t("label.setupMins"),
        width: 108,
        editable: true,
        cellEditor: NumberCellEditor,
        filterParams: {
          valueFormatter: numberFilterValueFormatter,
          keyCreator: numberFilterValueFormatter,
        },
        valueFormatter: numberFilterValueFormatter,
      },
      {
        field: "dismantleMins",
        headerName: t("label.dismantleMins"),
        width: 139,
        editable: true,
        cellEditor: NumberCellEditor,
        filterParams: {
          valueFormatter: numberFilterValueFormatter,
          keyCreator: numberFilterValueFormatter,
        },
        valueFormatter: numberFilterValueFormatter,
      },
      {
        field: "diagramIndicator",
        headerName: t("label.diagram"),
        width: 134,
        tooltipValueGetter: noop,
        cellRenderer: DiagramRenderer,
        filter: false,
        getQuickFilterText: noopStr,
        headerClass: "header-center",
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
        cellRendererParams: { isEvent: true },
        sortable: false,
        filter: false,
        pinned: "right",
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onRowValueChanged, functionRooms, eventSetups, eventTypes],
  );

  const updateRowData = useCallback(
    async () => {
      if (!isLoading) {
        gridRef.current?.api?.updateGridOptions?.({
          rowData: events,
        });
        enrichEventsWithValidation(events).then((eventsWithValidation) => {
          gridRef.current?.api?.applyTransaction({
            update: eventsWithValidation.filter(
              (item) => item.warnings || item.errors,
            ),
          });
          gridRef.current?.api?.refreshCells({
            force: true,
          });
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, isLoading],
  );

  const onGridReady = useCallback(
    (params: GridReadyEvent) => {
      updateRowData();
      const calculateTranslate = debounce(() => {
        setOrderMeatballTranslateX(calculateMeatballTranslate());
      }, 200);
      calculateTranslate();
      params.api.addEventListener("bodyScroll", () => {
        calculateTranslate();
      });
    },
    [setOrderMeatballTranslateX, updateRowData],
  );

  useEffect(() => {
    updateRowData();
  }, [updateRowData]);

  useEffect(() => {
    setEventGridRef(gridRef);
    return () => {
      resetEventStore();
      queryClient.invalidateQueries({
        queryKey: [bookingKey, eventsKey, bookingNumber],
        exact: true,
        refetchType: "none",
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const postSortRowsEvent = useCallback(
    (params: PostSortRowsParams<EventProps>) =>
      postSortRows(params, EVENT_RULES),

    [],
  );

  useEffect(() => {
    const api = gridRef.current?.api;
    if (!api) return;
    const selectedItems = useEventStore.getState().selectedItems;
    api.forEachNode((node) => {
      node.selectable = !isCopyItem;
    });
    api.refreshCells({ force: true });
    api.forEachDetailGridInfo((orderGridInfo) => {
      orderGridInfo.api?.refreshCells({ force: true });
      orderGridInfo.api?.forEachDetailGridInfo((itemGridInfo) => {
        itemGridInfo.api?.forEachNode((node) => {
          if (isCopyItem) {
            node.selectable = selectedItems.has(node.id as string);
          } else {
            node.selectable = true;
          }
        });
        itemGridInfo.api?.refreshCells({ force: true });
      });
    });
  }, [isCopyItem]);

  useEffect(() => {
    if (!isCopyOrder && !isCopyItem) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isCopyItem) {
          setIsCopyItem(false);
          redrawSelectedItems();
          gridRef.current?.api?.forEachDetailGridInfo(
            (detailGridInfo) => {
              detailGridInfo.api?.deselectAll();
            },
          );
          gridRef.current?.api?.deselectAll();
          clearSelectedOrders();
        }
        if (isCopyOrder) {
          setIsCopyOrder(false);
          redrawSelectedOrders();
          gridRef.current?.api?.deselectAll();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isCopyOrder,
    isCopyItem,
    setIsCopyItem,
    setIsCopyOrder,
    clearSelectedOrders,
    redrawSelectedItems,
    redrawSelectedOrders,
  ]);

  return (
    <div className="flex grow flex-col">
      <Actions
        isLoading={isLoading}
        gridRef={gridRef}
        hasEvents={!!events?.length}
      />
      <div
        className={clsx(
          "events-grid relative h-[474px] w-full grow",
          isCopyOrder && "copying-order",
          isCopyItem && "copying-item",
        )}
      >
        <AgGridReact
          loading={isLoading || isSaving}
          selectionColumnDef={EventSelectionColumnDef}
          ref={gridRef}
          columnDefs={colDefs}
          defaultColDef={defaultColDef}
          rowSelection={rowSelection}
          statusBar={statusBar}
          theme={theme}
          context={gridContext}
          rowClassRules={rowClassRules}
          tooltipShowDelay={350}
          onSelectionChanged={onSelectionChanged}
          components={{ agNoRowsOverlay: NoRowsOverlay }}
          loadingOverlayComponent={LoadingOverlayComponent}
          suppressOverlays={["noMatchingRows"]}
          quickFilterText={normalizeSpaces(quickFilterText)}
          quickFilterParser={(quickFilter) => [quickFilter.trim()]}
          quickFilterMatcher={quickFilterMatcher}
          findSearchValue={normalizeSpaces(quickFilterText)}
          onGridReady={onGridReady}
          editType="fullRow"
          stopEditingWhenCellsLoseFocus={true}
          onRowValueChanged={onRowValueChanged}
          onCellEditingStarted={onCellEditingStarted}
          onRowEditingStarted={onRowEditingStarted}
          onSortChanged={handleSortChanged}
          getRowId={getEventRowId}
          onFilterChanged={handleFilterChanged}
          masterDetail={true}
          detailCellRendererParams={eventOrderDetailCellRendererParams}
          isRowMaster={isEventRowMaster}
          getRowHeight={getRowHeight}
          embedFullWidthRows={true}
          onRowGroupOpened={onRowGroupOpened}
          postSortRows={postSortRowsEvent}
        />
      </div>
    </div>
  );
}
