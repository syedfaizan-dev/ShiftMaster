import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

type ShiftType = {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
};

type Inspector = {
  id: number;
  fullName: string;
  username: string;
};

type ShiftInspector = {
  inspector: Inspector;
  isPrimary: boolean;
};

type DayShift = {
  id: number;
  dayOfWeek: number;
  shiftType: ShiftType;
};

type ShiftWithRelations = {
  id: number;
  week: string;
  groupName: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  rejectionReason: string | null;
  role: { id: number; name: string };
  inspectors: ShiftInspector[];
  days: DayShift[];
};

type ShiftCalendarProps = {
  userId?: number;
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getShiftTypeDisplay = (shiftType?: ShiftType) => {
  if (!shiftType) return '-';
  if (shiftType.name.toLowerCase().includes('morning')) return 'Mo';
  if (shiftType.name.toLowerCase().includes('afternoon')) return 'A';
  if (shiftType.name.toLowerCase().includes('night')) return 'N';
  return '-';
};

const getShiftTypeColor = (shiftType?: ShiftType) => {
  if (!shiftType) return 'bg-white';
  if (shiftType.name.toLowerCase().includes('morning')) return 'bg-blue-50';
  if (shiftType.name.toLowerCase().includes('afternoon')) return 'bg-orange-50';
  if (shiftType.name.toLowerCase().includes('night')) return 'bg-purple-50';
  return 'bg-white';
};

export default function ShiftCalendar({ userId }: ShiftCalendarProps) {
  const { data: shifts, isLoading } = useQuery<ShiftWithRelations[]>({
    queryKey: [userId ? "/api/shifts" : "/api/admin/shifts"],
    queryFn: async () => {
      const response = await fetch(userId ? "/api/shifts" : "/api/admin/shifts", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch shifts");
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!shifts?.length) {
    return (
      <div className="text-center text-muted-foreground">
        No shifts assigned
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {shifts.map((shift) => (
        <Card key={shift.id}>
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold">
                  Week {shift.week} - Group {shift.groupName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Role: {shift.role?.name}
                </p>
              </div>
              <Badge
                variant={
                  shift.status === "ACCEPTED"
                    ? "success"
                    : shift.status === "REJECTED"
                    ? "destructive"
                    : "default"
                }
              >
                {shift.status}
              </Badge>
            </div>

            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 text-left font-medium">Inspectors</th>
                    {DAYS.map(day => (
                      <th key={day} className="p-2 text-center font-medium">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shift.inspectors.map((si, index) => (
                    <tr key={`${si.inspector.id}-${index}`} className="border-b">
                      <td className="p-2">
                        <div className="flex flex-col">
                          <span>{si.inspector.fullName}</span>
                          {si.isPrimary && (
                            <span className="text-xs text-muted-foreground">(Primary)</span>
                          )}
                        </div>
                      </td>
                      {DAYS.map((_, dayIndex) => {
                        const dayShift = shift.days?.find(d => d.dayOfWeek === dayIndex);
                        return (
                          <td key={dayIndex} className={`p-2 text-center ${getShiftTypeColor(dayShift?.shiftType)}`}>
                            {getShiftTypeDisplay(dayShift?.shiftType)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}