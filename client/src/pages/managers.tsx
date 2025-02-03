import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import Navbar from "@/components/navbar";
import * as z from "zod";
import type { User } from "@db/schema";
import { TablePagination } from "@/components/table-pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const managerSchema = z.object({
  username: z.string().email("Invalid email format"),
  fullName: z.string().min(1, "Full name is required"),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
});

type ManagerFormData = z.infer<typeof managerSchema>;

function ManagersPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingManager, setEditingManager] = useState<User | null>(null);
  const [managerToDelete, setManagerToDelete] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const form = useForm<ManagerFormData>({
    resolver: zodResolver(managerSchema),
    defaultValues: {
      username: "",
      fullName: "",
      password: "",
    },
  });

  const { data: managers = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users/managers"],
    enabled: user?.isAdmin,
  });

  const columns = [
    {
      header: "Full Name",
      accessorKey: "fullName",
    },
    {
      header: "Email",
      accessorKey: "username",
    },
    {
      header: "Actions",
      accessorKey: "id",
      cell: (value: any) => (
        <div className="space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const manager = managers.find(r => r.id === value);
              if (manager) {
                setEditingManager(manager);
                form.reset({
                  username: manager.username,
                  fullName: manager.fullName,
                });
                setIsDialogOpen(true);
              }
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const manager = managers.find(r => r.id === value);
              if (manager) setManagerToDelete(manager);
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const createManager = useMutation({
    mutationFn: async (data: ManagerFormData) => {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          isAdmin: false,
          isManager: true,
          isInspector: false,
        }),
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }

      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Manager created successfully" });
      setIsDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/managers"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create manager",
      });
    },
  });

  const updateManager = useMutation({
    mutationFn: async (data: ManagerFormData & { id: number }) => {
      const { id, ...updateData } = data;
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          ...updateData,
          isAdmin: false,
          isManager: true,
          isInspector: false,
        }),
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to update manager");
      }

      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Manager updated successfully" });
      setIsDialogOpen(false);
      setEditingManager(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/managers"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update manager",
      });
    },
  });

  const deleteManager = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to delete manager");
      }
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Manager deleted successfully" });
      setManagerToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/managers"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete manager",
      });
    },
  });

  if (!user?.isAdmin) {
    return (
      <Navbar>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p>You do not have permission to view this page.</p>
        </div>
      </Navbar>
    );
  }

  const handleSubmit = async (data: ManagerFormData) => {
    try {
      if (editingManager) {
        await updateManager.mutateAsync({ ...data, id: editingManager.id });
      } else {
        await createManager.mutateAsync(data);
      }
    } catch (error: any) {
      console.error('Form submission error:', error.message);
    }
  };

  return (
    <Navbar>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Managers</h1>
          <Button onClick={() => {
            setEditingManager(null);
            form.reset({
              username: "",
              fullName: "",
              password: "",
            });
            setIsDialogOpen(true);
          }}>
            Add New Manager
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
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
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogTitle>
              {editingManager ? 'Edit Manager' : 'Create New Manager'}
            </DialogTitle>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {!editingManager && (
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <Button
                  type="submit"
                  disabled={createManager.isPending || updateManager.isPending}
                >
                  {createManager.isPending || updateManager.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {editingManager ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingManager ? 'Update Manager' : 'Create Manager'
                  )}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!managerToDelete} onOpenChange={(open) => !open && setManagerToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Manager</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the manager "{managerToDelete?.fullName}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => managerToDelete && deleteManager.mutate(managerToDelete.id)}
                disabled={deleteManager.isPending}
              >
                {deleteManager.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Navbar>
  );
}

export default ManagersPage;
