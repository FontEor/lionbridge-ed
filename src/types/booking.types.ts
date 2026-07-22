/* eslint-disable @typescript-eslint/no-explicit-any */
export type Empty = { [key: string]: never };

export interface FullName {
  firstName: string;
  lastName: string;
}

export type Employee = FullName;

export type Contact = FullName & {
  email: string;
  phone: string;
};

export interface BookingEventParams {
  propertyCode?: string;
  bookingNumber?: number;
}

export interface BookingProps {
  arrivalDate: string;
  departureDate: string;
  salesManager: Employee;
  eventManager: Employee;
  mainContact: Contact;
  org: {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zipcode: string;
    country: string;
  };
  onSiteContact: Contact;
  postingMasters: Array<{ postingMaster: string; isPrimary: boolean }>;
  postAsName: string;
  bookingNumber: number;
  status: string;
  type: string;
  alternatePostAsName: string;
  propertyNumber: number;
  propertyCode: string;
  currencyCode: string;
}

export interface ReportProps {
  reportName: string;
  reportTemplateName?: string;
  reportShortName?: string;
  languageLookupSid?: number;
  reportSort?: number;
}

export interface EventOrderProps {
  id?: number | string;
  eventOrderID?: number;
  eventOrderNumber?: number;
  eventNumber?: number;
  startDateTime: string;
  endDateTime: string;
  postAsName: string | null;
  alternatePostAs: string | null;
  readerBoardIndicator: boolean;
  eventOrderTypeCode: string;
  stampIds?: number[];
  attendanceEstimate: number;
  attendanceGuarantee: number;
  attendanceSet: number;
  finalDetailedIndicator: boolean | null;
  tenderTypeCode: number;
  diagramUrl?: string;
  isReadOnly?: boolean;
  items?: EventOrderItemProps[];
}

export interface ItemNamesProps {
  languageLookupSid: number;
  description?: string;
  displayDescription?: string;
  comment?: string;
  eoiItemNameLangMapSid?: number;
}

export interface EventOrderItemProps {
  id?: number | string;
  eventOrderItemSid?: number;
  eventOrderId?: number;
  serveDtTm: string;
  itemNames: ItemNamesProps[];
  itemPrice: number;
  quantityOrdered: number;
  quantityGuaranteed: number;
  topicSids: number[];
  display: boolean;
  displayQuantity: boolean;
  sectionLookupSid: number;
  pricePointLookupSid: number;
  additionalLanguages?: boolean;
}

export interface EventRevenueProps {
  beverage: number | null;
  engineering: number | null;
  food: number | null;
  other: number | null;
  pride: number | null;
  room: number | null;
  technology: number | null;
}

export interface RevenueProps {
  blendedFoodRevenue: number | null;
  blendedBeverageRevenue: number | null;
  blendedTechRevenue: number | null;
  blendedEngineeringRevenue: number | null;
  blendedOtherRevenue: number | null;
  blendedPrideRevenue: number | null;
  blendedRoomRevenue: number | null;
  currentBeverageRevenue: number | null;
  currentEngineeringRevenue: number | null;
  currentFoodRevenue: number | null;
  currentOtherRevenue: number | null;
  currentPrideRevenue: number | null;
  currentRoomRentalRevenue: number | null;
  currentTechnologyRevenue: number | null;
  forecastAverageFoodRevenue: number | null;
  forecastAverageBeverageRevenue: number | null;
  forecastTechRevenue: number | null;
  forecastEngineeringRevenue: number | null;
  forecastOtherRevenue: number | null;
  forecastPrideRevenue: number | null;
  forecastRoomRevenue: number | null;
}

export interface EventProps extends RevenueProps {
  eventNumber?: number;
  attendance: number;
  propertyNumber: number;
  bookingNumber: number;
  eventStatusCode: string;
  eventName: string;
  postAsName: string | null;
  alternatePostAs: string | null;
  eventCode: string;
  setupCode: string;
  eventDate: string;
  firstDateTime: string;
  setupDateTime: string;
  startDateTime: string;
  endDateTime: string;
  dismantleDateTime: string;
  lastDateTime: string;
  functionRoomCode: string;
  stVenueId: string;
  holdFromIndicator: boolean;
  holdOverIndicator: boolean;
  readerBoardIndicator: boolean;
  diagram: boolean;
  requestRoomBlock?: boolean;
  forecastNumberAttendees: number | null;
  definiteNumberAttendees: number | null;
  enteredDateTime: string;
  lastUpdateDateTime: string;
  setupMins: number;
  dismantleMins: number;
  id?: number | string;
  dirty?: boolean;
  eventOrders: EventOrderProps[];
  actualRevenue: EventRevenueProps;
  currentRevenue: EventRevenueProps;
  firstDefiniteRevenue: EventRevenueProps;
}

export interface GridEventProps extends EventProps {
  dirty?: boolean;
  errors?: Record<keyof EventProps, string> | null;
  warnings?: Record<keyof EventProps, string> | null;
}

export interface EventStatusProps {
  eventStatusCode: string;
  eventStatus: string;
}
export interface FunctionRoom {
  roomCode: string;
  roomName: string;
  roomStatusCode: string;
  maintainanceStartDate: string | null;
  maintainanceEndDate: string | null;
  alternateRoomName: string;
  fireCodeMax: number | null;
  setupType: {
    setupCode: string;
    maxSeat: number | null;
  }[];
}
export interface EventTypeItem {
  eventTypeCode: string;
  eventType: string;
}
export interface EventSetupItem {
  setupTypeCode: string;
  setupType: string;
}
export interface EventOrderStampItem {
  eventOrderStampCode: string;
  eventOrderStampLookupSid: string | number;
  description: string;
}
export interface EventOrderTypeItem {
  eventOrderTypeLookupSid: number;
  description: string;
  isFoodBeverage: boolean;
}
export interface EventOrderTenderItem {
  tenderTypeLookupSid: number;
  description: string;
}

export interface CreateEditEventParams extends RevenueProps {
  requestRoomBlock: boolean;
  postAsName: string;
  eventCode: string;
  displayAlternative?: boolean;
  readerBoardIndicator: boolean;
  eventDate: string;
  alternatePostAs: string;
  startDateTime: string | null;
  endDateTime: string | null;
  eventNumber?: number | null;
  setupCode: string;
  attendance: number;
  setupMins: number;
  dismantleMins: number;
  functionRoomCode: string;
  holdFromIndicator: boolean;
  holdOverIndicator: boolean;
  eventStatusCode?: string;
  optionCode?: string;
  actualRevenue: EventRevenueProps | null;
  currentRevenue: EventRevenueProps;
}

export interface CreateEditEventOrderParams {
  eventOrderNumber?: number;
  eventOrderID?: number;
  id?: number | string;
  eventOrderTypeCode: number;
  mealPeriod?: string;
  tenderTypeCode: number;
  stampIds?: number[];
  postAsName: string;
  alternatePostAs?: string;
  readerBoardIndicator?: boolean;
  startDateTime?: string;
  endDateTime?: string;
  attendanceEstimate: number;
  attendanceGuarantee?: number;
  attendanceSet?: number;
  finalDetailedIndicator: boolean;
  isReadOnly?: boolean;
  revisedAverageFoodRevenue?: number;
  revisedAverageBeverageRevenue?: number;
  revisedTechnologyRevenue?: number;
  revisedEngineeringRevenue?: number;
  revisedOtherRevenue?: number;
  revisedPrideRevenue?: number;
  revisedRoomRentalRevenue?: number;
}

export interface AverageCheckItem {
  averageFoodRevenue: number;
  averageBeverageRevenue: number;
}

export interface MealPeriodItem {
  eventOrderTypeSid: number;
  description: string;
}

export interface CatalogSectionItem {
  sectionLookupSid: number;
  description: string;
}

export interface CatalogUnitOfMeasureItem {
  pricePointLookupSid: number;
  description: string;
}

interface ItemPrice {
  pricePointLookupSid: number;
  currencyLookupSid: number;
  standardPrice: number;
  standardCost: number | null;
  priceStartDt: string;
  priceEndDt: string | null;
}

export interface CatalogItem {
  itemSid: number;
  itemNameSid: number;
  itemName: string;
  description: string;
  catalogTypeCode: number;
  sectionCode: number;
  displayName: string;
  itemPrice: ItemPrice;
}

export interface topicItem {
  itemTopicLookupSid: number;
  itemTopicCode: string;
  description: string;
  sequenceNum: number;
}
export interface GetCatalogItemsParams {
  propertyCode?: string;
  itemName?: string;
  sectionCode?: number[];
  catalogTypeCode?: number[];
  pricePointCode?: number[];
  topics?: topicItem[];
}

export interface CatalogTypeItem {
  catalogTypeLookupSid: number;
  description: string;
}

export interface TopicProps {
  itemTopicLookupSid: number;
  itemTopicCode: string;
  description: string;
  sequenceNum: number;
}

export interface LanguageProps {
  languageLookupSid: number;
  englishDescription: string;
  description: string;
  sequenceNum: number;
}

export interface EOReportParams {
  propertyNum: number;
  eoNumber: number;
  labelLanguageLookupSid: number;
  languageLookupSid: number;
  dynamicGrouping: number;
  reportTitle: string;
  reportType: number;
}

export interface ChangeLogProps {
  eventOrderChangeLogSid: number;
  changeLog: string;
  employeeName: string;
  hotelName: string;
  createdDateTime: string;
}

export interface ChangeLogUpdateParamsProps {
  eventOrderChangeLogSid?: number;
  changeLog: string;
}
