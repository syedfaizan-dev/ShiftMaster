import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import Navbar from "@/components/navbar";
import * as z from "zod";
import type { Role } from "@db/schema";
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
import { TablePagination } from "@/components/table-pagination";

const roleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

type RoleFormData = z.infer<typeof roleSchema>;

function RolesPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const { data: roles = [], isLoading } = useQuery<Role[]>({
    queryKey: ["/api/admin/roles"],
    enabled: user?.isAdmin,
  });

  const columns = [
    {
      header: "Name",
      accessorKey: "name",
    },
    {
      header: "Description",
      accessorKey: "description",
      cell: (value: string | null) => value || "—",
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
              const role = roles.find((r) => r.id === value);
              if (role) {
                setEditingRole(role);
                form.reset({
                  name: role.name,
                  description: role.description || "",
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
              const role = roles.find((r) => r.id === value);
              if (role) setRoleToDelete(role);
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  // Transform the data for the table
  const transformedData = roles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
  }));

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const createRole = useMutation({
    mutationFn: async (data: RoleFormData) => {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }

      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Role created successfully" });
      setIsDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create role",
      });
    },
  });

  const updateRole = useMutation({
    mutationFn: async (data: RoleFormData & { id: number }) => {
      const { id, ...updateData } = data;
      const res = await fetch(`/api/admin/roles/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(updateData),
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to update role");
      }

      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Role updated successfully" });
      setIsDialogOpen(false);
      setEditingRole(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update role",
      });
    },
  });

  const deleteRole = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/roles/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to delete role");
      }
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Role deleted successfully" });
      setRoleToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete role",
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

  const handleSubmit = async (data: RoleFormData) => {
    try {
      if (editingRole) {
        await updateRole.mutateAsync({ ...data, id: editingRole.id });
      } else {
        await createRole.mutateAsync(data);
      }
    } catch (error: any) {
      console.error("Form submission error:", error.message);
    }
  };

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  return (
    <Navbar>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Roles</h1>
          <Button
            onClick={() => {
              setEditingRole(null);
              form.reset({
                name: "",
                description: "",
              });
              setIsDialogOpen(true);
            }}
          >
            Create New Role
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div>
            <ResponsiveTable
              columns={columns}
              data={transformedData.slice(startIndex, endIndex)}
            />
            <TablePagination
              currentPage={currentPage}
              totalItems={transformedData.length}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogTitle>
              {editingRole ? "Edit Role" : "Create New Role"}
            </DialogTitle>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={createRole.isPending || updateRole.isPending}
                >
                  {createRole.isPending || updateRole.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {editingRole ? "Updating..." : "Creating..."}
                    </>
                  ) : editingRole ? (
                    "Update Role"
                  ) : (
                    "Create Role"
                  )}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={!!roleToDelete}
          onOpenChange={(open) => !open && setRoleToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Role</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the role "{roleToDelete?.name}"?
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() =>
                  roleToDelete && deleteRole.mutate(roleToDelete.id)
                }
                disabled={deleteRole.isPending}
              >
                {deleteRole.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Navbar>
  );
}

export default RolesPage;
