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
                  {format(new Date(shift.startTime), "PPP")}
                </p>
                <p className="text-sm text-gray-500">
                  {format(new Date(shift.startTime), "p")} -{" "}
                  {format(new Date(shift.endTime), "p")}
                </p>
              </div>
              {shift.notes && (
                <p className="text-sm text-gray-600">{shift.notes}</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
