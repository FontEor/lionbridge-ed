import type { ColDef, Theme } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useMemo, useState, type RefObject } from "react";
import ItemActionRenderer from "./ItemActionRenderer";
import type { EventOrderProps, GridEventProps } from "@/types/booking.types";
import ItemListNowRow from "./ItemListNowRow";
import { useSelectedOrderInfo } from "@/hooks/useGridSelect";
import useEventOrderItemModal from "@/hooks/events/useEventOrderItemModal";
import { useTranslation } from "react-i18next";
import CustomTooltip from "../../components/CustomTooltip";
import { formatAmount } from "@/utils/common";
import { formatItemName } from "@/utils/itemModalUtils";
import { useEventOrderData } from "@/hooks/useEvents";
import { createValueFormatters } from "@/utils/eventsGridUtils";

export default function ItemList({
  theme,
  gridRef,
  selectedOrders,
}: {
  theme: Theme;
  gridRef: RefObject<AgGridReact<GridEventProps> | null>;
  selectedOrders: {
    list: EventOrderProps[];
    title: string;
  };
}) {
  const selectedEventOrderInfo = useSelectedOrderInfo();
  const { t } = useTranslation();
  const rowData = useMemo(() => {
    return selectedEventOrderInfo?.count === 1
      ? (selectedOrders.list[0]?.items ?? [])
      : [];
  }, [selectedEventOrderInfo, selectedOrders]);

  const { unitOfMeasureTypes } = useEventOrderData();
  const { uomFormatter } = useMemo(
    () => createValueFormatters({ uom: unitOfMeasureTypes?.unitOfMeasureMap }),
    [unitOfMeasureTypes?.unitOfMeasureMap],
  );

  const { catalogTypeFormatter } = useEventOrderItemModal();

  const [colDefs] = useState<ColDef[]>([
    {
      field: "itemName",
      headerName: t("label.itemName"),
      maxWidth: 168,
      minWidth: 150,
      headerStyle: {
        paddingLeft: "32px",
      },
      cellStyle: {
        paddingLeft: "32px",
      },
      flex: 1,
      valueFormatter: formatItemName,
    },
    {
      field: "catalogTypeLookupSid",
      headerName: t("label.type"),
      width: 75,
      valueFormatter: catalogTypeFormatter,
    },
    {
      field: "quantityOrdered",
      headerName: t("label.expectedQty"),
      width: 68,
      cellStyle: {
        textAlign: "right",
      },
    },
    {
      field: "itemPrices",
      headerName: t("label.price"),
      width: 70,
      cellStyle: {
        textAlign: "right",
      },
      valueFormatter: ({ value }) => {
        return formatAmount(value?.[0]?.standardPrice);
      },
    },
    {
      field: "pricePointLookupSid",
      headerName: t("label.unitOfMeasure"),
      width: 112,
      valueFormatter: uomFormatter,
    },
    {
      field: "action",
      headerName: t("label.action"),
      width: 80,
      cellRenderer: ItemActionRenderer,
    },
  ]);

  const defaultColDef: ColDef = {
    resizable: false,
    headerTooltipValueGetter: (props) => props.valueFormatted || props.value,
    tooltipComponent: CustomTooltip,
    tooltipValueGetter: (props) => props.valueFormatted || props.value,
  };
  return (
    <div className="grow">
      <AgGridReact
        rowData={rowData}
        getRowId={(params) =>
          String(params.data.eventOrderItemSid || params.data.id)
        }
        ref={gridRef}
        columnDefs={colDefs}
        defaultColDef={defaultColDef}
        className="item-list"
        theme={theme}
        components={{ agNoRowsOverlay: ItemListNowRow }}
      />
    </div>
  );
}
