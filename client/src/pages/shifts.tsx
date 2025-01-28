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
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/navbar";

export default function Shifts() {
  const { user } = useUser();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: shifts = [], isLoading: isLoadingShifts } = useQuery<any[]>({
    queryKey: [user?.isSupervisor ? "/api/admin/shifts" : "/api/shifts"],
  });

  const { data: users } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    enabled: user?.isSupervisor,
  });

  const { data: roles } = useQuery<any[]>({
    queryKey: ["/api/admin/roles"],
    enabled: user?.isSupervisor,
  });

  const getInspectorName = (id: number) => {
    const inspector = users?.find(u => u.id === id);
    return inspector?.fullName || 'Unknown';
  };

  const getRoleName = (id: number) => {
    const role = roles?.find(r => r.id === id);
    return role?.name || 'Unknown';
  };

  return (
    <Navbar>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Shifts</h1>
          {user?.isSupervisor && (
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
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Week</TableHead>
                <TableHead>Backup Inspector</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.map((shift) => (
                <TableRow key={shift.id}>
                  <TableCell>{getInspectorName(shift.inspectorId)}</TableCell>
                  <TableCell>{getRoleName(shift.roleId)}</TableCell>
                  <TableCell>{format(new Date(shift.startTime), "MMM d, yyyy")}</TableCell>
                  <TableCell>
                    {format(new Date(shift.startTime), "h:mm a")} - {format(new Date(shift.endTime), "h:mm a")}
                  </TableCell>
                  <TableCell>{shift.week}</TableCell>
                  <TableCell>
                    {shift.backupId ? getInspectorName(shift.backupId) : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <ShiftForm onSuccess={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </Navbar>
  );
}