import { useState, useMemo } from "react";
import Button from "@/components/Button";
import { Close, Copy, Edit } from "@/components/Icons";
import type { EventOrderItemProps, GridEventProps } from "@/types/index";
import { EVENT_ACTION_TYPE } from "@/utils/constants";
import type { AgGridReact } from "ag-grid-react";
import { useCallback, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import OrderItemDrawer from "./OrderItemDrawer";
import { type DefaultValues } from "react-hook-form";
import {
  transformOriginDataToEditViewData,
  getModalDefaultLangIndex,
} from "@/utils/itemModalUtils";
import { useEventStore } from "@/stores/eventStore";
import { useEventOrderData } from "@/hooks/useEvents";
import useGridUpdate from "@/hooks/useGridUpdate";
import {
  useClearGridSelections,
  useIsMixedSelect,
  useRedrawSelectedItems,
} from "@/hooks/useGridSelect";

export interface EditEventOrderActionBarProps {
  gridRef: RefObject<AgGridReact<GridEventProps> | null>;
}

export default function ItemActionBar({
  gridRef,
}: EditEventOrderActionBarProps) {
  const { t } = useTranslation();
  const [openItemDrawer, setOpenItemDrawer] = useState(false);
  const clearGridSelections = useClearGridSelections();
  const selectedItems = useEventStore.useSelectedItems();
  const setIsCopyItem = useEventStore.useSetIsCopyItem();
  const redrawSelectedItems = useRedrawSelectedItems();
  const { getEventOrderItemData } = useGridUpdate();
  const isMixedSelect = useIsMixedSelect();
  const { languages: { list: languageList } = { list: [] } } =
    useEventOrderData();

  const handleCloseItemDrawer = useCallback(() => {
    setOpenItemDrawer(false);
  }, []);

  const getEditDefaultValues = useCallback(async () => {
    const selectItem = selectedItems.values().next().value!;
    const { item, order } = getEventOrderItemData(
      selectItem.rowKey,
      selectItem.orderRowKey,
      selectItem.eventRowKey,
    );
    return transformOriginDataToEditViewData(
      item,
      languageList,
      order!.isReadOnly!,
    );
  }, [selectedItems, languageList, getEventOrderItemData]);

  const getLangIndexValues = useCallback(() => {
    const selectItem = selectedItems.values().next().value!;
    const { item } = getEventOrderItemData(
      selectItem.rowKey,
      selectItem.orderRowKey,
      selectItem.eventRowKey,
    );
    return getModalDefaultLangIndex(item, languageList);
  }, [languageList, selectedItems, getEventOrderItemData]);

  const getEditType = useCallback(() => {
    const selectItem = selectedItems.values().next().value!;
    const { order } = getEventOrderItemData(
      selectItem.rowKey,
      selectItem.orderRowKey,
      selectItem.eventRowKey,
    );
    return order?.isReadOnly ? EVENT_ACTION_TYPE.VIEW : EVENT_ACTION_TYPE.EDIT;
  }, [selectedItems, getEventOrderItemData]);

  const EditItemDrawer = useMemo(() => {
    return selectedItems.size === 1 ? (
      <OrderItemDrawer
        open={openItemDrawer}
        onClose={handleCloseItemDrawer}
        type={getEditType()}
        defaultValues={
          getEditDefaultValues as DefaultValues<EventOrderItemProps>
        }
        langIndex={getLangIndexValues()}
        gridRef={gridRef}
      />
    ) : (
      <></>
    );
  }, [
    openItemDrawer,
    handleCloseItemDrawer,
    getEditDefaultValues,
    gridRef,
    selectedItems.size,
    getLangIndexValues,
    getEditType,
  ]);

  return (
    <>
      <div className="flex items-center gap-6 max-md:gap-4">
        {selectedItems.size === 1 ? (
          <Button
            variant="tertiary"
            size="small"
            className="truncate px-0 text-white"
            startIcon={<Edit className="size-5.5" />}
            onClick={() => {
              setOpenItemDrawer(true);
            }}
          >
            {t("button.edit")}/{t("label.view")}
          </Button>
        ) : null}
        {!isMixedSelect && (
          <Button
            variant="tertiary"
            size="small"
            className="truncate px-0 text-white"
            startIcon={<Copy />}
            onClick={() => {
              setIsCopyItem(true);
              redrawSelectedItems();
            }}
          >
            {t("button.copy")}
          </Button>
        )}
      </div>
      <div className="flex items-center gap-4 max-md:gap-2">
        <div className="ml-0.5 shrink-0 truncate text-sm font-semibold">
          {t("button.numSelected", { num: selectedItems.size })}
        </div>
        <div
          onClick={clearGridSelections}
          className="flex size-8 cursor-pointer items-center justify-center rounded hover:bg-main-sky-450"
        >
          <Close />
        </div>
      </div>
      {EditItemDrawer}
    </>
  );
}
