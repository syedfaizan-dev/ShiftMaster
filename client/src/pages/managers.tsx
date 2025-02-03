import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/navbar";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { TablePagination } from "@/components/table-pagination";
import { useState } from "react";
import { CreateManagerModal } from "@/components/create-manager-modal";
import { useToast } from "@/hooks/use-toast";
import type { ColumnDef } from "@tanstack/react-table";

interface Manager {
  id: number;
  username: string;
  fullName: string;
}

export default function ManagersPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [editingManager, setEditingManager] = useState<Manager | null>(null);
  const { toast } = useToast();

  const columns: ColumnDef<Manager>[] = [
    {
      header: "Full Name",
      accessorKey: "fullName",
    },
    {
      header: "Username",
      accessorKey: "username",
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const manager = row.original;
        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingManager(manager)}
            >
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDelete(manager.id)}
            >
              Delete
            </Button>
          </div>
        );
      },
    },
  ];

  const { data: managers = [], isLoading, refetch } = useQuery<Manager[]>({
    queryKey: ["managers"],
    queryFn: async () => {
      const response = await fetch("/api/admin/managers");
      if (!response.ok) {
        throw new Error("Failed to fetch managers");
      }
      return response.json();
    },
  });

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete manager");
      }

      toast({
        title: "Success",
        description: "Manager deleted successfully",
      });

      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete manager",
        variant: "destructive",
      });
    }
  };

  // Calculate pagination values
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  // Handle pagination changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  if (isLoading) {
    return <Navbar>Loading...</Navbar>;
  }

  return (
    <Navbar>
      <div className="space-y-4 p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight">Managers</h1>
          <CreateManagerModal onSuccess={refetch} />
        </div>

        <div className="rounded-md border">
          <ResponsiveTable 
            columns={columns}
            data={managers.slice(startIndex, endIndex)}
          />
          <TablePagination
            currentPage={currentPage}
            totalItems={managers.length}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>

        {editingManager && (
          <CreateManagerModal
            onSuccess={() => {
              refetch();
              setEditingManager(null);
            }}
            manager={editingManager}
          />
        )}
      </div>
    </Navbar>
  );
}