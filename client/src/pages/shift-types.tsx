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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
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
      toast({ title: "Success", description: "Shift type created successfully" });
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
      toast({ title: "Success", description: "Shift type updated successfully" });
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

  const onSubmit = async (data: ShiftTypeFormData) => {
    try {
      if (selectedShiftType) {
        await updateShiftType.mutateAsync({ ...data, id: selectedShiftType.id });
      } else {
        await createShiftType.mutateAsync(data);
      }
    } catch (error) {
      console.error('Shift type operation failed:', error);
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
          <Button onClick={() => {
            setSelectedShiftType(null);
            form.reset();
            setIsDialogOpen(true);
          }}>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shiftTypes.map((shiftType: any) => (
                <TableRow key={shiftType.id}>
                  <TableCell>{shiftType.name}</TableCell>
                  <TableCell>{shiftType.startTime}</TableCell>
                  <TableCell>{shiftType.endTime}</TableCell>
                  <TableCell>{shiftType.description || "-"}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(shiftType)}
                    >
                      Edit
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
              {selectedShiftType ? "Edit Shift Type" : "Create Shift Type"}
            </DialogTitle>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  disabled={createShiftType.isPending || updateShiftType.isPending}
                >
                  {selectedShiftType ? "Update" : "Create"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </Navbar>
  );
}

export default ShiftTypesPage;
