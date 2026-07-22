/* eslint-disable @typescript-eslint/no-explicit-any */
import { twMerge } from "tailwind-merge";
import clsx from "clsx";
import type React from "react";
import BigNumber from "bignumber.js";
import { getValidNumber } from "@/utils/eventModalUtils";
import { formatAmount } from "@/utils/common";
import Tooltip from "@/components/Tooltip";

export interface ColParam<T> {
  field: keyof T;
  colIndex: number;
}
export interface ColumnDef<T> {
  headerName: string;
  field: keyof T;
  cellRenderer?: (params: {
    data: T;
    value: any;
    col: ColParam<T>;
    valueFormatted: any;
  }) => React.ReactNode;
  cellRendererParams?: Record<string, any>;
  headerClass?: string;
  cellClass?: string;
  footerClass?: string;
  valueFormatter?: (params: {
    data: T;
    value: any;
    col: ColParam<T>;
  }) => string;
  footerValueGetter?: (params: { col: ColParam<T>; data: T[] }) => any;
}
export interface TableProps<T> {
  columnDefs: ColumnDef<T>[];
  defaultColDef?: Partial<ColumnDef<T>>;
  data: T[];
  className?: string;
  tableClassName?: string;
  footerValueType?: "sum";
  footerValueDecimal?: number;
  showTooltip?: boolean;
}

const Table = <T extends Record<string, any>>({
  data,
  columnDefs,
  defaultColDef,
  className,
  tableClassName,
  footerValueType,
  footerValueDecimal = 2,
  showTooltip = true,
}: TableProps<T>) => {
  const thCls = "w-26.3 h-12 px-2 text-left font-semibold truncate";
  const mergedColumnDefs = columnDefs.map((colDef) => ({
    ...defaultColDef,
    ...colDef,
  }));
  const getFormattedValue = (
    item: T,
    field: keyof T,
    colIndex: number,
    valueFormatter?: (params: {
      data: T;
      value: any;
      col: ColParam<T>;
    }) => string,
  ) => {
    const cellData = item[field];
    const formatterParams = {
      data: item,
      value: cellData,
      col: { field, colIndex },
    };
    return {
      valueFormatted: valueFormatter
        ? valueFormatter(formatterParams)
        : cellData,
      formatterParams,
    };
  };

  const renderTooltipTrigger = (
    content: React.ReactNode,
    cellClass?: string,
  ) => {
    const tooltipTriggerClass = "flex items-center cursor-default";
    const baseElement = (
      <div
        className={twMerge(
          "w-full truncate",
          !showTooltip ? "" : tooltipTriggerClass,
          cellClass,
        )}
      >
        <span className="min-w-0 truncate">{content}</span>
      </div>
    );
    if (!showTooltip) {
      return baseElement;
    }
    return (
      <Tooltip
        position="startBottom"
        className="max-w-56 px-2 py-1 after:hidden!"
        content={content}
      >
        {baseElement}
      </Tooltip>
    );
  };

  const renderBody = () => {
    return data.map((item, index) => {
      return (
        <tr key={index}>
          {mergedColumnDefs.map(
            ({ field, cellRenderer, valueFormatter, cellClass, cellRendererParams }, colIndex) => {
              const { valueFormatted: formattedData, formatterParams } =
                getFormattedValue(item, field, colIndex, valueFormatter);
              const cellData = formatterParams.value;
              const isInputField =
                typeof cellData === "object" && cellData?.editable;

              const renderedContent = cellRenderer
                ? cellRenderer({
                    ...formatterParams,
                    valueFormatted: formattedData,
                    ...cellRendererParams,
                  })
                : formattedData;

              return (
                <td
                  key={colIndex}
                  className={twMerge(
                    "h-12 truncate border-t border-grayscale-400 px-2",
                    cellClass,
                  )}
                >
                  {isInputField
                    ? renderedContent
                    : renderTooltipTrigger(renderedContent, cellClass)}
                </td>
              );
            },
          )}
        </tr>
      );
    });
  };

  const renderFooter = () => {
    if (!footerValueType) {
      return;
    }
    const footCls =
      "border-t border-grayscale-400 bg-main-sky-100 text-base font-semibold tracking-[1px]";

    return (
      <tfoot className={footCls}>
        <tr className="table-row">
          {mergedColumnDefs.map(
            (
              { field, footerValueGetter, valueFormatter, footerClass, cellClass },
              colIndex,
            ) => {
              const cellValue = () => {
                if (footerValueGetter) {
                  return footerValueGetter({
                    col: { field, colIndex },
                    data,
                  });
                }
                if (footerValueType === "sum") {
                  const cellData = data.map(
                    (item) =>
                      getFormattedValue(item, field, colIndex, valueFormatter)
                        .valueFormatted,
                  );
                  const total = cellData
                    .reduce(
                      (acc, val) => acc.plus(getValidNumber(val)),
                      new BigNumber(0),
                    )
                    .toFixed(footerValueDecimal);
                  return formatAmount(total);
                }
              };
              const mergedFooterClass = twMerge(cellClass, footerClass);
              return (
                <td
                  key={colIndex}
                  className={twMerge(thCls, "px-2", mergedFooterClass)}
                >
                  {renderTooltipTrigger(cellValue(), mergedFooterClass)}
                </td>
              );
            },
          )}
        </tr>
      </tfoot>
    );
  };

  return (
    <div
      className={twMerge(
        clsx(
          "scrollbar overflow-x-auto rounded-md border border-grayscale-400 text-grayscale-800",
          className,
        ),
      )}
    >
      <table
        className={twMerge(
          "w-full border-collapse bg-white text-sm",
          tableClassName,
        )}
      >
        <thead className="bg-main-sky-100">
          <tr>
            {mergedColumnDefs.map(({ headerName, headerClass }, colIndex) => (
              <th key={colIndex} className={twMerge(thCls, headerClass)}>
                {headerName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{renderBody()}</tbody>
        {footerValueType && renderFooter()}
      </table>
    </div>
  );
};
export default Table;
