import React from "react";
import {
  Table as BaseTable,
  TableBody as BaseTableBody,
  TableCell as BaseTableCell,
  TableHead as BaseTableHead,
  TableHeader as BaseTableHeader,
  TableRow as BaseTableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";

// Re-export the base table components
export const Table = BaseTable;
export const TableBody = BaseTableBody;
export const TableCell = BaseTableCell;
export const TableHead = BaseTableHead;
export const TableHeader = BaseTableHeader;
export const TableRow = BaseTableRow;

interface Column {
  header: string;
  accessorKey: string;
  cell?: (value: any, row?: any) => React.ReactNode;
}

interface ResponsiveTableProps {
  columns: Column[];
  data: any[];
  children?: React.ReactNode;
}

export function ResponsiveTable({
  columns,
  data,
  children,
}: ResponsiveTableProps) {
  return (
    <>
      {/* Desktop View - Table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column, idx) => (
                <TableHead key={`${column.accessorKey}-${idx}`}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, rowIndex) => (
              <TableRow key={`row-${rowIndex}`}>
                {columns.map((column, colIndex) => (
                  <TableCell
                    key={`${column.accessorKey}-${rowIndex}-${colIndex}`}
                  >
                    {column.cell
                      ? column.cell(row[column.accessorKey], row)
                      : row[column.accessorKey]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile View - Cards */}
      <div className="space-y-4 md:hidden">
        {data.map((row, rowIndex) => (
          <Card
            key={`card-${rowIndex}`}
            className="shadow-md hover:shadow-lg transition rounded-xl border"
          >
            <CardContent className="pt-6 space-y-3">
              {columns.map((column, colIndex) => (
                <div
                  key={`${column.accessorKey}-${rowIndex}-${colIndex}`}
                  className="flex gap-4 py-2 border-b last:border-none"
                >
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {column.header}:
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {column.cell
                      ? column.cell(row[column.accessorKey], row)
                      : row[column.accessorKey]}
                  </span>
                </div>
              ))}
              {children && <div className="mt-4">{children}</div>}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
