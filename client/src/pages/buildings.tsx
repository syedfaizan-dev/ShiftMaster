import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from "@/components/ui/dialog";
import { TablePagination } from "@/components/table-pagination";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import * as z from "zod";
import Navbar from "@/components/navbar";
import { ResponsiveTable } from "@/components/ui/responsive-table";
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
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import { BuildingsOverview } from "@/components/buildings-overview";

const buildingSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  area: z.string().optional(),
  supervisorId: z.string().min(1, "Supervisor is required"),
});

type BuildingFormData = z.infer<typeof buildingSchema>;

type Building = {
  id: number;
  name: string;
  code: string;
  area: string;
  supervisorId: number | null;
  createdAt: string;
  updatedAt: string;
};

type AdminUser = {
  id: number;
  fullName: string;
};

export default function Buildings() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const form = useForm<BuildingFormData>({
    resolver: zodResolver(buildingSchema),
    defaultValues: {
      name: "",
      code: "",
      area: "",
      supervisorId: "",
    },
  });

  const { data: buildings = [], isLoading } = useQuery<Building[]>({
    queryKey: ["/api/admin/buildings"],
    enabled: user?.isAdmin,
  });

  // Add query for admin users
  const { data: adminUsers = [] } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin-users"],
    enabled: user?.isAdmin,
  });

  // Calculate pagination values
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentBuildings = buildings?.slice(startIndex, endIndex) || [];

  const createBuilding = useMutation({
    mutationFn: async (data: BuildingFormData) => {
      const res = await fetch("/api/admin/buildings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Building created successfully" });
      setIsDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/buildings"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const updateBuilding = useMutation({
    mutationFn: async (data: BuildingFormData & { id: number }) => {
      const { id, ...updateData } = data;
      const res = await fetch(`/api/admin/buildings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Building updated successfully" });
      setIsDialogOpen(false);
      setEditingBuilding(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/buildings"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const deleteBuilding = useMutation({
    mutationFn: async (buildingId: number) => {
      const res = await fetch(`/api/admin/buildings/${buildingId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Building deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/buildings"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const handleOpenDialog = (building?: Building) => {
    if (building) {
      setEditingBuilding(building);
      form.reset({
        name: building.name,
        code: building.code,
        area: building.area || "",
        supervisorId: building.supervisorId?.toString() || "",
      });
    } else {
      setEditingBuilding(null);
      form.reset({
        name: "",
        code: "",
        area: "",
        supervisorId: "",
      });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: BuildingFormData) => {
    if (editingBuilding) {
      await updateBuilding.mutateAsync({ ...data, id: editingBuilding.id });
    } else {
      await createBuilding.mutateAsync(data);
    }
  };

  const columns = [
    {
      header: "Name",
      accessorKey: "name",
    },
    {
      header: "Code",
      accessorKey: "code",
    },
    {
      header: "Area",
      accessorKey: "area",
    },
    {
      header: "Supervisor",
      accessorKey: "supervisorId",
      cell: (value: number | null) => {
        const supervisor = adminUsers.find((user) => user.id === value);
        return <span>{supervisor?.fullName || "Not assigned"}</span>;
      },
    },
    {
      header: "Actions",
      accessorKey: "id",
      cell: (value: any, row: Building) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenDialog(row)}
          >
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
                  This action cannot be undone. This will permanently delete the building.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteBuilding.mutate(value)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

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

  if (isLoading) {
    return (
      <Navbar>
        <div className="p-6">
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </Navbar>
    );
  }

  return (
    <Navbar>
      <div className="p-6 space-y-8">
        {/* Buildings Overview Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Buildings Overview</h2>
          <BuildingsOverview />
        </div>

        {/* Building Management Section */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Building Management</h2>
            <Button onClick={() => handleOpenDialog()}>Add Building</Button>
          </div>

          {buildings?.length === 0 ? (
            <Alert>
              <AlertTitle>No Buildings Found</AlertTitle>
              <AlertDescription>
                Create your first building to start managing buildings.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="rounded-md border">
                <ResponsiveTable
                  columns={columns}
                  data={currentBuildings}
                />
              </div>

              <TablePagination
                currentPage={currentPage}
                totalItems={buildings?.length || 0}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </>
          )}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingBuilding ? 'Edit Building' : 'Add New Building'}
              </DialogTitle>
              <DialogDescription>
                Fill in the details below to {editingBuilding ? 'update the' : 'create a new'} building.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4 py-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="area"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Area</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="supervisorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supervisor</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a supervisor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {adminUsers.map((admin) => (
                            <SelectItem
                              key={admin.id}
                              value={admin.id.toString()}
                            >
                              {admin.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingBuilding(null);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createBuilding.isPending || updateBuilding.isPending}
                  >
                    {createBuilding.isPending || updateBuilding.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {editingBuilding ? 'Update Building' : 'Add Building'}
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