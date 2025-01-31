import * as React from "react"

import { cn } from "@/lib/utils"

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b bg-muted/50 hidden md:table-header-group", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0 hidden md:table-footer-group",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      "block md:table-row border-b md:border-b-0 p-4 md:p-0",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, children, ...props }, ref) => {
  // Convert children to string for data attribute
  const headingText = React.Children.toArray(children).join("")

  return (
    <th
      ref={ref}
      className={cn(
        "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
        "hidden md:table-cell", // Hide on mobile, show on desktop
        className
      )}
      data-heading={headingText} // Store heading text for mobile labels
      {...props}
    >
      {children}
    </th>
  )
})
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => {
  // Get the heading text from the closest th element
  const headingText = React.useContext(TableContext)?.getHeadingForCell(props['data-column-index'] as number) || ''

  return (
    <td
      ref={ref}
      className={cn(
        "p-4 align-middle [&:has([role=checkbox])]:pr-0",
        "block md:table-cell relative",
        "before:content-[attr(data-heading)] before:absolute before:font-medium md:before:content-none before:top-2 before:left-4",
        "pt-8 md:pt-4", // Extra padding top on mobile for label
        className
      )}
      data-heading={headingText}
      {...props}
    />
  )
})
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

// Create a context to share table header information
const TableContext = React.createContext<{
  getHeadingForCell: (index: number) => string
} | null>(null)

// Provider component to manage table header information
const TableProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [headings, setHeadings] = React.useState<string[]>([])

  const getHeadingForCell = React.useCallback((index: number) => {
    return headings[index] || ''
  }, [headings])

  React.useEffect(() => {
    // Collect all table header texts on mount
    const headers = document.querySelectorAll('th[data-heading]')
    setHeadings(Array.from(headers).map(header => header.getAttribute('data-heading') || ''))
  }, [])

  return (
    <TableContext.Provider value={{ getHeadingForCell }}>
      {children}
    </TableContext.Provider>
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  TableProvider
}