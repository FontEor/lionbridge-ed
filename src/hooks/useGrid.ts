import { useCallback, useMemo } from "react";
import {
  type ColDef,
  type SelectionChangedEvent,
  type SortChangedEvent,
  type FilterChangedEvent,
  type RowHeightParams,
  type RowGroupOpenedEvent,
  type RowClassRules,
} from "ag-grid-community";
import {
  CustomTooltip,
  RevenueCurrencyStatusPanel,
  TotalRowCountComponent,
} from "@/pages/bookings/events/components";
import type { EventProps } from "@/types/booking.types";
import {
  getErrorCellClass,
  rowSelection,
  getEventRowKey,
  getOrderRowKey,
  calculateRowHeightNoChildren,
  tooltipValueGetter,
  calculateMeatballTranslate,
  isEventReadonly,
  getEditable,
} from "@/utils/eventsGridUtils";
import { useEventStore } from "@/stores/eventStore";
import { zeroWidthSpace } from "@/utils/constants";
import { useGlobalStore } from "@/stores/store";

type ComparatorFun = (
  valueA: string,
  valueB: string,
  context: object,
) => number;

export default function useGrid() {
  const setIsSortActive = useEventStore.useSetIsSortActive();
  const setIsFilterActive = useEventStore.useSetIsFilterActive();
  const setSelectedEvents = useEventStore.useSetSelectedEvents();
  const gridRef = useGlobalStore.useEventGridRef();
  const setOrderMeatballTranslateX =
    useEventStore.useSetOrderMeatballTranslateX();

  const getComparator = useCallback(
    (comparatorFun: ComparatorFun) => {
      return (valueA: string, valueB: string) => {
        const context = gridRef?.current?.api.getGridOption("context");
        return comparatorFun(valueA, valueB, context);
      };
    },
    [gridRef],
  );

  const statusBar = useMemo(() => {
    return {
      statusPanels: [
        { statusPanel: TotalRowCountComponent, align: "left" },
        { statusPanel: RevenueCurrencyStatusPanel, align: "right" },
      ],
    };
  }, []);

  const defaultColDef = useMemo<ColDef>(() => {
    return {
      headerTooltipValueGetter: (props) => props.valueFormatted || props.value,
      tooltipValueGetter: tooltipValueGetter,
      resizable: false,
      editable: getEditable,
      filter: "agSetColumnFilter",
      filterParams: {
        cellHeight: 40,
        showTooltips: true,
      },
      cellClassRules: getErrorCellClass(),
      tooltipComponent: CustomTooltip,
    };
  }, []);

  const handleSortChanged = useCallback(
    (event: SortChangedEvent) => {
      const hasSort = event.columns?.some((col) => col.getSort() !== null);
      setIsSortActive(!!hasSort);
    },
    [setIsSortActive],
  );
  const handleFilterChanged = useCallback(
    (event: FilterChangedEvent) => {
      const model = event.api.getFilterModel();
      setIsFilterActive(Object.keys(model).length > 0);
    },
    [setIsFilterActive],
  );

  const onSelectionChanged = useCallback(
    (event: SelectionChangedEvent<EventProps>) => {
      const selectedEvents =
        event.selectedNodes?.map((node) => node.data!) ?? [];
      setSelectedEvents(selectedEvents);
    },
    [setSelectedEvents],
  );

  const getRowHeight = useCallback((params: RowHeightParams<EventProps>) => {
    const { node, api } = params;
    if (node && node.detail) {
      let allHeight = calculateRowHeightNoChildren(node.data!);
      const detailGridApi = api.getDetailGridInfo(`${node.id}`);
      detailGridApi?.api?.forEachNode((rowNode) => {
        allHeight += rowNode.expanded
          ? calculateRowHeightNoChildren(rowNode.data)
          : 0;
      });
      return allHeight;
    }
  }, []);

  const onRowGroupOpened = useCallback(
    (event: RowGroupOpenedEvent<EventProps>) => {
      //Expanding or collapsing may cause the scroll bar to appear/disappear. should re-calculate translate value
      setTimeout(
        () => setOrderMeatballTranslateX(calculateMeatballTranslate()),
        200,
      );
      const { selectedEventOrders, isCopyOrder, selectedItems, isCopyItem } =
        useEventStore.getState();
      const rowKey = getEventRowKey(event.data!);
      const orders = selectedEventOrders[rowKey] ?? [];
      const hasSelectedItems = Array.from(selectedItems.values()).some(
        (item) => item.eventRowKey === rowKey,
      );
      if (
        (isCopyOrder && orders.length > 0) ||
        (hasSelectedItems && isCopyItem)
      ) {
        //add underline for event in order copy state
        gridRef?.current?.api.redrawRows({ rowNodes: [event.node] });
      }
      if (!event.expanded) return;
      setTimeout(() => {
        const detailApi = gridRef?.current?.api.getDetailGridInfo(
          `detail_${rowKey}`,
        )?.api;
        for (const order of orders) {
          const node = detailApi?.getRowNode(getOrderRowKey(order));
          node?.setSelected(true);
        }
      }, 50);
    },
    [gridRef, setOrderMeatballTranslateX],
  );

  const rowClassRules = useMemo<RowClassRules<EventProps>>(() => {
    return {
      "border-b-main-sky-500! border-b-2! border-dashed!": (params) => {
        if (!params.data) return false;
        if (params.node.expanded || params.node.detail) return false;
        const { isCopyOrder, selectedEventOrders, selectedItems } =
          useEventStore.getState();
        const eventRowKey = getEventRowKey(params.data);
        const hasSelectedOrders =
          isCopyOrder && (selectedEventOrders[eventRowKey] ?? []).length > 0;
        const hasSelectedItems = Array.from(selectedItems.values()).some(
          (item) => item.eventRowKey === eventRowKey,
        );
        return hasSelectedOrders || hasSelectedItems;
      },
      "select-disable": (params) => {
        if (!params.data) return false;
        const { isCopyOrder } = useEventStore.getState();
        return (
          isCopyOrder && !params.node.detail && isEventReadonly(params.data)
        );
      },
    };
  }, []);

  const quickFilterMatcher = useCallback(
    (quickFilterParts: string[], rowQuickFilterAggregateText: string) => {
      const textArr = rowQuickFilterAggregateText.split("\n");
      const realTextArr = textArr.map((text) => {
        if (text.endsWith(zeroWidthSpace)) {
          return text.replaceAll(zeroWidthSpace, "");
        }
        return text;
      });
      const _realTextArr = textArr.map((text) => {
        if (text.endsWith(zeroWidthSpace)) {
          return text.replaceAll(zeroWidthSpace, "").replaceAll(",", "");
        }
        return text;
      });
      try {
        return (
          quickFilterParts.every((part) =>
            _realTextArr.join("\n").match(part),
          ) ||
          quickFilterParts.every((part) => realTextArr.join("\n").match(part))
        );
      } catch {
        return false;
      }
    },
    [],
  );

  return {
    rowSelection,
    statusBar,
    defaultColDef,
    handleSortChanged,
    handleFilterChanged,
    onSelectionChanged,
    getComparator,
    getRowHeight,
    onRowGroupOpened,
    rowClassRules,
    quickFilterMatcher,
  };
}
