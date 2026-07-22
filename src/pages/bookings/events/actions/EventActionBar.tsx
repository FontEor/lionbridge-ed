import { useState, useRef, useMemo } from "react";
import Button from "@/components/Button";
import {
  Add,
  Block,
  Close,
  Copy,
  Delete,
  Edit,
  Paste,
  Visibility,
} from "@/components/Icons";
import { type DefaultValues } from "react-hook-form";
import { useEventStore } from "@/stores/eventStore";
import type { GridEventProps, CreateEditEventParams } from "@/types/index";
import { EVENT_ACTION_TYPE } from "@/utils/constants";
import type { AgGridReact } from "ag-grid-react";
import { useCallback, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import {
  transformOriginDataToEditViewData,
  getEventModalType,
} from "@/utils/eventModalUtils";
import { validateEvents } from "@/utils/validation";
import { copyEventOrder, createIdGenerator } from "@/utils/copyEventUtils";
import { useChangesNotification } from "@/hooks/useCommon";
import EditEvent from "./EventDrawer";
import CreateEventOrder from "./EventOrderDrawer";
import CopyEventDrawer from "./CopyEventDrawer";
import {
  useIsMixedSelect,
  useIsEventsHasReadOnly,
  useClearGridSelections,
  useRedrawSelectedOrders,
} from "@/hooks/useGridSelect";
import { formatToTime } from "@/utils/dateHelpers";

export interface EventActionBarProps {
  gridRef: RefObject<AgGridReact<GridEventProps> | null>;
}

export default function EventActionBar({ gridRef }: EventActionBarProps) {
  const { t } = useTranslation();
  const cacheEventEditType = useRef<string>("");
  const selectedEvents = useEventStore.useSelectedEvents();
  const selectedEventOrders = useEventStore.useSelectedEventOrders();
  const setIsDirty = useEventStore.useSetIsDirty();
  const changeNotification = useChangesNotification();
  const [open, setOpen] = useState(false);
  const [openEventOrderDrawer, setOpenEventOrderDrawer] = useState(false);
  const [openCopyEventsDrawer, setOpenCopyEventsDrawer] = useState(false);
  const isEventsHasReadOnly = useIsEventsHasReadOnly();
  const clearGridSelections = useClearGridSelections();
  const isMixedSelect = useIsMixedSelect();
  const setIsCopyOrder = useEventStore.useSetIsCopyOrder();
  const isCopyOrder = useEventStore.useIsCopyOrder();
  const redrawSelectedOrders = useRedrawSelectedOrders();

  const handleEdit = useCallback(() => {
    if (selectedEvents.length > 1) {
      return;
    } else {
      setOpen(true);
    }
  }, [selectedEvents]);

  const handleEditClose = useCallback(() => {
    setOpen(false);
  }, []);

  const handleCreateEventOrder = useCallback(() => {
    if (selectedEvents.length > 1) {
      return;
    } else {
      setOpenEventOrderDrawer(true);
    }
  }, [selectedEvents.length]);

  const handleCloseEventOrderDrawer = useCallback(() => {
    setOpenEventOrderDrawer(false);
  }, []);

  const openCopyEventDrawer = useCallback(() => {
    setOpenCopyEventsDrawer(true);
  }, []);

  const closeCopyEventDrawer = useCallback(() => {
    setOpenCopyEventsDrawer(false);
  }, []);

  const getEditDefaultValues = useCallback(async () => {
    const selectedNodes = gridRef.current?.api.getSelectedNodes() || [];
    const currentEditRowData = selectedNodes[0].data!;
    return transformOriginDataToEditViewData(
      currentEditRowData,
    ) as CreateEditEventParams;
  }, [gridRef]);

  const getEventEditType = useCallback(() => {
    if (!open) return cacheEventEditType.current;
    const selectedNodes = gridRef.current?.api.getSelectedNodes() || [];
    const currentEditRowData = selectedNodes[0].data!;
    cacheEventEditType.current = getEventModalType(currentEditRowData);
    return cacheEventEditType.current;
  }, [gridRef, open]);

  const EditEventDrawer = useMemo(() => {
    return selectedEvents.length === 1 ? (
      <EditEvent
        open={open}
        defaultValues={
          getEditDefaultValues as DefaultValues<CreateEditEventParams>
        }
        onClose={handleEditClose}
        type={getEventEditType()}
        gridRef={gridRef}
      />
    ) : (
      <></>
    );
  }, [
    selectedEvents,
    open,
    getEditDefaultValues,
    getEventEditType,
    handleEditClose,
    gridRef,
  ]);

  const viewEditBtn = useMemo(() => {
    if (isEventsHasReadOnly && selectedEvents.length > 1) return;
    return (
      <Button
        variant="tertiary"
        size="small"
        className="truncate px-0 text-white"
        startIcon={
          isEventsHasReadOnly ? <Visibility /> : <Edit className="size-5.5" />
        }
        onClick={handleEdit}
      >
        {isEventsHasReadOnly
          ? t("label.view")
          : selectedEvents.length > 1
            ? t("label.massModify")
            : t("button.edit")}
      </Button>
    );
  }, [handleEdit, isEventsHasReadOnly, selectedEvents.length, t]);

  const handleEventOrderPaste = useCallback(async () => {
    const orders = Object.values(selectedEventOrders).flat();
    if (orders.length === 0 || selectedEvents.length === 0) return;
    const genId = createIdGenerator();
    for (const event of selectedEvents) {
      const newOrders = orders.map((order) => {
        const newOrder = copyEventOrder(order, event.eventDate, genId);
        newOrder.startDateTime = event.startDateTime;
        newOrder.endDateTime = event.endDateTime;
        newOrder.attendanceEstimate = event.attendance;
        newOrder.finalDetailedIndicator = false;
        const orderStartTime = formatToTime(order.startDateTime);
        newOrder.items?.forEach((item) => {
          if (formatToTime(item.serveDtTm) === orderStartTime) {
            item.serveDtTm = event.startDateTime;
          }
        });
        return newOrder;
      });
      event.eventOrders = [...(event.eventOrders ?? []), ...newOrders];
      event.dirty = true;
    }
    const _validatedEvents = await validateEvents(selectedEvents);
    gridRef.current?.api.applyTransaction({
      update: _validatedEvents,
    });
    changeNotification();
    setIsDirty(true);
    clearGridSelections();
  }, [
    selectedEventOrders,
    selectedEvents,
    gridRef,
    changeNotification,
    setIsDirty,
    clearGridSelections,
  ]);

  return (
    <>
      <div className="flex items-center gap-6 max-md:gap-4">
        {!isCopyOrder && viewEditBtn}
        {!isEventsHasReadOnly && !isCopyOrder && (
          <Button
            variant="tertiary"
            size="small"
            className="truncate px-0 text-white"
            startIcon={<Add />}
            onClick={handleCreateEventOrder}
          >
            {t("button.addEventOrder")}
          </Button>
        )}
        {!isMixedSelect && !isCopyOrder && (
          <Button
            variant="tertiary"
            size="small"
            className="truncate px-0 text-white"
            startIcon={<Copy />}
            onClick={openCopyEventDrawer}
          >
            {t("button.copy")}
          </Button>
        )}
        {isCopyOrder && (
          <Button
            variant="tertiary"
            size="small"
            className="truncate px-0 text-white"
            startIcon={<Paste />}
            onClick={handleEventOrderPaste}
          >
            {t("button.paste")}
          </Button>
        )}
      </div>
      <div className="flex items-center gap-4 max-md:gap-2">
        {!isCopyOrder && (
          <Button
            variant="tertiary"
            size="small"
            className="truncate px-0 text-white"
            startIcon={<Delete />}
          >
            {t("button.delete")}
          </Button>
        )}
        {isCopyOrder && (
          <Button
            variant="tertiary"
            size="small"
            className="truncate px-0 text-white"
            startIcon={<Block />}
            onClick={() => {
              setIsCopyOrder(false);
              redrawSelectedOrders();
              gridRef?.current?.api.deselectAll();
            }}
          >
            {t("button.cancelCopy")}
          </Button>
        )}
        <div className="ml-0.5 shrink-0 truncate text-sm font-semibold">
          {t("button.numSelected", { num: selectedEvents.length })}
        </div>
        <div
          onClick={clearGridSelections}
          className="flex size-8 cursor-pointer items-center justify-center rounded hover:bg-main-sky-450"
        >
          <Close />
        </div>
      </div>
      {EditEventDrawer}
      <CreateEventOrder
        open={openEventOrderDrawer}
        onClose={handleCloseEventOrderDrawer}
        type={EVENT_ACTION_TYPE.CREATE}
        gridRef={gridRef}
        eventInfo={selectedEvents[0]}
      />
      <CopyEventDrawer
        open={openCopyEventsDrawer}
        onClose={closeCopyEventDrawer}
      />
    </>
  );
}
