import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ShiftForm from "@/components/shift-form";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: shifts = [], isLoading: isLoadingShifts } = useQuery<ShiftWithRelations[]>({
    queryKey: [user?.isAdmin ? "/api/admin/shifts" : "/api/shifts"],
  });

  return (
    <Navbar>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Shifts</h1>
          {user?.isAdmin && (
            <Button onClick={() => setIsDialogOpen(true)}>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Inspector Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Shift Type</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Week</TableHead>
                <TableHead>Backup Inspector</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.map((shift) => (
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col">
            <ShiftForm onSuccess={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </Navbar>
  );
}