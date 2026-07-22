import type {
  EventOrderItemProps,
  ItemNamesProps,
  LanguageProps,
} from "@/types/booking.types";
import type { ValueFormatterParams } from "ag-grid-community";
import { formatToTime } from "@/utils/dateHelpers";

export const uomFieldName = {
  label: "description",
  value: "pricePointLookupSid",
};

export const sectionFieldName = {
  label: "description",
  value: "sectionLookupSid",
};

export const languageFieldName = {
  label: "englishDescription",
  value: "languageLookupSid",
};

export const defaultLanguageId = 1;

export const transformItemNamesToStandard = (
  items: EventOrderItemProps,
  languageList: Array<LanguageProps>,
) => {
  if (languageList.length !== items.itemNames?.length) {
    const newList: Array<ItemNamesProps> = [];
    languageList.forEach((lang) => {
      const target = items.itemNames.find(
        (i) => i.languageLookupSid === lang.languageLookupSid,
      );
      newList.push(
        target ?? {
          languageLookupSid: lang.languageLookupSid,
          displayDescription: "",
          description: items?.itemNames?.[0]?.description ?? "",
          comment: "",
        },
      );
    });
    return newList;
  }
  return items.itemNames;
};

export const transformOriginDataToEditViewData = (
  items: EventOrderItemProps,
  languageList: Array<LanguageProps>,
  isReadOnly: boolean,
) => {
  const defaultValues = { ...items };
  if (defaultValues.serveDtTm) {
    defaultValues.serveDtTm = formatToTime(defaultValues.serveDtTm);
  }
  defaultValues.itemNames = transformItemNamesToStandard(items, languageList);
  defaultValues.additionalLanguages = isReadOnly;
  return defaultValues;
};

export const getAddDefaultLangId = (languageList: Array<LanguageProps>) => {
  const tagetIndex = languageList.findIndex(
    (i) => i.languageLookupSid === defaultLanguageId,
  );
  return tagetIndex > -1
    ? defaultLanguageId
    : (languageList?.[0]?.languageLookupSid ?? defaultLanguageId);
};

export const getModalDefaultLangIndex = (
  items: EventOrderItemProps,
  languageList: Array<LanguageProps>,
) => {
  const defaultLangId =
    getGridLangItem(items)?.languageLookupSid ?? defaultLanguageId;
  const newItems = transformItemNamesToStandard(items, languageList);
  const index = newItems.findIndex(
    (i) => i.languageLookupSid === defaultLangId,
  );
  return index > -1 ? index : 0;
};

export const getGridLangIndex = (items: EventOrderItemProps) => {
  const list: ItemNamesProps[] = items?.itemNames ?? [];
  const index = list.findIndex(
    (i) => i.languageLookupSid === defaultLanguageId,
  );
  return index > -1 ? index : 0;
};

export const getGridLangItem = (items: EventOrderItemProps) => {
  const index: number = getGridLangIndex(items);
  return items?.itemNames?.[index];
};

export const formatItemName = (params: ValueFormatterParams) => {
  const item = getGridLangItem(params.data) as ItemNamesProps;
  return item?.displayDescription ?? "";
};

export const formatItemDesc = (params: ValueFormatterParams) => {
  const item = getGridLangItem(params.data) as ItemNamesProps;
  return item?.comment;
};
