import type { AgGridReact } from "ag-grid-react";
import { useCallback, useEffect, useState, type RefObject } from "react";
import Button from "@/components/Button";
import Dropdown from "@/components/Dropdown";
import { ArrowDown, Plus } from "@/components/Icons";
import Search from "@/components/Search";
import { useSaveEvents } from "@/hooks";
import { useEventStore } from "@/stores/eventStore";
import { useTranslation } from "react-i18next";
import type { GridEventProps } from "@/types/booking.types";
import useDialog from "@/components/Dialog/useDialog";
import { useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { bookingKey, eventsKey } from "@/hooks";
import { debounce } from "lodash-es";
import AddEvent from "./event/EventDrawer";
import { isEventBlocked } from "@/utils/eventsGridUtils";
import useEventActions from "@/hooks/useEventActions";
import { useAlertStore } from "@/stores/store";
import { useClearGridSelections } from "@/hooks/useGridSelect";
import { validateEvents } from "@/utils/validation";

export interface DefaultActionBarProps {
  isLoading: boolean;
  gridRef: RefObject<AgGridReact<GridEventProps> | null>;
  hasEvents: boolean;
}
export default function DefaultActionBar({
  isLoading,
  gridRef,
  hasEvents,
}: DefaultActionBarProps) {
  const { t } = useTranslation();
  const { bookingNumber } = useParams();
  const { warning } = useDialog();
  const quickFilterText = useEventStore.useQuickFilterText();
  const setQuickFilterText = useEventStore.useSetQuickFilterText();

  const isSaving = useEventStore.useIsSaving();
  const setIsSaving = useEventStore.useSetIsSaving();
  const alertApi = useAlertStore.useAlert();

  const isDirty = useEventStore.useIsDirty();
  const setIsDirty = useEventStore.useSetIsDirty();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const actionItems = useEventActions(gridRef);
  const clearGridSelections = useClearGridSelections();
  const saveMutation = useSaveEvents(bookingNumber, {
    onSuccess: (data) => {
      const hasUnblockedEvent = Array.isArray(data) && data.length > 0;
      if (hasUnblockedEvent) {
        alertApi.warning({
          multiple: true,
          title: t("label.warning"),
          message: t("message.unblockedEventWarning"),
        });
      } else {
        alertApi.success({
          title: t("label.success"),
          message: t("message.changeSaveSuccess"),
        });
      }
      queryClient.invalidateQueries({
        queryKey: [bookingKey, eventsKey, bookingNumber],
        exact: true,
      });
      setIsDirty(false);
      clearGridSelections();
    },
    onError: (error) => {
      alertApi.error({
        title: t("label.errorSaving"),
        message: error?.message || t("message.changeSaveError"),
        multiple: true,
      });
    },
  });

  const saveChangeEvents = useCallback(async () => {
    const needUpdateData: GridEventProps[] = [];
    gridRef.current?.api.forEachNode((node) => {
      if (node.data?.dirty) {
        node.data.requestRoomBlock = isEventBlocked(
          node.data.eventStatusCode,
          node.data.requestRoomBlock,
        );
        needUpdateData.push(node.data);
      }
    });
    const validatedEvents = await validateEvents(needUpdateData);
    // TODO: ED-352 Copy TBD
    const hasErrorEvents = validatedEvents.filter(
      (data) => data.errors || data.childrenHasError,
    );
    if (hasErrorEvents.length) {
      gridRef.current?.api.applyTransaction({ update: hasErrorEvents });
      alertApi.error({
        title: t("label.errorSaving"),
        message: "Please correct the validation errors and save again",
      });
      return;
    }
    saveMutation.mutate(needUpdateData);
  }, [alertApi, gridRef, saveMutation, t]);

  useEffect(() => {
    setIsSaving(saveMutation.isPending);
  }, [saveMutation.isPending, setIsSaving]);

  const handleCancelAll = useCallback(() => {
    warning({
      title: t("copy.discardUnsavedChanged"),
      content: t("message.confirmDiscardChangesMessage"),
      cancelText: t("button.continueEditing"),
      confirmText: t("button.discardChangesShort"),
      onConfirm: debounce(() => {
        queryClient
          .refetchQueries(
            {
              queryKey: [bookingKey, eventsKey, bookingNumber],
              exact: true,
            },
            {
              throwOnError: true,
            },
          )
          .then(() => {
            setIsDirty(false);
            clearGridSelections();
          });
      }, 200),
    });
  }, [bookingNumber, queryClient, setIsDirty, t, warning, clearGridSelections]);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <div className="flex pb-4">
      <div className="flex gap-3">
        <Dropdown
          disabled={isLoading || !hasEvents}
          placement="bottomStart"
          items={actionItems}
        >
          <Button
            variant="secondary"
            size="small"
            className="h-9 truncate group-data-open:bg-main-sky-600 group-data-open:text-white"
            startIcon={<ArrowDown className="group-data-open:rotate-180" />}
            disabled={isLoading || !hasEvents}
          >
            {t("button.actions")}
          </Button>
        </Dropdown>
        <Button
          variant="secondary"
          size="small"
          className="h-9 truncate group-data-open:bg-main-sky-600 group-data-open:text-white"
          startIcon={<Plus />}
          disabled={isLoading || isSaving}
          onClick={() => setOpen(true)}
        >
          {t("button.addEvent")}
        </Button>
      </div>
      <div className="flex grow justify-end gap-3">
        <Search
          value={quickFilterText}
          placeholder={t("button.search")}
          onChange={setQuickFilterText}
          size="small"
          className="mr-1 max-w-[300px] grow truncate"
          inputClassName="min-w-0 w-24"
          disabled={isLoading || !hasEvents}
        />
        <Button
          disabled={!isDirty || isLoading || isSaving}
          variant="secondary"
          size="small"
          className="h-9 shrink-0 truncate"
          onClick={handleCancelAll}
        >
          {t("button.cancelAll")}
        </Button>
        <Button
          disabled={!isDirty || isLoading || isSaving}
          onClick={saveChangeEvents}
          variant="primary"
          size="small"
          className="h-9 min-w-30 truncate"
        >
          {t("button.saveAll")}
        </Button>
      </div>
      <AddEvent open={open} onClose={handleClose} type="create" />
    </div>
  );
}
