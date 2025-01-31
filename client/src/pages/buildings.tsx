import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Navbar from "@/components/navbar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";

interface Building {
  id: number;
  name: string;
  code: string;
  area: string;
  supervisor?: {
    id: number;
    fullName: string;
  };
  coordinators: Array<{
    id: number;
    coordinator: {
      id: number;
      fullName: string;
    };
    shiftType: string;
  }>;
}

export default function BuildingsPage() {
  const columns: ColumnDef<Building>[] = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "code",
      header: "Code",
    },
    {
      accessorKey: "area",
      header: "Area",
    },
    {
      accessorKey: "supervisor",
      header: "Supervisor",
      cell: ({ row }) => row.original.supervisor?.fullName || "Not assigned",
    },
    {
      id: "morningCoordinator",
      header: "Morning Coordinator",
      cell: ({ row }) => {
        const morningCoord = row.original.coordinators.find(
          (c) => c.shiftType === "MORNING"
        );
        return morningCoord?.coordinator.fullName || "Not assigned";
      },
    },
    {
      id: "eveningCoordinator",
      header: "Evening Coordinator",
      cell: ({ row }) => {
        const eveningCoord = row.original.coordinators.find(
          (c) => c.shiftType === "EVENING"
        );
        return eveningCoord?.coordinator.fullName || "Not assigned";
      },
    },
  ];

  const { data: buildings = [], isLoading } = useQuery<Building[]>({
    queryKey: ["buildings"],
    queryFn: async () => {
      const response = await fetch("/api/admin/buildings");
      if (!response.ok) {
        throw new Error("Failed to fetch buildings");
      }
      return response.json();
    },
  });

  const table = useReactTable({
    data: buildings,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (isLoading) {
    return <Navbar>Loading...</Navbar>;
  }

  return (
    <Navbar>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight">Buildings</h1>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Building
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No buildings found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Navbar>
  );
}