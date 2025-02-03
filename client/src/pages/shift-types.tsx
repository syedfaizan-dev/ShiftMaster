import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ResponsiveTable } from "@/components/ui/responsive-table";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Navbar from "@/components/navbar";
import * as z from "zod";

const shiftTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  description: z.string().optional(),
});

type ShiftTypeFormData = z.infer<typeof shiftTypeSchema>;

function ShiftTypesPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedShiftType, setSelectedShiftType] = useState<any>(null);
  const [shiftTypeToDelete, setShiftTypeToDelete] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const form = useForm<ShiftTypeFormData>({
    resolver: zodResolver(shiftTypeSchema),
    defaultValues: {
      name: "",
      startTime: "",
      endTime: "",
      description: "",
    },
  });

  const { data: shiftTypes = [], isLoading } = useQuery({
    queryKey: ["/api/shift-types"],
  });

  const columns = [
    {
      header: "Name",
      accessorKey: "name",
    },
    {
      header: "Start Time",
      accessorKey: "startTime",
    },
    {
      header: "End Time",
      accessorKey: "endTime",
    },
    {
      header: "Description",
      accessorKey: "description",
      cell: (value: any) => value || "-",
    },
    {
      header: "Actions",
      accessorKey: "id",
      cell: (value: any) => (
        <div className="space-x-2">
          <Button variant="ghost" size="icon" onClick={() => handleEdit(value)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShiftTypeToDelete(value)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  // Transform the data for the table
  const transformedData = shiftTypes.map((shiftType: any) => ({
    id: shiftType.id,
    name: shiftType.name,
    startTime: shiftType.startTime,
    endTime: shiftType.endTime,
    description: shiftType.description,
  }));

  // Calculate pagination values
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  // Handle pagination changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const createShiftType = useMutation({
    mutationFn: async (data: ShiftTypeFormData) => {
      const res = await fetch("/api/admin/shift-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Shift type created successfully",
      });
      setIsDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/shift-types"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const updateShiftType = useMutation({
    mutationFn: async (data: ShiftTypeFormData & { id: number }) => {
      const res = await fetch(`/api/admin/shift-types/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Shift type updated successfully",
      });
      setIsDialogOpen(false);
      form.reset();
      setSelectedShiftType(null);
      queryClient.invalidateQueries({ queryKey: ["/api/shift-types"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const deleteShiftType = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/shift-types/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Shift type deleted successfully",
      });
      setShiftTypeToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/shift-types"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const onSubmit = async (data: ShiftTypeFormData) => {
    try {
      if (selectedShiftType) {
        await updateShiftType.mutateAsync({
          ...data,
          id: selectedShiftType.id,
        });
      } else {
        await createShiftType.mutateAsync(data);
      }
    } catch (error) {
      console.error("Shift type operation failed:", error);
    }
  };

  const handleEdit = (shiftType: any) => {
    setSelectedShiftType(shiftType);
    form.reset({
      name: shiftType.name,
      startTime: shiftType.startTime,
      endTime: shiftType.endTime,
      description: shiftType.description || "",
    });
    setIsDialogOpen(true);
  };

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

  return (
    <Navbar>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Shift Types</h1>
          <Button
            onClick={() => {
              setSelectedShiftType(null);
              form.reset();
              setIsDialogOpen(true);
            }}
          >
            Create Shift Type
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : shiftTypes.length === 0 ? (
          <Alert>
            <AlertTitle>No Shift Types Found</AlertTitle>
            <AlertDescription>
              Create your first shift type to start managing shifts.
            </AlertDescription>
          </Alert>
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
              {selectedShiftType ? "Edit Shift Type" : "Create Shift Type"}
            </DialogTitle>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
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
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
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
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={
                    createShiftType.isPending || updateShiftType.isPending
                  }
                >
                  {selectedShiftType ? "Update" : "Create"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={!!shiftTypeToDelete}
          onOpenChange={(open) => !open && setShiftTypeToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Shift Type</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the shift type "
                {shiftTypeToDelete?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() =>
                  shiftTypeToDelete &&
                  deleteShiftType.mutate(shiftTypeToDelete.id)
                }
                disabled={deleteShiftType.isPending}
              >
                {deleteShiftType.isPending ? (
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

export default ShiftTypesPage;
