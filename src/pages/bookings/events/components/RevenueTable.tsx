/* eslint-disable @typescript-eslint/no-explicit-any */
import { NumberInput } from "@/components/NumberInput";
import Table, { type ColumnDef } from "@/components/Table";
import { formatAmount } from "@/utils/common";
import type { ReactNode } from "react";
import { Controller, useFormContext, useFormState } from "react-hook-form";

export const CellRenderer = ({
  value,
  valueFormatted,
  skipEmptyFormat,
}: {
  value:
    | null
    | number
    | {
        value: number;
        editable: boolean;
        name: string;
        render?: (value: any) => ReactNode;
      };
  valueFormatted: any;
  disabled?: boolean;
  skipEmptyFormat?: boolean;
}) => {
  const { control } = useFormContext();
  const { disabled } = useFormState({ control });

  const isEmpty = valueFormatted === null || valueFormatted === undefined;
  // 仅当传入 skipEmptyFormat 时，空值返回空字符串；否则始终格式化（原行为）
  const thousandValueFormatted =
    isEmpty && skipEmptyFormat ? "" : formatAmount(valueFormatted);
  if (value && typeof value === "object") {
    const { editable, name, render } = value;
    if (render) return render(thousandValueFormatted);

    const Input = (field: any) => (
      <NumberInput
        {...field}
        placeholder="0.00"
        precision={2}
        className="text-right text-sm"
        wrapperClassName="h-8 rounded-md border border-grayscale-500 px-2 focus:outline-none"
        disabled={disabled}
        maxLength={23}
        thousandSeparator
      />
    );
    // "name" will become required after all editable fields are confirmed.
    return editable ? (
      name ? (
        <Controller
          name={name}
          control={control}
          render={({ field }) => <Input {...field} />}
        />
      ) : (
        <Input value={value.value} />
      )
    ) : (
      thousandValueFormatted
    );
  }
  return thousandValueFormatted ?? "";
};
interface RevenueTableProps {
  columnDefs: ColumnDef<any>[];
  data: any[];
}
const RevenueTable = ({ columnDefs, data }: RevenueTableProps) => {
  const defaultColDef: Partial<ColumnDef<any>> = {
    valueFormatter: ({ value, col }) => {
      if (col.field === "categories") return value;
      if (typeof value === "number") {
        return value.toFixed(2);
      }
      if (
        typeof value === "object" &&
        value !== null &&
        value.value !== "undefined"
      ) {
        return value.value;
      }
      return value;
    },
    headerClass: "text-right",
    cellClass: "text-right",
    footerClass: "text-right",
  };
  return (
    <Table
      columnDefs={columnDefs}
      data={data}
      defaultColDef={defaultColDef}
      footerValueType="sum"
      tableClassName="table-fixed max-[939px]:table-auto"
      className="mt-2"
    />
  );
};

export default RevenueTable;
