import { useState, useMemo } from "react";
import Button from "@/components/Button";
import { Add, Close, Copy, Delete, Edit, Report } from "@/components/Icons";
import type {
  CreateEditEventOrderParams,
  EOReportParams,
  EventProps,
  GridEventProps,
} from "@/types/index";
import {
  EO_REPORT_URL_IDENTITY,
  EOPreviewBaseUrl,
  EVENT_ACTION_TYPE,
} from "@/utils/constants";
import type { AgGridReact } from "ag-grid-react";
import { useCallback, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import EditEventOrder from "./EventOrderDrawer";
import { type DefaultValues } from "react-hook-form";
import { transformOriginDataToEditViewData } from "@/utils/eventOrderModalUtils";
import ItemDrawer from "./ItemSearchDrawer";
import { useIsMixedSelect, useSelectedOrderInfo } from "@/hooks/useGridSelect";
import useGridUpdate from "@/hooks/useGridUpdate";
import { useBookingStore } from "@/stores";
import { debounce } from "lodash-es";
import { getOrderRowKey } from "@/utils/eventsGridUtils";
import { buildQueryUrl } from "@/utils/stringHelpers";
import { useEventStore } from "@/stores";
import {
  useClearGridSelections,
  useRedrawSelectedOrders,
} from "@/hooks/useGridSelect";

export interface EditEventOrderActionBarProps {
  gridRef: RefObject<AgGridReact<GridEventProps> | null>;
}

export default function EditEventOrderActionBar({
  gridRef,
}: EditEventOrderActionBarProps) {
  const { t } = useTranslation();
  const [openEventOrderDrawer, setOpenEventOrderDrawer] = useState(false);
  const [openItemDrawer, setOpenItemDrawer] = useState(false);
  const bookingInfo = useBookingStore.useBookingInfo();
  const selectedEventOrderInfo = useSelectedOrderInfo();

  const clearGridSelections = useClearGridSelections();
  const { getEventNode, getEventOrderData } = useGridUpdate();
  const setIsCopyOrder = useEventStore.useSetIsCopyOrder();
  const redrawSelectedOrders = useRedrawSelectedOrders();
  const isMixedSelect = useIsMixedSelect();

  const eventInfo = useMemo(() => {
    return getEventNode(selectedEventOrderInfo.eventOrder!.eventRowKey!)?.data;
  }, [selectedEventOrderInfo.eventOrder, getEventNode]);

  const handleCloseEventOrderDrawer = useCallback(() => {
    setOpenEventOrderDrawer(false);
  }, []);

  const getEditDefaultValues = useCallback(async () => {
    const orderRowKey = getOrderRowKey(selectedEventOrderInfo.eventOrder!);
    const { order } = getEventOrderData(
      orderRowKey,
      selectedEventOrderInfo!.eventOrder!.eventRowKey,
    );
    return transformOriginDataToEditViewData(order!);
  }, [selectedEventOrderInfo, getEventOrderData]);

  const EditEventOrderDrawer = useMemo(() => {
    return selectedEventOrderInfo.eventOrder &&
      selectedEventOrderInfo.count === 1 ? (
      <EditEventOrder
        open={openEventOrderDrawer}
        onClose={handleCloseEventOrderDrawer}
        type={
          selectedEventOrderInfo.eventOrder?.isReadOnly
            ? EVENT_ACTION_TYPE.VIEW
            : EVENT_ACTION_TYPE.EDIT
        }
        defaultValues={
          getEditDefaultValues as DefaultValues<CreateEditEventOrderParams>
        }
        gridRef={gridRef}
        eventInfo={eventInfo as EventProps}
        eventOrderNumber={selectedEventOrderInfo.eventOrder.eventOrderNumber}
      />
    ) : (
      <></>
    );
  }, [
    selectedEventOrderInfo,
    openEventOrderDrawer,
    handleCloseEventOrderDrawer,
    getEditDefaultValues,
    gridRef,
    eventInfo,
  ]);

  const ItemSearchDrawer = useMemo(() => {
    return (
      <ItemDrawer
        open={openItemDrawer}
        onClose={() => {
          setOpenItemDrawer(false);
        }}
      />
    );
  }, [openItemDrawer]);

  const EOReportPreview = useCallback(() => {
    const preview = (params: EOReportParams) => {
      const url = buildQueryUrl(EOPreviewBaseUrl, params);
      window.open(url, "_blank");
    };
    const propertyNumber = bookingInfo?.propertyNumber;
    const eventOrderNumber =
      selectedEventOrderInfo.eventOrder?.eventOrderNumber;
    if (propertyNumber && eventOrderNumber) {
      preview({
        ...EO_REPORT_URL_IDENTITY,
        propertyNum: propertyNumber,
        eoNumber: eventOrderNumber,
        labelLanguageLookupSid: 1,
        languageLookupSid: 1,
      });
    }
  }, [
    bookingInfo?.propertyNumber,
    selectedEventOrderInfo.eventOrder?.eventOrderNumber,
  ]);

  return (
    <>
      <div className="flex items-center gap-6 max-md:gap-4">
        <Button
          variant="tertiary"
          size="small"
          className="truncate px-0 text-white"
          startIcon={<Edit className="size-5.5" />}
          onClick={() => {
            if (selectedEventOrderInfo.count === 1) {
              setOpenEventOrderDrawer(true);
            }
          }}
        >
          {selectedEventOrderInfo.count > 1
            ? t("label.massModify")
            : t("button.edit")}
        </Button>
        <Button
          variant="tertiary"
          size="small"
          className="truncate px-0 text-white"
          startIcon={<Add />}
          onClick={() => {
            setOpenItemDrawer(true);
          }}
        >
          {t("button.modifyItemList")}
        </Button>
        {!isMixedSelect && (
          <Button
            variant="tertiary"
            size="small"
            className="truncate px-0 text-white"
            onClick={() => {
              setIsCopyOrder(true);
              redrawSelectedOrders();
            }}
            startIcon={<Copy />}
          >
            {t("button.copy")}
          </Button>
        )}
        {selectedEventOrderInfo.count === 1 && (
          <Button
            variant="tertiary"
            size="small"
            className="truncate px-0 text-white"
            startIcon={<Report />}
            onClick={debounce(EOReportPreview, 200)}
          >
            {t("button.eoReport")}
          </Button>
        )}
      </div>
      <div className="flex items-center gap-4 max-md:gap-2">
        <Button
          variant="tertiary"
          size="small"
          className="truncate px-0 text-white"
          startIcon={<Delete />}
        >
          {t("button.delete")}
        </Button>
        <div className="ml-0.5 shrink-0 truncate text-sm font-semibold">
          {t("button.numSelected", { num: selectedEventOrderInfo.count })}
        </div>
        <div
          onClick={clearGridSelections}
          className="flex size-8 cursor-pointer items-center justify-center rounded hover:bg-main-sky-450"
        >
          <Close />
        </div>
      </div>
      {EditEventOrderDrawer}
      {ItemSearchDrawer}
    </>
  );
}
