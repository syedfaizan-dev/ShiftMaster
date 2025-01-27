import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

type ShiftCalendarProps = {
  userId?: number;
};

export default function ShiftCalendar({ userId }: ShiftCalendarProps) {
  const { data: shifts, isLoading } = useQuery<any[]>({
    queryKey: [userId ? "/api/shifts" : "/api/admin/shifts"],
  });

  const { data: users } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: roles } = useQuery<any[]>({
    queryKey: ["/api/admin/roles"],
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const getInspectorName = (id: number) => {
    const user = users?.find(u => u.id === id);
    return user?.fullName || 'Unknown';
  };

  const getRoleName = (id: number) => {
    const role = roles?.find(r => r.id === id);
    return role?.name || 'Unknown';
  };

  return (
    <div className="grid gap-4">
      {shifts?.map((shift) => (
        <Card key={shift.id}>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">
                  Inspector: {getInspectorName(shift.inspectorId)}
                </p>
                <p className="text-sm text-gray-500">
                  Role: {getRoleName(shift.roleId)}
                </p>
                <p className="text-sm text-gray-500">
                  {format(new Date(shift.startTime), "h:mm a")} -{" "}
                  {format(new Date(shift.endTime), "h:mm a")}
                </p>
                <p className="text-sm text-gray-500">
                  Week: {shift.week}
                </p>
                {shift.backupId && (
                  <p className="text-sm text-gray-500">
                    Backup: {getInspectorName(shift.backupId)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}