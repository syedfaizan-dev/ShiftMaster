import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { TablePagination } from "@/components/table-pagination";
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
} from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Trash2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Navbar from "@/components/navbar";

type ShiftWithRelations = {
  id: number;
  inspectorId: number;
  roleId: number;
  shiftTypeId: number;
  buildingId: number;
  week: string;
  backupId: number | null;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  responseAt: string | null;
  rejectionReason: string | null;
  inspector: { id: number; fullName: string; username: string };
  role: { id: number; name: string };
  shiftType: { id: number; name: string; startTime: string; endTime: string };
  backup?: { id: number; fullName: string; username: string } | null;
  building: { id: number; name: string; code: string; area: string };
};

const rejectShiftSchema = z.object({
  rejectionReason: z.string().min(1, "Please provide a reason for rejection"),
});

export default function Shifts() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [shiftToDelete, setShiftToDelete] = useState<ShiftWithRelations | null>(null);
  const [shiftToReject, setShiftToReject] = useState<ShiftWithRelations | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const form = useForm<{ rejectionReason: string }>({
    resolver: zodResolver(rejectShiftSchema),
    defaultValues: {
      rejectionReason: "",
    },
  });

  const { data: shifts = [], isLoading: isLoadingShifts } = useQuery<ShiftWithRelations[]>({
    queryKey: [user?.isAdmin || user?.isManager ? "/api/admin/shifts" : "/api/shifts"],
  });

  // Calculate pagination values
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentShifts = shifts.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const deleteShift = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/shifts/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Shift deleted successfully" });
      setShiftToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const respondToShift = useMutation({
    mutationFn: async ({ id, action, rejectionReason }: { id: number; action: 'ACCEPT' | 'REJECT'; rejectionReason?: string }) => {
      const res = await fetch(`/api/shifts/${id}/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, rejectionReason }),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Response submitted successfully" });
      setShiftToReject(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shifts"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const handleAccept = (shift: ShiftWithRelations) => {
    respondToShift.mutate({ id: shift.id, action: 'ACCEPT' });
  };

  const handleReject = async (data: { rejectionReason: string }) => {
    if (!shiftToReject) return;
    await respondToShift.mutateAsync({
      id: shiftToReject.id,
      action: 'REJECT',
      rejectionReason: data.rejectionReason,
    });
  };

  const columns = [
    {
      header: "Inspector Name",
      accessorKey: "inspector",
      cell: (value: { fullName: string }) => value?.fullName || 'Unknown',
    },
    {
      header: "Role",
      accessorKey: "role",
      cell: (value: { name: string }) => value?.name || 'Unknown',
    },
    {
      header: "Shift Type",
      accessorKey: "shiftType",
      cell: (value: { name: string }) => value?.name || 'Unknown',
    },
    {
      header: "Building",
      accessorKey: "building",
      cell: (value: { name: string; code: string }) =>
        value ? `${value.name} (${value.code})` : 'Unknown',
    },
    {
      header: "Time",
      accessorKey: "shiftType",
      cell: (value: { startTime: string; endTime: string }) =>
        `${value?.startTime || 'N/A'} - ${value?.endTime || 'N/A'}`,
    },
    {
      header: "Week",
      accessorKey: "week",
      cell: (value: string) => `Week ${value}`,
    },
    {
      header: "Backup Inspector",
      accessorKey: "backup",
      cell: (value: { fullName: string } | null) => value?.fullName || "-",
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (value: string) => value || "PENDING",
    },
    {
      header: "Actions",
      accessorKey: "id",
      cell: (_: any, row: ShiftWithRelations) => (
        <div className="space-x-2">
          {(!user?.isAdmin && row.status === 'PENDING') ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleAccept(row)}
                disabled={respondToShift.isPending}
              >
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShiftToReject(row)}
                disabled={respondToShift.isPending}
              >
                <X className="h-4 w-4 text-red-600" />
              </Button>
            </>
          ) : user?.isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShiftToDelete(row)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <Navbar>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Shifts</h1>
          {user?.isAdmin && (
            <Button onClick={() => setLocation("/create-shift")}>
              Create New Shift
            </Button>
          )}
        </div>

        {isLoadingShifts ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : shifts.length === 0 ? (
          <p className="text-center text-gray-500">No shifts found</p>
        ) : (
          <>
            <div className="rounded-md border">
              <ResponsiveTable
                columns={columns}
                data={currentShifts}
              />
            </div>

            <TablePagination
              currentPage={currentPage}
              totalItems={shifts.length}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </>
        )}


        <AlertDialog open={!!shiftToDelete} onOpenChange={(open) => !open && setShiftToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Shift</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this shift? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => shiftToDelete && deleteShift.mutate(shiftToDelete.id)}
                disabled={deleteShift.isPending}
              >
                {deleteShift.isPending ? (
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

        <Dialog open={!!shiftToReject} onOpenChange={(open) => !open && setShiftToReject(null)}>
          <DialogContent>
            <DialogTitle>Reject Shift</DialogTitle>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleReject)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="rejectionReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Rejection</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Please provide a reason for rejecting this shift" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShiftToReject(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={respondToShift.isPending}
                  >
                    {respondToShift.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </Navbar>
  );
}