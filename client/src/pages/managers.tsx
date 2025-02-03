import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/navbar";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { TablePagination } from "@/components/table-pagination";
import { useState } from "react";
import { CreateManagerModal } from "@/components/create-manager-modal";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2 } from "lucide-react";

interface Manager {
  id: number;
  username: string;
  fullName: string;
}

export default function ManagersPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [editingManager, setEditingManager] = useState<Manager | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { toast } = useToast();

  const columns = [
    {
      header: "Full Name",
      accessorKey: "fullName",
    },
    {
      header: "Username",
      accessorKey: "username",
    },
    {
      header: "Actions",
      accessorKey: "id",
      cell: (value: any, row: any) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditingManager(row);
              setIsEditModalOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(row.id)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const {
    data: managers = [],
    isLoading,
    refetch,
  } = useQuery<Manager[]>({
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

        <div>
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
              setIsEditModalOpen(false);
            }}
            manager={editingManager}
            open={isEditModalOpen}
            onOpenChange={setIsEditModalOpen}
          />
        )}
      </div>
    </Navbar>
  );
}
