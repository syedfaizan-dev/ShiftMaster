import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/navbar";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { TablePagination } from "@/components/table-pagination";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

interface Inspector {
  id: number;
  username: string;
  fullName: string;
}

const inspectorSchema = z.object({
  username: z.string().email("Invalid email format").min(1, "Username is required"),
  fullName: z.string().min(1, "Full name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const editInspectorSchema = z.object({
  username: z.string().email("Invalid email format").min(1, "Username is required"),
  fullName: z.string().min(1, "Full name is required"),
  password: z.string().optional(),
});

export default function InspectorsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInspector, setEditingInspector] = useState<Inspector | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof editInspectorSchema>>({
    resolver: zodResolver(editingInspector ? editInspectorSchema : inspectorSchema),
    defaultValues: {
      username: "",
      fullName: "",
      password: "",
    },
  });

  const { data: inspectors = [], isLoading, refetch } = useQuery<Inspector[]>({
    queryKey: ["/api/admin/inspectors"],
    queryFn: async () => {
      const response = await fetch("/api/admin/inspectors", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch inspectors");
      }
      return response.json();
    },
  });

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
      cell: (value: any) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEdit(value)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(value)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const handleEdit = (inspector: Inspector) => {
    setEditingInspector(inspector);
    form.reset({
      username: inspector.username,
      fullName: inspector.fullName,
      password: "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete inspector");
      }

      toast({
        title: "Success",
        description: "Inspector deleted successfully",
      });

      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete inspector",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (values: z.infer<typeof editInspectorSchema>) => {
    try {
      const url = editingInspector 
        ? `/api/admin/users/${editingInspector.id}`
        : "/api/admin/users";

      const method = editingInspector ? "PUT" : "POST";

      const payload = {
        ...values,
        isInspector: true,
        ...((!editingInspector || values.password) && { password: values.password }),
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save inspector");
      }

      toast({
        title: "Success",
        description: `Inspector ${editingInspector ? "updated" : "created"} successfully`,
      });

      setIsDialogOpen(false);
      form.reset();
      setEditingInspector(null);
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save inspector",
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
    return (
      <Navbar>
        <div className="p-6 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Navbar>
    );
  }

  return (
    <Navbar>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Inspectors</h1>
          <Button onClick={() => {
            setEditingInspector(null);
            form.reset();
            setIsDialogOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Inspector
          </Button>
        </div>

        {inspectors.length === 0 ? (
          <Alert>
            <AlertTitle>No Inspectors Found</AlertTitle>
            <AlertDescription>
              Add your first inspector to get started.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="rounded-md border">
            <ResponsiveTable 
              columns={columns}
              data={inspectors.slice(startIndex, endIndex)}
            />
            <TablePagination
              currentPage={currentPage}
              totalItems={inspectors.length}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingInspector ? "Edit Inspector" : "Add Inspector"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username (Email)</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {editingInspector ? "Password (Leave empty to keep current)" : "Password"}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          {...field} 
                          required={!editingInspector}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit">
                  {editingInspector ? "Update" : "Create"} Inspector
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </Navbar>
  );
}