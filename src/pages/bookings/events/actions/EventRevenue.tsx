/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";
import RevenueTable, { CellRenderer } from "../components/RevenueTable";
import type { ColumnDef } from "@/components/Table";
import { useTranslation } from "react-i18next";
import { useFormContext, useWatch } from "react-hook-form";
import { calculateFBTotal } from "@/utils/eventModalUtils";

export default function EventRevenue() {
  const { t } = useTranslation();
  const { control } = useFormContext();
  const [
    currentRevenue = {},
    actualRevenue = null,
    firstDefiniteRevenue = null,
    attendance,
    forecastAverageFoodRevenue,
    forecastAverageBeverageRevenue,
    forecastOtherRevenue,
    forecastEngineeringRevenue,
    forecastTechRevenue,
    forecastPrideRevenue,
    forecastRoomRevenue,
  ] = useWatch({
    control,
    name: [
      "currentRevenue",
      "actualRevenue",
      "firstDefiniteRevenue",
      "attendance",
      "forecastAverageFoodRevenue",
      "forecastAverageBeverageRevenue",
      "forecastOtherRevenue",
      "forecastEngineeringRevenue",
      "forecastTechRevenue",
      "forecastPrideRevenue",
      "forecastRoomRevenue",
    ],
  });

  const hasActualRevenue = useMemo(
    () => actualRevenue !== null,
    [actualRevenue],
  );

  const columnDefs: ColumnDef<any>[] = [
    {
      headerName: t("heading.categories"),
      field: "categories",
      footerValueGetter: () => t("label.total"),
      headerClass: "w-30 max-w-30",
      cellClass: "w-28 max-w-28",
      footerClass: "text-left",
    },
    {
      headerName: t("heading.avgCheck"),
      field: "avgCheck",
      cellRenderer: CellRenderer,
      footerValueGetter: () => null,
      cellClass: "max-w-27 text-right",
    },
    {
      headerName: t("heading.forecast"),
      field: "forecast",
      cellRenderer: CellRenderer,
      cellClass: "max-w-27 text-right",
      footerClass: "pr-4 text-right",
    },
    {
      headerName: t("heading.revised"),
      field: "revised",
      cellRenderer: CellRenderer,
    },
    {
      headerName: t("heading.detailed"),
      field: "detailed",
      cellRenderer: CellRenderer,
    },
    {
      headerName: t("heading.firstDefinite"),
      field: "firstDefinite",
      cellRenderer: CellRenderer,
      cellRendererParams: { skipEmptyFormat: true },
      footerValueGetter: firstDefiniteRevenue ? undefined : () => null,
    },
    {
      headerName: t("heading.current"),
      field: "current",
      cellRenderer: CellRenderer,
    },
    {
      headerName: t("heading.actual"),
      field: "actual",
      cellRenderer: CellRenderer,
      cellRendererParams: { skipEmptyFormat: true },
      footerValueGetter: !hasActualRevenue ? () => null : undefined,
    },
  ];

  const data = useMemo(
    () => [
      {
        categories: t("heading.food"),
        avgCheck: {
          value: forecastAverageFoodRevenue,
          editable: true,
          name: "forecastAverageFoodRevenue",
        },
        forecast: {
          value: calculateFBTotal(forecastAverageFoodRevenue, attendance),
          editable: false,
          render: (value: number) => <span className="pr-2">{value}</span>,
        },
        revised: 0,
        detailed: 0,
        firstDefinite: firstDefiniteRevenue?.food,
        current: currentRevenue?.food ?? 0,
        actual: actualRevenue?.food,
      },
      {
        categories: t("heading.beverage"),
        avgCheck: {
          value: forecastAverageBeverageRevenue,
          editable: true,
          name: "forecastAverageBeverageRevenue",
        },
        forecast: {
          value: calculateFBTotal(forecastAverageBeverageRevenue, attendance),
          editable: false,
          render: (value) => <span className="pr-2">{value}</span>,
        },
        revised: 0,
        detailed: 0,
        firstDefinite: firstDefiniteRevenue?.beverage,
        current: currentRevenue?.beverage ?? 0,
        actual: actualRevenue?.beverage,
      },
      {
        categories: t("heading.venueRental"),
        forecast: {
          value: forecastRoomRevenue,
          editable: true,
          name: "forecastRoomRevenue",
        },
        revised: 0,
        detailed: 0,
        firstDefinite: firstDefiniteRevenue?.room,
        current: currentRevenue?.room ?? 0,
        actual: actualRevenue?.room,
      },
      {
        categories: t("heading.auxiliaryRevenue"),
        forecast: {
          value: forecastPrideRevenue,
          editable: true,
          name: "forecastPrideRevenue",
        },
        revised: 0,
        detailed: 0,
        firstDefinite: firstDefiniteRevenue?.pride,
        current: currentRevenue?.pride ?? 0,
        actual: actualRevenue?.pride,
      },
      {
        categories: t("heading.technology"),
        forecast: {
          value: forecastTechRevenue,
          editable: true,
          name: "forecastTechRevenue",
        },
        revised: 0,
        detailed: 0,
        firstDefinite: firstDefiniteRevenue?.technology,
        current: currentRevenue?.technology ?? 0,
        actual: actualRevenue?.technology,
      },
      {
        categories: t("heading.engineering"),
        forecast: {
          value: forecastEngineeringRevenue,
          editable: true,
          name: "forecastEngineeringRevenue",
        },
        revised: 0,
        detailed: 0,
        firstDefinite: firstDefiniteRevenue?.engineering,
        current: currentRevenue?.engineering ?? 0,
        actual: actualRevenue?.engineering,
      },
      {
        categories: t("label.other"),
        forecast: {
          value: forecastOtherRevenue,
          editable: true,
          name: "forecastOtherRevenue",
        },
        revised: 0,
        detailed: 0,
        firstDefinite: firstDefiniteRevenue?.other,
        current: currentRevenue?.other ?? 0,
        actual: actualRevenue?.other,
      },
    ],
    [
      t,
      attendance,
      currentRevenue,
      actualRevenue,
      firstDefiniteRevenue,
      forecastAverageFoodRevenue,
      forecastAverageBeverageRevenue,
      forecastOtherRevenue,
      forecastEngineeringRevenue,
      forecastTechRevenue,
      forecastPrideRevenue,
      forecastRoomRevenue,
    ],
  );

  return <RevenueTable columnDefs={columnDefs} data={data} />;
}
