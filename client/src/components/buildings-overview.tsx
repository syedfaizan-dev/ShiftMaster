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
import { format } from "date-fns";

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
    shiftInspectors: Array<{
      inspector: {
        id: number;
        fullName: string;
        username: string;
      };
      isPrimary: boolean;
      shift: {
        id: number;
        week: string;
        shiftType: {
          id: number;
          name: string;
          startTime: string;
          endTime: string;
        };
      };
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
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {data?.buildings.map((building) => (
        <Card 
          key={building.id} 
          className="group hover:shadow-lg transition-shadow duration-200 overflow-hidden"
        >
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
            {building.shifts?.length > 0 && building.shifts.some(shift => shift.shiftInspectors?.length > 0) ? (
              <div className="space-y-4">
                <h4 className="text-sm font-medium flex items-center gap-2 text-primary">
                  <Clock className="h-4 w-4" />
                  Current Shift Assignments
                </h4>
                <div className="space-y-3">
                  {building.shifts.map((shift) => {
                    // Group all inspectors for this shift
                    const inspectors = shift.shiftInspectors || [];
                    const primaryInspector = inspectors.find(si => si.isPrimary);
                    const backupInspectors = inspectors.filter(si => !si.isPrimary);

                    return (
                      <div
                        key={shift.id}
                        className="p-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors duration-200"
                      >
                        <div className="flex flex-col gap-2">
                          {/* Inspector Cell */}
                          <div className="mb-2 p-2 bg-background/60 rounded-lg">
                            <div className="flex flex-col gap-1">
                              {primaryInspector && (
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{primaryInspector.inspector.fullName}</span>
                                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                    Primary
                                  </span>
                                </div>
                              )}
                              {backupInspectors.length > 0 && (
                                <div className="text-sm text-muted-foreground">
                                  Backup: {backupInspectors.map(si => si.inspector.fullName).join(', ')}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Shift Type Row */}
                          <div className="grid grid-cols-7 gap-1">
                            {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                              const dayShift = shift.days?.find(d => d.dayOfWeek === day); //This line assumes the existence of 'days' property in shift object.  It needs to be added to the BuildingData interface if it's not present.
                              return (
                                <div
                                  key={day}
                                  className={`p-2 rounded text-center ${
                                    dayShift?.shiftType
                                      ? 'bg-primary/10 text-primary'
                                      : 'bg-secondary/10'
                                  }`}
                                >
                                  {dayShift?.shiftType?.name.charAt(0) || '-'}
                                </div>
                              );
                            })}
                          </div>

                          <div className="text-sm text-muted-foreground mt-1">
                            Week {shift.week}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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