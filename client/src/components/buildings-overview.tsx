import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building, PersonStanding, Clock } from "lucide-react";
import { Loader2 } from "lucide-react";

interface BuildingData {
  id: number;
  name: string;
  area: string;
  supervisor: {
    id: number;
    fullName: string;
    username: string;
  } | null;
  shifts: Array<{
    id: number;
    week: string;
    shiftInspectors: Array<{
      inspector: {
        id: number;
        fullName: string;
        username: string;
      };
      isPrimary: boolean;
    }>;
    days: Array<{
      dayOfWeek: number;
      shiftType: {
        id: number;
        name: string;
        startTime: string;
        endTime: string;
      } | null;
    }>;
  }>;
}

interface BuildingsResponse {
  buildings: BuildingData[];
}

export function BuildingsOverview() {
  const { data, isLoading, error } = useQuery<BuildingsResponse>({
    queryKey: ["/api/buildings/with-shifts"],
    queryFn: async () => {
      const response = await fetch("/api/buildings/with-shifts", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch buildings data");
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Buildings Overview</CardTitle>
          <CardDescription className="text-destructive">
            Error loading buildings data
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {data?.buildings.map((building) => (
        <Card key={building.id}>
          <CardHeader className="bg-secondary/10 pb-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-semibold">
                  {building.name}
                </CardTitle>
              </div>
              {building.supervisor && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-background/80 rounded-lg px-3 py-1">
                  <PersonStanding className="h-4 w-4" />
                  <span>{building.supervisor.fullName}</span>
                </div>
              )}
            </div>
            <CardDescription className="text-sm">
              Area: {building.area}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {building.shifts?.length > 0 ? (
              <div className="space-y-4">
                <h4 className="text-sm font-medium flex items-center gap-2 text-primary">
                  <Clock className="h-4 w-4" />
                  Current Shift Assignments
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="text-xs uppercase text-muted-foreground">
                        <th className="px-4 py-2 text-left">Inspectors</th>
                        <th className="px-4 py-2 text-center">Sun</th>
                        <th className="px-4 py-2 text-center">Mon</th>
                        <th className="px-4 py-2 text-center">Tue</th>
                        <th className="px-4 py-2 text-center">Wed</th>
                        <th className="px-4 py-2 text-center">Thu</th>
                        <th className="px-4 py-2 text-center">Fri</th>
                        <th className="px-4 py-2 text-center">Sat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {building.shifts.map((shift) => (
                        <tr key={shift.id} className="border-t border-secondary/20">
                          <td className="px-4 py-3">
                            <div className="space-y-2">
                              {shift.shiftInspectors
                                .sort((a, b) => (a.isPrimary === b.isPrimary ? 0 : a.isPrimary ? -1 : 1))
                                .map((si) => (
                                  <div key={si.inspector.id} className="flex items-center gap-2">
                                    <span className="font-medium">
                                      {si.inspector.fullName}
                                    </span>
                                    {si.isPrimary && (
                                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                        Primary
                                      </span>
                                    )}
                                  </div>
                                ))}
                              <div className="text-xs text-muted-foreground mt-1">
                                Week {shift.week}
                              </div>
                            </div>
                          </td>
                          {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                            const dayShift = shift.days?.find(d => d.dayOfWeek === day);
                            return (
                              <td key={day} className="px-4 py-3 text-center">
                                <div
                                  className={`rounded-md py-1 ${
                                    dayShift?.shiftType
                                      ? 'bg-primary/10 text-primary font-medium'
                                      : 'bg-secondary/10'
                                  }`}
                                >
                                  {dayShift?.shiftType?.name.charAt(0) || '-'}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground flex items-center justify-center h-24 bg-secondary/10 rounded-lg">
                No inspectors currently assigned
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}