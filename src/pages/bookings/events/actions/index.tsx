import clsx from "clsx";
import DefaultActionBar, {
  type DefaultActionBarProps,
} from "./DefaultActionBar";
import EditEventActionBar, { type EventActionBarProps } from "./EventActionBar";
import { useEventStore } from "@/stores/eventStore";
import EventOrderActionBar from "./EventOrderActionBar";
import ItemActionBar from "./ItemActionBar";
import ItemPasteActionBar from "./ItemPasteActionBar";
import { useMemo } from "react";
import PasteActionBar from "./PasteActionBar";

export default function Actions({
  gridRef,
  isLoading,
  hasEvents,
}: EventActionBarProps & DefaultActionBarProps) {
  const selectedEvents = useEventStore.useSelectedEvents();
  const selectedEventOrders = useEventStore.useSelectedEventOrders();
  const selectedItems = useEventStore.useSelectedItems();
  const isCopyOrder = useEventStore.useIsCopyOrder();
  const isCopyItem = useEventStore.useIsCopyItem();

  const actionStatus = useMemo(() => {
    return (
      selectedEvents.length > 0 ||
      Object.keys(selectedEventOrders).length > 0 ||
      selectedItems.size > 0
    );
  }, [selectedEventOrders, selectedEvents.length, selectedItems.size]);

  return (
    <div className="flex flex-col pt-4">
      <DefaultActionBar
        isLoading={isLoading}
        gridRef={gridRef}
        hasEvents={hasEvents}
      />
      <div
        className={clsx(
          "flex w-full items-center justify-between gap-4 rounded-t-lg bg-main-sky px-3 text-white transition-all duration-100",
          actionStatus ? "h-14" : "h-0",
        )}
      >
        {isCopyOrder ? (
          <PasteActionBar />
        ) : isCopyItem ? (
          <ItemPasteActionBar />
        ) : selectedEvents.length > 0 ? (
          <EditEventActionBar gridRef={gridRef} />
        ) : Object.keys(selectedEventOrders).length > 0 ? (
          <EventOrderActionBar gridRef={gridRef} />
        ) : selectedItems.size > 0 ? (
          <ItemActionBar gridRef={gridRef} />
        ) : (
          ""
        )}
      </div>
    </div>
  );
}
