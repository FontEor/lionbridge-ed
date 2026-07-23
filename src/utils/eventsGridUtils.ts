/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  ValueFormatterParams,
  ValueGetterParams,
  CellClassParams,
  IRowNode,
  RowSelectionOptions,
  SelectionColumnDef,
  GetRowIdParams,
  PostSortRowsParams,
  CellClassRules,
  ColDef,
  ITooltipParams,
  EditableCallbackParams,
} from "ag-grid-community";
import { isNumber } from "lodash-es";
import {
  formatDateWithLocale,
  formatLocalDate,
  syncCopiedDatetime,
  syncEndDateTime,
  isPastDate,
} from "@/utils/dateHelpers";
import {
  EVENT_TYPE_DEPARTMENT_NOTES,
  eventStatusType,
  StatusType,
  AgGridThemeOptions,
  zeroWidthSpace,
} from "@/utils/constants";
import type {
  BookingProps,
  GridEventProps,
  EventProps,
  EventOrderProps,
  EventOrderItemProps,
} from "@/types/booking.types";
import { compareFun, toBoolean, formatAmount } from "@/utils/common";
import { type ArraySchema, type ValidationError } from "yup";
import BigNumber from "bignumber.js";
import dayjs from "dayjs";
import { useBookingStore } from "@/stores";

export const EventRowKeyPrefix = "event_";
export const OrderRowKeyPrefix = "order_";
export const ItemRowKeyPrefix = "item_";

export const EventRevenueCurrentKeys = [
  "currentBeverageRevenue",
  "currentEngineeringRevenue",
  "currentFoodRevenue",
  "currentOtherRevenue",
  "currentPrideRevenue",
  "currentRoomRentalRevenue",
  "currentTechnologyRevenue",
];

export const blockedEventStatus = "XX";
const specialOptionCode = ["S", "F"];
export const BookingStatus = {
  Actual: "Actual",
  Definite: "Definite",
  Tentative: "Tentative",
};

const CheckboxCheckedText = "Checked";
const CheckboxUncheckedText = "Unchecked";

export const eventDateFormatTemplate = {
  date: "DD-MMM-YYYY",
  week: "(dd)",
};

export const transformEventStatusCode = (props: ValueGetterParams) => {
  const {
    data: { eventStatusCode },
    data,
  } = props;

  const status =
    blockedEventStatus === eventStatusCode &&
    specialOptionCode.includes(data.optionCode)
      ? `${eventStatusCode}-${data.optionCode}`
      : eventStatusCode;
  return status;
};

export const getEventStatusType = (
  code: keyof typeof eventStatusType,
  bookInfo: BookingProps,
) => {
  const type = eventStatusType[code];
  if (!type) {
    if (
      [BookingStatus.Definite, BookingStatus.Actual].includes(bookInfo.status)
    ) {
      return StatusType.Error;
    }
    if (bookInfo.status === BookingStatus.Tentative) {
      return StatusType.Success;
    }
    return StatusType.Info;
  }
  return type;
};

export const eventStatusDisplayValueGetter = (props: ValueGetterParams) => {
  const {
    context: { eventStatus = {} },
  } = props;
  const code = transformEventStatusCode(props);
  return eventStatus[code] || code;
};

export const blockStatusDisplayValueGetter = (props: ValueGetterParams) => {
  const {
    data: { eventStatusCode, requestRoomBlock },
  } = props;
  return isEventBlocked(eventStatusCode, requestRoomBlock);
};

export const getEventStatusTypeAndValue = (props: ValueGetterParams) => {
  const {
    context: { eventStatus, bookInfo },
  } = props;
  const code = transformEventStatusCode(props);
  const value = eventStatus[code] || code;
  const type = getEventStatusType(code, bookInfo);
  return { value, type };
};

export const eventTimeFormatter = ({ value }: ValueFormatterParams) => {
  return value ? formatDateWithLocale(value, "h:mm A") : "";
};
const createLookupFormatter =
  (contextKey: "eventTypes" | "eventSetups") =>
  (props: ValueFormatterParams) => {
    const { context, value } = props;
    const lookupTable = context?.[contextKey];
    if (!value) return "";

    return lookupTable?.[value] ?? value;
  };
export const functionRoomValueFormatter = (props: ValueFormatterParams) => {
  const { context, value } = props;
  const lookupTable = context?.functionRooms;
  if (!value) return "";

  return lookupTable?.[value]?.roomName ?? value;
};
export const eventTypeValueFormatter = createLookupFormatter("eventTypes");
export const eventSetupValueFormatter = createLookupFormatter("eventSetups");
export const eventDateFormatter = ({ value }: ValueFormatterParams) => {
  return formatLocalDate(
    value,
    `${eventDateFormatTemplate.date} ${eventDateFormatTemplate.week}`,
  );
};

export const filterValueFormatter = (props: ValueFormatterParams) => {
  const { colDef } = props;
  let value = "";
  switch (colDef.field) {
    case "functionRoomCode":
      value = functionRoomValueFormatter(props);
      break;
    case "eventCode":
      value = eventTypeValueFormatter(props);
      break;
    case "setupCode":
      value = eventSetupValueFormatter(props);
      break;
    default:
      value = props.value;
      break;
  }
  return value || "(Blanks)";
};

export const numberFilterValueFormatter = (props: ValueFormatterParams) => {
  const { value } = props;
  return isNumber(value) ? String(value) : String(0);
};

export const checkboxFilterFormatter = (props: ValueFormatterParams) => {
  const { value } = props;
  return toBoolean(value) ? CheckboxCheckedText : CheckboxUncheckedText;
};

type FormatterFunction = (x: ValueFormatterParams) => string;
export const createComparator = (formatter: FormatterFunction) => {
  return (
    valueA: string | number | Date,
    valueB: string | number | Date,
    gridContext: object,
  ) => {
    const valueAFormatted = formatter({
      value: valueA,
      context: gridContext,
    } as ValueFormatterParams);
    const valueBFormatted = formatter({
      value: valueB,
      context: gridContext,
    } as ValueFormatterParams);
    return compareFun(valueAFormatted, valueBFormatted);
  };
};

export const comparatorFunRoom = createComparator(functionRoomValueFormatter);

export const comparatorSetupCode = createComparator(eventSetupValueFormatter);

export const comparatorEventCode = createComparator(eventTypeValueFormatter);

export const comparatorCheckbox = createComparator(checkboxFilterFormatter);

export const comparatorTime = (valueA: string, valueB: string) => {
  const date24A = formatDateWithLocale(valueA, "HH:mm");
  const date24B = formatDateWithLocale(valueB, "HH:mm");
  return compareFun(date24A, date24B);
};

export const getErrorCellClass = (): CellClassRules => {
  return {
    "!border-status-error": (params: CellClassParams) =>
      params.data.errors &&
      params.colDef.field &&
      params.data.errors[params.colDef.field],
    "!border-status-warning": (params: CellClassParams) =>
      params.data.warnings &&
      params.colDef.field &&
      !params.data.errors?.[params.colDef.field] &&
      params.data.warnings[params.colDef.field],
  };
};

export function validateEvents(
  data: GridEventProps[],
  errorSchema: ArraySchema<any, any, any>,
  warningSchema: ArraySchema<any, any, any>,
) {
  return Promise.allSettled([
    errorSchema.validate(data, { abortEarly: false }),
    warningSchema.validate(data, { abortEarly: false }),
  ]).then(([errorResult, warningResult]) => {
    const getErrors = (error: ValidationError) => {
      const errorsMap = new Map();
      error.inner.forEach((err) => {
        const matchResult = err.path?.match(/\[(\d+)\]\.(\w+)/);
        if (matchResult && matchResult.length >= 3) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const [_, indexStr, field] = matchResult;
          const error = errorsMap.get(indexStr) ?? {};
          errorsMap.set(indexStr, { ...error, [field]: err.message });
        }
      });
      return errorsMap;
    };
    let errors = null;
    let warnings = null;
    if (errorResult.status === "rejected") {
      errors = getErrors(errorResult.reason);
    }
    if (warningResult.status === "rejected") {
      warnings = getErrors(warningResult.reason);
    }
    return data.map((item, index) => {
      const itemErrors = errors ? errors.get(index.toString()) : null;
      const itemWarnings = warnings ? warnings.get(index.toString()) : null;
      return { ...item, errors: itemErrors, warnings: itemWarnings };
    });
  });
}

export const isEventBlocked = (
  eventStatusCode?: string,
  requestRoomBlock?: boolean,
) => {
  if (requestRoomBlock !== undefined) return requestRoomBlock;
  return eventStatusCode === blockedEventStatus;
};

export const canEventBeBlocked = (eventCode: string) => {
  return eventCode !== EVENT_TYPE_DEPARTMENT_NOTES;
};

type LookUpMap = Record<string | number, string>;

export const createValueFormatters = <
  T extends Record<string, LookUpMap | undefined>,
>(
  maps: T,
) => {
  const result: Record<string, (params: ValueFormatterParams) => string> = {};

  (Object.keys(maps) as Array<keyof T>).forEach((key) => {
    const map = maps[key];
    if (!map) return;
    const formatterKey = `${key as string}Formatter`;

    result[formatterKey] = ({ value }: ValueFormatterParams) => {
      if (value == null) return "";
      return map[value] ?? value;
    };
  });

  return result as {
    [K in keyof T as `${K & string}Formatter`]: (
      params: ValueFormatterParams,
    ) => string;
  };
};

export const calculateRevenueSum = (
  keys: Array<string> = [],
  data: Record<string, any>,
) => {
  const dataList = keys?.map((key) => data[key] ?? 0);
  return BigNumber.sum(...dataList).toFormat();
};

export const getterRevenueCurrentSum = (props: ValueGetterParams) => {
  const dataObj = props.data?.currentRevenue || {};
  const dataList: Array<number> = Object.values(dataObj) || [];
  return BigNumber.sum(...[0, ...dataList]).toFormat() + zeroWidthSpace;
};

export const getterOrderRevenueCurrentSum = (props: ValueGetterParams) => {
  return calculateRevenueSum(EventRevenueCurrentKeys, props.data);
};

export const calculateMeatballTranslate = () => {
  const viewportList = document.querySelectorAll(
    ".ag-body-horizontal-scroll-viewport",
  );
  if (viewportList.length <= 1) return 0;
  const viewport = viewportList[viewportList.length - 1];
  const { scrollLeft, scrollWidth, clientWidth } = viewport as HTMLElement;
  return scrollWidth - clientWidth - scrollLeft;
};

export const sortNodesByRules = <T extends Record<string, any>>(
  rowNodes: IRowNode<T>[],
  rules: readonly { key: keyof T; type: "date" | "number" }[],
) => {
  if (!rowNodes || rowNodes.length === 0) return;

  rowNodes.sort((aNode, bNode) => {
    for (const rule of rules) {
      const { key, type } = rule;
      const aVal = aNode.data?.[key];
      const bVal = bNode.data?.[key];

      if (aVal === undefined || aVal === null) {
        if (bVal === undefined || bVal === null) continue;
        return -1;
      }
      if (bVal === undefined || bVal === null) return 1;

      let comparison = 0;

      if (type === "date") {
        const aTime = dayjs(aVal).valueOf();
        const bTime = dayjs(bVal).valueOf();
        comparison = aTime - bTime;
      } else if (type === "number") {
        const aNum = Number(aVal);
        const bNum = Number(bVal);
        comparison = aNum - bNum;
      }

      if (comparison !== 0) {
        return comparison;
      }
    }
    return 0;
  });
};

export function postSortRows<T extends EventProps | EventOrderProps>(
  { api, nodes }: PostSortRowsParams<T>,
  rules: readonly {
    key: keyof T;
    type: "date" | "number";
  }[],
) {
  const hasSort = api.getColumnState().some((col) => col.sort);
  if (!hasSort) {
    sortNodesByRules(nodes, rules);
  }
}

export const isDepartmentNotesEvent = (eventCode: string) =>
  eventCode === EVENT_TYPE_DEPARTMENT_NOTES;

export const getEventRowId = (params: GetRowIdParams) =>
  getEventRowKey(params.data);

export const getOrderRowId = (params: GetRowIdParams) =>
  getOrderRowKey(params.data);

export const getItemRowId = (params: GetRowIdParams) =>
  getItemRowKey(params.data);

export const getEventRowKey = (data: EventProps) =>
  `${EventRowKeyPrefix}${data?.eventNumber || data?.id}`;

export const getOrderRowKey = (data: EventOrderProps) =>
  `${OrderRowKeyPrefix}${data?.eventOrderNumber || data?.id}`;

export const getItemRowKey = (data: EventOrderItemProps) =>
  `${ItemRowKeyPrefix}${data?.eventOrderItemSid || data?.id}`;

export const isEventRowMaster = (dataItem: EventProps) => {
  return dataItem && dataItem.eventOrders
    ? dataItem.eventOrders.length > 0
    : false;
};

export const isEventOrderRowMaster = (dataItem: EventOrderProps) => {
  return dataItem && dataItem.items ? dataItem.items.length > 0 : false;
};

export const ItemSelectionColumnDef: SelectionColumnDef = {
  sortable: false,
  width: 48,
  cellStyle: {
    textAlign: "center",
    paddingLeft: "16px",
    paddingRight: "16px",
    border: "none",
    outline: "none",
  },
  headerStyle: {
    paddingLeft: "16px",
    paddingRight: "16px",
  },
  suppressNavigable: true,
};

export const GroupSelectionColumnDef: SelectionColumnDef = {
  ...ItemSelectionColumnDef,
  width: 64,
  cellRenderer: "agGroupCellRenderer",
  pinned: "left",
  cellRendererParams: {
    suppressDoubleClickExpand: true,
  },
};

export const EventSelectionColumnDef: SelectionColumnDef = {
  ...GroupSelectionColumnDef,
  headerClass: "event-selection",
};

export const rowSelection: RowSelectionOptions = {
  mode: "multiRow",
  headerCheckbox: true,
  selectAll: "filtered",
};

export const moneyFormatter = ({ value }: ValueFormatterParams) => {
  return formatAmount(value);
};

export const createArrayValueFormatter = (data: any) => {
  return ({ value = [] }: ValueFormatterParams) => {
    const list = value.map((i: string | number) => data[i]);
    return list.join(", ");
  };
};

export const calculateRowHeightNoChildren = (
  data: EventProps | EventOrderProps,
) => {
  const list = "eventOrders" in data ? data.eventOrders : data.items;
  const { rowHeight, headerHeight } = AgGridThemeOptions;
  const allDetailRowHeight = (list?.length ?? 0) * rowHeight;

  return allDetailRowHeight + headerHeight + 2;
};

export const updateRowInList = (
  list: Array<any>,
  newData: object,
  getKey: (value: any) => string,
) => {
  const newList = [...list];
  const index = newList.findIndex((item) => getKey(item) === getKey(newData));
  if (index !== -1) {
    newList[index] = newData;
  }
  return newList;
};

export const syncItemServeTimeWhenOrderChange = (
  old_order: EventOrderProps,
  new_order: EventOrderProps,
) => {
  if (!old_order) return new_order;
  if (old_order.startDateTime !== new_order.startDateTime) {
    new_order.items = new_order.items?.map((i) => {
      i.serveDtTm =
        i.serveDtTm === old_order.startDateTime
          ? new_order.startDateTime
          : i.serveDtTm;
      return { ...i };
    });
  }
  return { ...old_order, ...new_order };
};

export const syncItemAttendanceWhenOrderChange = (
  old_order: EventOrderProps,
  new_order: EventOrderProps,
) => {
  if (!old_order) return new_order;
  if (old_order.attendanceEstimate !== new_order.attendanceEstimate) {
    new_order.items = new_order.items?.map((i) => {
      i.quantityOrdered =
        i.quantityOrdered === old_order.attendanceEstimate
          ? new_order.attendanceEstimate
          : i.quantityOrdered;
      return { ...i };
    });
  }
  return { ...old_order, ...new_order };
};

export const syncItemGuaranteeWhenOrderChange = (
  old_order: EventOrderProps,
  new_order: EventOrderProps,
) => {
  if (!old_order) return new_order;
  if (old_order.attendanceGuarantee !== new_order.attendanceGuarantee) {
    new_order.items = new_order.items?.map((i) => {
      i.quantityGuaranteed =
        i.quantityGuaranteed === old_order.attendanceGuarantee
          ? new_order.attendanceGuarantee
          : i.quantityGuaranteed;
      return { ...i };
    });
  }
  return { ...old_order, ...new_order };
};

export const syncOrderTimeWhenEventChange = (
  old_event: EventProps,
  new_event: EventProps,
) => {
  if (!old_event) return new_event;
  if (old_event.eventDate !== new_event.eventDate) {
    new_event.eventOrders = old_event.eventOrders?.map((order) => {
      syncEventsCopiedDateTime(new_event.eventDate, order, [
        "endDateTime",
        "startDateTime",
      ]);
      order.items?.map((item) => {
        syncEventsCopiedDateTime(new_event.eventDate, item, ["serveDtTm"]);
      });
      return { ...order };
    });
  }
  if (old_event.startDateTime !== new_event.startDateTime) {
    new_event.eventOrders = old_event.eventOrders?.map((order) => {
      const originData = { ...order };
      order.startDateTime =
        order.startDateTime === old_event.startDateTime
          ? new_event.startDateTime
          : order.startDateTime;
      return syncItemServeTimeWhenOrderChange(originData, order);
    });
  }
  if (old_event.endDateTime !== new_event.endDateTime) {
    new_event.eventOrders = old_event.eventOrders?.map((order) => {
      const originData = { ...order };
      order.endDateTime =
        order.endDateTime === old_event.endDateTime
          ? new_event.endDateTime
          : order.endDateTime;
      return syncItemServeTimeWhenOrderChange(originData, order);
    });
  }
  return { ...old_event, ...new_event };
};

export function syncEventsCopiedDateTime<T extends object>(
  date: string,
  obj: T,
  keys: Array<keyof T>,
) {
  for (const key of keys) {
    if (obj[key]) {
      obj[key] = syncCopiedDatetime(date, obj[key] as string) as T[keyof T];
      if (key === "endDateTime" || key === "serveDtTm") {
        obj[key] = syncEndDateTime(obj[key] as string) as T[keyof T];
      }
    }
  }
}

export function tooltipValueGetter(props: ITooltipParams) {
  const colDef = props.colDef as ColDef;
  const field = colDef?.field as keyof GridEventProps;
  if (!field) return props.valueFormatted || props.value;

  const errorMessage = props.data?.errors?.[field];
  return errorMessage || props.valueFormatted || props.value;
}

export const isBookingReadonly = () => {
  return (
    useBookingStore.getState().bookingInfo?.status === BookingStatus.Actual
  );
};

export const isEventReadonly = (event: GridEventProps) => {
  return isBookingReadonly() || isPastDate(event.eventDate);
};

export function getEditable(params: EditableCallbackParams) {
  const { node, data, context } = params;
  if (node.id?.includes(EventRowKeyPrefix)) {
    return !isEventReadonly(data);
  }
  if (node.id?.includes(OrderRowKeyPrefix)) {
    return !data?.isReadOnly;
  }

  return !context.readonly;
}
