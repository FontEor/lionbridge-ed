import type { ColDef, Theme } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useState, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import ItemResultActionRenderer from "./ItemResultActionRenderer";
import type { GridEventProps } from "@/types/booking.types";
import type { GetCatalogItemsParams } from "@/types/booking.types";
import { useSearchCatalogItem } from "@/hooks/useEvents";
import useEventOrderItemModal from "@/hooks/events/useEventOrderItemModal";
import CustomTooltip from "../../components/CustomTooltip";

export default function SearchResults({
  theme,
  itemAddedGridRef,
  queryParams,
}: {
  theme: Theme;
  itemAddedGridRef: RefObject<AgGridReact<GridEventProps> | null>;
  queryParams?: GetCatalogItemsParams;
}) {
  const { t } = useTranslation();
  const { data, isLoading } = useSearchCatalogItem(queryParams);
  const { catalogTypeFormatter, catalogSectionFormatter } =
    useEventOrderItemModal();

  const [colDefs] = useState<ColDef[]>([
    {
      field: "itemName",
      headerName: t("label.itemName"),
      maxWidth: 352,
      minWidth: 336,
      headerStyle: {
        paddingLeft: "24px",
      },
      cellStyle: {
        paddingLeft: "24px",
      },
      flex: 1,
    },
    {
      field: "catalogTypeCode",
      headerName: t("label.type"),
      width: 102,
      valueFormatter: catalogTypeFormatter,
    },
    {
      field: "sectionCode",
      headerName: t("label.section"),
      width: 105,
      valueFormatter: catalogSectionFormatter,
    },
    {
      field: "action",
      headerName: t("label.action"),
      width: 102,
      headerClass: "header-center",
      cellStyle: {
        textAlign: "center",
      },
      cellRenderer: ItemResultActionRenderer,
      cellRendererParams: {
        gridRef: itemAddedGridRef,
      },
    },
  ]);
  const defaultColDef: ColDef = {
    resizable: false,
    headerTooltipValueGetter: (props) => props.valueFormatted || props.value,
    tooltipComponent: CustomTooltip,
  };
  const EmptyOverlay = () => null;
  return (
    <div className="mt-8 flex grow flex-col">
      <div className="flex h-12 shrink-0 items-center border-t border-grayscale-400 bg-main-sky-100 px-6 text-sm font-semibold">
        {t("button.searchResults")} ({data?.length || 0})
      </div>
      <AgGridReact
        loading={isLoading}
        rowData={data || []}
        columnDefs={colDefs}
        defaultColDef={defaultColDef}
        className="item-list"
        components={{ agNoRowsOverlay: EmptyOverlay }}
        theme={theme}
      />
    </div>
  );
}
