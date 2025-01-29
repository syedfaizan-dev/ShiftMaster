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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Navbar from "@/components/navbar";
import * as z from "zod";
import type { User } from "@db/schema";

const userSchema = z.object({
  username: z.string().email("Invalid email format"),
  fullName: z.string().min(1, "Full name is required"),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  isAdmin: z.boolean().default(false),
  isManager: z.boolean().default(false),
  isInspector: z.boolean().default(false),
});

type UserFormData = z.infer<typeof userSchema>;

function UsersPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      fullName: "",
      password: "",
      isAdmin: false,
      isManager: false,
      isInspector: false,
    },
  });

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: user?.isAdmin,
  });

  const createUser = useMutation({
    mutationFn: async (data: UserFormData) => {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "User created successfully" });
      setIsDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const updateUser = useMutation({
    mutationFn: async (data: UserFormData & { id: number }) => {
      const { id, ...updateData } = data;
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "User updated successfully" });
      setIsDialogOpen(false);
      setEditingUser(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  if (!user?.isAdmin) {
    return (
      <Navbar>
        <div className="p-6">
          <Alert variant="destructive">
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You don't have permission to access this page.
            </AlertDescription>
          </Alert>
        </div>
      </Navbar>
    );
  }

  const getRoleLabel = (user: User) => {
    if (user.isAdmin) return "Admin";
    if (user.isManager) return "Manager";
    if (user.isInspector) return "Inspector";
    return "Employee";
  };

  const handleRoleChange = (value: string) => {
    form.setValue("isAdmin", value === "admin");
    form.setValue("isManager", value === "manager");
    form.setValue("isInspector", value === "inspector");
  };

  const getCurrentRole = (formValues: UserFormData) => {
    if (formValues.isAdmin) return "admin";
    if (formValues.isManager) return "manager";
    if (formValues.isInspector) return "inspector";
    return "employee";
  };

  return (
    <Navbar>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Users</h1>
          <Button onClick={() => {
            setEditingUser(null);
            form.reset();
            setIsDialogOpen(true);
          }}>
            Add New User
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
                <TableHead>Full Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.fullName}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{getRoleLabel(user)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingUser(user);
                        form.reset({
                          username: user.username,
                          fullName: user.fullName,
                          isAdmin: user.isAdmin,
                          isManager: user.isManager,
                          isInspector: user.isInspector,
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
              {editingUser ? 'Edit User' : 'Add New User'}
            </DialogTitle>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => {
                if (editingUser) {
                  updateUser.mutate({ ...data, id: editingUser.id });
                } else {
                  createUser.mutate(data);
                }
              })} className="space-y-4">
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
                {!editingUser && (
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
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={handleRoleChange}
                    value={getCurrentRole(form.getValues())}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="inspector">Inspector</SelectItem>
                      <SelectItem value="employee">Employee</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
                <Button type="submit" disabled={createUser.isPending || updateUser.isPending}>
                  {editingUser ? 'Update User' : 'Add User'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </Navbar>
  );
}

export default UsersPage;