import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/navbar";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { TablePagination } from "@/components/table-pagination";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

interface Inspector {
  id: number;
  username: string;
  fullName: string;
}

const inspectorSchema = z.object({
  username: z
    .string()
    .email("Invalid email format")
    .min(1, "Username is required"),
  fullName: z.string().min(1, "Full name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const editInspectorSchema = z.object({
  username: z
    .string()
    .email("Invalid email format")
    .min(1, "Username is required"),
  fullName: z.string().min(1, "Full name is required"),
  password: z.string().optional(),
});

export default function InspectorsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInspector, setEditingInspector] = useState<Inspector | null>(
    null,
  );
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof editInspectorSchema>>({
    resolver: zodResolver(
      editingInspector ? editInspectorSchema : inspectorSchema,
    ),
    defaultValues: {
      username: "",
      fullName: "",
      password: "",
    },
  });

  const { data: inspectors = [], isLoading } = useQuery<Inspector[]>({
    queryKey: ["/api/admin/inspectors"],
  });

  const createInspector = useMutation({
    mutationFn: async (data: z.infer<typeof inspectorSchema>) => {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, isInspector: true }),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create inspector");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Inspector created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/inspectors"] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const updateInspector = useMutation({
    mutationFn: async (
      data: z.infer<typeof editInspectorSchema> & { id: number },
    ) => {
      const { id, ...updateData } = data;
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...updateData,
          isInspector: true,
          ...(updateData.password && { password: updateData.password }),
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update inspector");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Inspector updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/inspectors"] });
      setIsDialogOpen(false);
      setEditingInspector(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const deleteInspector = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete inspector");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Inspector deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/inspectors"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const handleEdit = (inspector: Inspector) => {
    setEditingInspector(inspector);
    form.reset({
      username: inspector.username,
      fullName: inspector.fullName,
      password: "",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: z.infer<typeof editInspectorSchema>) => {
    if (editingInspector) {
      await updateInspector.mutateAsync({ ...data, id: editingInspector.id });
    } else {
      await createInspector.mutateAsync(
        data as z.infer<typeof inspectorSchema>,
      );
    }
  };

  // Calculate pagination values
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = inspectors.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

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
      cell: (value: any, row: any) => {
        return (
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => handleEdit(row)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    the inspector.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteInspector.mutate(row.id)}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      },
    },
  ];

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
          <Button
            onClick={() => {
              setEditingInspector(null);
              form.reset({
                username: "",
                fullName: "",
                password: "",
              });
              setIsDialogOpen(true);
            }}
          >
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
            <ResponsiveTable columns={columns} data={paginatedData} />
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
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
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
                        {editingInspector
                          ? "Password (Leave empty to keep current)"
                          : "Password"}
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

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingInspector(null);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      createInspector.isPending || updateInspector.isPending
                    }
                  >
                    {(createInspector.isPending ||
                      updateInspector.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingInspector ? "Update" : "Create"} Inspector
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </Navbar>
  );
}
