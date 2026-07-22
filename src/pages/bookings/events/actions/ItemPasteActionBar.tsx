import Button from "@/components/Button";
import { Block, Close, Info, Paste } from "@/components/Icons";
import { useChangesNotification } from "@/hooks/useCommon";
import {
  useClearGridSelections,
  useRedrawSelectedItems,
  useSelectedOrderInfo,
} from "@/hooks/useGridSelect";
import { useEventStore } from "@/stores";
import { useGlobalStore } from "@/stores/store";
import { copyEventOrderItem, createIdGenerator } from "@/utils/copyEventUtils";
import type { EventProps } from "@/types/booking.types";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { validateEvents } from "@/utils/validation";

export default function ItemPasteActionBar() {
  const { t } = useTranslation();
  const selectedItems = useEventStore.useSelectedItems();
  const selectedEventOrders = useEventStore.useSelectedEventOrders();
  const selectedEventOrderInfo = useSelectedOrderInfo();
  const eventGridRef = useGlobalStore.useEventGridRef();
  const setIsCopyItem = useEventStore.useSetIsCopyItem();
  const clearSelectedOrders = useEventStore.useClearSelectedOrders();
  const redrawSelectedItems = useRedrawSelectedItems();
  const clearGridSelections = useClearGridSelections();
  const changeNotification = useChangesNotification();
  const setIsDirty = useEventStore.useSetIsDirty();

  const handleItemPaste = useCallback(async () => {
    const items = [...selectedItems.values()].map((v) => v.data);
    const targetOrders = Object.values(selectedEventOrders).flat();
    if (items.length === 0 || targetOrders.length === 0) return;
    const genId = createIdGenerator();
    const api = useGlobalStore.getState().eventGridRef?.current?.api;
    const affectedEvents: EventProps[] = [];
    for (const eventRowKey in selectedEventOrders) {
      const event = api?.getRowNode(eventRowKey)?.data;
      if (!event) continue;
      for (const order of selectedEventOrders[eventRowKey]) {
        const newItems = items.map((item) => {
          const newItem = copyEventOrderItem(item, order.startDateTime, genId);
          newItem.serveDtTm = order.startDateTime;
          return newItem;
        });
        order.items = [...(order.items ?? []), ...newItems];
      }
      event.dirty = true;
      affectedEvents.push(event);
    }
    const validatedEvents = await validateEvents(affectedEvents);
    api?.applyTransaction({ update: validatedEvents });
    changeNotification();
    setIsDirty(true);
    clearGridSelections();
  }, [
    selectedItems,
    selectedEventOrders,
    changeNotification,
    setIsDirty,
    clearGridSelections,
  ]);

  return (
    <>
      <div className="flex items-center gap-6 max-md:gap-4">
        {selectedEventOrderInfo.count === 0 ? (
          <div className="flex gap-2 text-sm font-semibold">
            <Info className="size-4.5" />
            {t("copy.selectRowsToPaste")}
          </div>
        ) : (
          <Button
            variant="tertiary"
            size="small"
            className="truncate px-0 text-white"
            startIcon={<Paste />}
            onClick={handleItemPaste}
          >
            {t("button.paste")}
          </Button>
        )}
      </div>
      <div className="flex items-center gap-4 max-md:gap-2">
        <Button
          variant="tertiary"
          size="small"
          className="truncate px-0 text-white"
          startIcon={<Block />}
          onClick={() => {
            setIsCopyItem(false);
            redrawSelectedItems();
            eventGridRef?.current?.api.forEachDetailGridInfo(
              (detailGridInfo) => {
                detailGridInfo.api?.deselectAll();
              },
            );
            eventGridRef?.current?.api.deselectAll();
            clearSelectedOrders();
          }}
        >
          {t("button.cancelCopy")}
        </Button>
        <div className="ml-0.5 shrink-0 truncate text-sm font-semibold">
          {t("button.numSelected", {
            num: selectedEventOrderInfo.count
              ? selectedEventOrderInfo.count
              : selectedItems.size,
          })}
        </div>
        <div
          onClick={clearGridSelections}
          className="flex size-8 cursor-pointer items-center justify-center rounded hover:bg-main-sky-450"
        >
          <Close />
        </div>
      </div>
    </>
  );
}
