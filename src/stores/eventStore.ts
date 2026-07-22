/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  EventOrderProps,
  EventProps,
  EventOrderItemProps,
} from "@/types/booking.types";
import { createSelectorHooks } from "auto-zustand-selectors-hook";
import { create } from "zustand";

interface selectedEventOrders {
  [key: string]: EventOrderProps[];
}

interface selectedItemsProps {
  rowKey: string;
  data: EventOrderItemProps;
  orderRowKey: string;
  eventRowKey: string;
  level: number;
}

interface EventStoreState {
  selectedEvents: EventProps[];
  setSelectedEvents: (value: EventProps[]) => void;
  selectedEventOrders: selectedEventOrders;
  setSelectedEventOrders: (rowKey: string, value: EventOrderProps[]) => void;
  selectedItems: Map<string, selectedItemsProps>;
  setSelectedItems: (
    rowKey: string,
    value: selectedItemsProps,
    selected: boolean,
  ) => void;
  clearSelectedItems: () => void;
  quickFilterText: string;
  setQuickFilterText: (value: string) => void;
  isSortActive: boolean;
  setIsSortActive: (value: boolean) => void;
  isFilterActive: boolean;
  setIsFilterActive: (value: boolean) => void;
  resetEventStore: () => void;
  isSaving: boolean;
  setIsSaving: (isSaving: boolean) => void;
  isDirty: boolean;
  setIsDirty: (value: boolean) => void;
  isEventDrawerDirty: boolean;
  setIsEventDrawerDirty: (value: boolean) => void;
  clearSelectedOrders: () => void;
  orderMeatballTranslateX: number;
  setOrderMeatballTranslateX: (value: number) => void;
  currentEditingRow:
    | EventProps
    | EventOrderItemProps
    | EventOrderProps
    | object
    | null;
  setCurrentEditingRow: (
    value: EventProps | EventOrderItemProps | EventOrderProps | null,
  ) => void;
  isCopyOrder: boolean;
  setIsCopyOrder: (value: boolean) => void;
  isCopyItem: boolean;
  setIsCopyItem: (value: boolean) => void;
  isMixedSelect: boolean;
}

const initialState = {
  selectedEvents: [],
  selectedEventOrders: {},
  selectedItems: new Map(),
  quickFilterText: "",
  isSortActive: false,
  isDirty: false,
  isFilterActive: false,
  isSaving: false,
  isEventDrawerDirty: false,
  orderMeatballTranslateX: 0,
  currentEditingRow: null,
  isMixedSelect: false,
  isCopyItem: false,
};

export const useEventStore = createSelectorHooks(
  create<EventStoreState>((set) => ({
    ...initialState,
    setSelectedEvents: (selectedEvents) => set({ selectedEvents }),
    setSelectedEventOrders: (rowKey, selectedOrders) =>
      set((state) => {
        const newSelectedEventOrders = { ...state.selectedEventOrders };
        if (selectedOrders.length === 0) {
          delete newSelectedEventOrders[rowKey];
        } else {
          newSelectedEventOrders[rowKey] = selectedOrders;
        }
        return { selectedEventOrders: newSelectedEventOrders };
      }),
    clearSelectedOrders: () =>
      set(() => {
        return { selectedEventOrders: {} };
      }),
    setSelectedItems: (rowKey, item, selected) =>
      set((state) => {
        if (selected) {
          if (state.selectedItems.has(rowKey)) {
            return { selectedItems: state.selectedItems };
          } else {
            const newSelected = new Map(state.selectedItems);
            newSelected.set(rowKey, item);
            return { selectedItems: newSelected };
          }
        } else {
          const newSelected = new Map(state.selectedItems);
          newSelected.delete(rowKey);
          return { selectedItems: newSelected };
        }
      }),
    clearSelectedItems: () =>
      set(() => {
        return { selectedItems: new Map() };
      }),
    setQuickFilterText: (value) => set({ quickFilterText: value }),
    setIsSortActive: (value) => set({ isSortActive: value }),
    setIsDirty: (isDirty) => set({ isDirty }),
    setIsFilterActive: (value) => set({ isFilterActive: value }),
    resetEventStore: () => {
      set({ ...initialState });
    },
    setIsSaving: (isSaving) => set({ isSaving }),
    setIsEventDrawerDirty: (isEventDrawerDirty) => set({ isEventDrawerDirty }),
    setOrderMeatballTranslateX: (orderMeatballTranslateX) =>
      set({ orderMeatballTranslateX }),
    setCurrentEditingRow: (value) => set({ currentEditingRow: value }),
    isCopyOrder: false,
    setIsCopyOrder: (isCopyOrder) => set({ isCopyOrder }),
    isCopyItem: false,
    setIsCopyItem: (isCopyItem) => set({ isCopyItem }),
  })),
);
