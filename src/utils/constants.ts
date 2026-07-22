import { QueryCache, type QueryClientConfig } from "@tanstack/react-query";
import { ApiError, isUnauthorizedError } from "./apiErrors";
import { redirectLogin } from "./common";

export const SERVICE_NOW_URL =
  "https://hyatt.service-now.com/com.glideapp.servicecatalog_cat_item_view.do?sysparm_id=48aeadc6ddc819002c6911b513717b2b&sysparm_stack=no";

export const FieldEmptyDefaultContent = `-`;

export type BrowserType =
  | { reg: RegExp; name: string; match: RegExp }
  | undefined;

export const browserClass: Array<BrowserType> = [
  {
    reg: /trident|msie/,
    name: "IE",
    match: /(trident|msie\s)\/[\d.]+/gi,
  },
  {
    reg: /edg/,
    name: "Edge",
    match: /(edge|edg)\/[\d.]+/gi,
  },
  {
    reg: /firefox/,
    name: "Firefox",
    match: /firefox\/[\d.]+/gi,
  },
  {
    reg: /opr/,
    name: "Opera",
    match: /opr\/[\d.]+/gi,
  },
  {
    reg: /^(?=.*safari)(?!.*chrome).*$/gi,
    name: "Safari",
    match: /safari\/[\d.]+/gi,
  },
  {
    reg: /chrome/,
    name: "Chrome",
    match: /chrome\/[\d.]+/gi,
  },
];

export const tanstackQueryDefaultOptions: QueryClientConfig = {
  queryCache: new QueryCache({
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        redirectLogin();
      }
    },
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      experimental_prefetchInRender: true,
      gcTime: 30 * 60 * 1000,
      staleTime: 5 * 60 * 1000,
      retry: (failureCount: number, error: unknown) => {
        // Don't retry client errors (4xx)
        if (
          error instanceof ApiError &&
          error.status >= 400 &&
          error.status < 500
        ) {
          return false;
        }
        return failureCount < 3;
      },
      enabled: true,
    },
    mutations: {
      retry: 0,
      onError: (error: unknown) => {
        if (isUnauthorizedError(error)) {
          redirectLogin();
        }
      },
    },
  },
};

export const lookupQueryOptions = {
  staleTime: Infinity,
  gcTime: Infinity,
};

export const StatusType = {
  Success: "success",
  Info: "info",
  Warning: "warning",
  Error: "error",
  Default: "default",
  SuccessLight: "success-light",
};

export const eventStatusType = {
  NA: StatusType.Info,
  UR: StatusType.Info,
  QQ: StatusType.Default,
  "XX-S": StatusType.SuccessLight,
};

export const SimpleThemeOptions = {
  headerHeight: 48,
  rowHeight: 48,
  headerBackgroundColor: "#F6FAFD",
  foregroundColor: "#282828",
  borderColor: "#DDDDDD",
  fontFamily: "inherit",
};

export const AgGridThemeOptions = {
  headerHeight: 48,
  rowHeight: 33, //weired,  set height to 33px, the real height is 32px
  headerBackgroundColor: "#F6FAFD",
  borderColor: "#EDEDED",
  fontFamily: "inherit",
  statusBarLabelFontWeight: 400,
  statusBarValueFontWeight: 700,
  widgetContainerVerticalPadding: 5.5,
  checkboxCheckedBackgroundColor: "#0072CE",
  rowHoverColor: "#F6FAFD",
  selectedRowBackgroundColor: "#F1F9FF",
  fontSize: 13,
  foregroundColor: "#282828",
  headerFontSize: 14,
  headerFontWeight: 600,
  checkboxCheckedShapeImage: {
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="10" viewBox="0 0 13 10" fill="none"><path d="M0 4.8175L4.4445 9.262L12.444 1.262L11.191 0L4.4445 6.7465L1.253 3.5645L0 4.8175Z" fill="white"/></svg>',
  },
  checkboxUncheckedBorderColor: "#929292",
  listItemHeight: 40,
  findMatchBackgroundColor: "#F8AB0066",
  cellEditingBorder: false,
  cellEditingShadow: "none",
  inputBorder: "1px solid #BABFC7",
  inputFocusBorder: "1px solid #2196F3",
  inputBorderRadius: 6,
  inputFocusShadow: "none",
  tooltipBackgroundColor: "#282828",
  tooltipTextColor: "#FFFFFF",
  tooltipBorder: false,
  tooltipErrorBackgroundColor: "#282828",
  tooltipErrorBorder: false,
  tooltipErrorTextColor: "#FFFFFF",
  focusShadow: "none",
};

export const EVENT_TYPE_DEPARTMENT_NOTES = "D1";
export const EVENT_ORDER_TYPE_DEPARTMENT_NOTES = 1;
export const EVENT_ORDER_TYPE_RESUME = 115;

export const REQUIRED_WHEN_BLOCKED = [
  "startDateTime",
  "endDateTime",
  "functionRoomCode",
  "setupCode",
  "eventCode",
] as const;

export const EVENT_ACTION_TYPE = {
  CREATE: "create",
  EDIT: "edit",
  VIEW: "view",
};

export const FUNCTION_ROOM_STATUS = {
  AV: "AV",
  TC: "TC",
  PC: "PC",
};

export const EVENT_ORDER_RULES = [
  { key: "startDateTime", type: "date" },
  { key: "endDateTime", type: "date" },
  { key: "eventOrderNumber", type: "number" },
] as const;

export const EVENT_RULES = [
  { key: "eventDate", type: "date" },
  { key: "startDateTime", type: "date" },
  { key: "eventNumber", type: "number" },
] as const;

export const TENDER_CODE = {
  BANQUET_CHECK: 1,
  NA: 6,
};

export const DAY_START_TIME = "04:00";
export const DAY_END_TIME = "03:59";

export const NodeLevelMap = {
  Event: 1,
  Order: 2,
  Item: 3,
};

export const zeroWidthSpace = "\u200B";

export const ItemDisplayNameMaxLength = 100;

export const ignoreDirtyField = ["displayAlternative", "additionalLanguages"];
export const EOPreviewBaseUrl = "/detailing/api/reports/DDR.rptdesign";
export const EO_REPORT_URL_IDENTITY = {
  dynamicGrouping: 4,
  reportTitle: "Event Order Report",
  reportType: 3,
} as const;
