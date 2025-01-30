import * as React from "react"
import { cn } from "@/lib/utils"
import { Table } from "./table"

interface TableContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const TableContainer = React.forwardRef<
  HTMLDivElement,
  TableContainerProps
>(({ className, children, ...props }, ref) => {
  return (
    <div className="relative overflow-x-auto" ref={ref} {...props}>
      <div className={cn("w-full rounded-lg border", className)}>
        {children}
      </div>
    </div>
  );
});
TableContainer.displayName = "TableContainer";

export { TableContainer };
