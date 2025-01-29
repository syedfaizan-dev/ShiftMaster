import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil } from "lucide-react";
import Navbar from "@/components/navbar";
import * as z from "zod";
import type { Role } from "@db/schema";

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

  const createRole = useMutation({
    mutationFn: async (data: RoleFormData) => {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      const responseText = await res.text();
      if (!res.ok) {
        console.error('Create role failed:', responseText);
        throw new Error(responseText);
      }
      return JSON.parse(responseText);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Role created successfully" });
      setIsDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
    },
    onError: (error: Error) => {
      console.error('Create role error:', error);
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
      console.log('Updating role with data:', { id, ...updateData });

      const res = await fetch(`/api/admin/roles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
        credentials: "include",
      });

      const responseText = await res.text();
      console.log('Update role response:', responseText);

      if (!res.ok) {
        console.error('Update role failed:', responseText);
        throw new Error(responseText);
      }

      try {
        return JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response:', e);
        throw new Error('Invalid server response');
      }
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Role updated successfully" });
      setIsDialogOpen(false);
      setEditingRole(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
    },
    onError: (error: Error) => {
      console.error('Update role error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update role",
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
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <Navbar>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Roles</h1>
          <Button onClick={() => {
            setEditingRole(null);
            form.reset({
              name: "",
              description: "",
            });
            setIsDialogOpen(true);
          }}>
            Create New Role
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>{role.name}</TableCell>
                  <TableCell>{role.description}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingRole(role);
                        form.reset({
                          name: role.name,
                          description: role.description || "",
                        });
                        setIsDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogTitle>
              {editingRole ? 'Edit Role' : 'Create New Role'}
            </DialogTitle>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                      {editingRole ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingRole ? 'Update Role' : 'Create Role'
                  )}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </Navbar>
  );
}

export default RolesPage;