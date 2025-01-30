import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { TablePagination } from "@/components/table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import ShiftForm from "@/components/shift-form";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/navbar";

type ShiftWithRelations = {
  id: number;
  inspectorId: number;
  roleId: number;
  shiftTypeId: number;
  week: string;
  backupId: number | null;
  inspector: { id: number; fullName: string; username: string };
  role: { id: number; name: string };
  shiftType: { id: number; name: string; startTime: string; endTime: string };
  backup?: { id: number; fullName: string; username: string } | null;
};

export default function Shifts() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<ShiftWithRelations | null>(null);
  const [shiftToDelete, setShiftToDelete] = useState<ShiftWithRelations | null>(null);

  // Add pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5); // Set default to 5

  const { data: shifts = [], isLoading: isLoadingShifts } = useQuery<ShiftWithRelations[]>({
    queryKey: [user?.isAdmin || user?.isManager ? "/api/admin/shifts" : "/api/shifts"],
  });

  // Calculate pagination values
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentShifts = shifts.slice(startIndex, endIndex);

  // Handle pagination changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page when changing page size
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

  const handleEdit = (shift: ShiftWithRelations) => {
    setSelectedShift(shift);
    setIsDialogOpen(true);
  };

  return (
    <Navbar>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Shifts</h1>
          {user?.isAdmin && (
            <Button onClick={() => {
              setSelectedShift(null);
              setIsDialogOpen(true);
            }}>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Inspector Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Shift Type</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Week</TableHead>
                  <TableHead>Backup Inspector</TableHead>
                  {user?.isAdmin && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentShifts.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell>{shift.inspector?.fullName || 'Unknown'}</TableCell>
                    <TableCell>{shift.role?.name || 'Unknown'}</TableCell>
                    <TableCell>{shift.shiftType?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      {shift.shiftType?.startTime || 'N/A'} - {shift.shiftType?.endTime || 'N/A'}
                    </TableCell>
                    <TableCell>Week {shift.week}</TableCell>
                    <TableCell>
                      {shift.backup?.fullName || "-"}
                    </TableCell>
                    {user?.isAdmin && (
                      <TableCell className="space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(shift)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShiftToDelete(shift)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <TablePagination
              currentPage={currentPage}
              totalItems={shifts.length}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col">
            <DialogTitle>{selectedShift ? 'Edit Shift' : 'Create New Shift'}</DialogTitle>
            <ShiftForm
              onSuccess={() => {
                setIsDialogOpen(false);
                setSelectedShift(null);
              }}
              editShift={selectedShift}
            />
          </DialogContent>
        </Dialog>

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
      </div>
    </Navbar>
  );
}