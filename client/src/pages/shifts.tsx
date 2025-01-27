import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
    queryKey: [user?.isAdmin ? "/api/admin/shifts" : "/api/shifts"],
  });

  const { data: users } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: roles } = useQuery<any[]>({
    queryKey: ["/api/admin/roles"],
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
          <div className="grid gap-4">
            {shifts.map((shift) => (
              <Card key={shift.id}>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <h3 className="font-semibold">Inspector: {getInspectorName(shift.inspectorId)}</h3>
                      <span className="text-sm text-gray-500">Week: {shift.week}</span>
                    </div>
                    <p className="text-sm text-gray-600">Role: {getRoleName(shift.roleId)}</p>
                    <p className="text-sm text-gray-600">
                      Time: {format(new Date(shift.startTime), "h:mm a")} - {format(new Date(shift.endTime), "h:mm a")}
                    </p>
                    {shift.backupId && (
                      <p className="text-sm text-gray-600">
                        Backup Inspector: {getInspectorName(shift.backupId)}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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