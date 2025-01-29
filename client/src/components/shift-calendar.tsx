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

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {shifts?.map((shift) => (
        <Card key={shift.id}>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">
                  Inspector: {shift.inspector?.fullName || 'Unknown'}
                </p>
                <p className="text-sm text-gray-500">
                  Role: {shift.role?.name || 'Unknown'}
                </p>
                <p className="text-sm text-gray-500">
                  {shift.shiftType?.name || 'Unknown'} ({shift.shiftType?.startTime || 'N/A'} - {shift.shiftType?.endTime || 'N/A'})
                </p>
                <p className="text-sm text-gray-500">
                  Week: {shift.week}
                </p>
                {shift.backup && (
                  <p className="text-sm text-gray-500">
                    Backup: {shift.backup.fullName}
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