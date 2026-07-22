import BigNumber from "bignumber.js";
import { isBoolean, isString } from "lodash-es";
import i18n from "@/i18n";
export const redirectLogin = () => {
  window.location.href = `/oauth2/authorization/entra-id?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`;
};

export const noop = () => {};
export const noopStr = () => "";

// Get the scroll parent element of an element
export const getScrollParents = (element: HTMLDivElement) => {
  const parents = [];
  let current = element.parentElement;

  while (current) {
    const style = window.getComputedStyle(current);
    const overflow = style.overflow + style.overflowY + style.overflowX;

    if (/(auto|scroll|overlay)/.test(overflow)) {
      parents.push(current);
    }

    current = current.parentElement;
  }

  parents.push(window);
  return parents;
};

export const getDefaultContainer = () => document.body;

export const compareFun = (valueA: string, valueB: string) => {
  if (valueA === valueB) return 0;
  return valueA > valueB ? 1 : -1;
};

export const toBoolean = (value: unknown) => {
  if (isBoolean(value)) return value;
  if (isString(value)) return value.toLocaleLowerCase() === "true";
  return Boolean(value);
};

export const formatAmount = (
  value: number | string,
  locale: string = i18n.language || "en-US",
  decimals: number = 2,
): string => {
  const safeDec = Math.min(20, Math.max(0, Math.floor(decimals)));
  const fmt = (num: number) =>
    num.toLocaleString(locale, {
      minimumFractionDigits: safeDec,
      maximumFractionDigits: safeDec,
    });

  if (value === null || value === undefined || value === "") {
    return fmt(0);
  }
  const num = new BigNumber(value);

  if (!num.isFinite()) {
    return fmt(0);
  }

  return fmt(num.toNumber());
};
