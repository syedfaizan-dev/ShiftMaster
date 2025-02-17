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

  const getShiftTypeDisplay = (shiftTypeName: string) => {
    if (shiftTypeName.toLowerCase().includes('morning')) return 'M';
    if (shiftTypeName.toLowerCase().includes('afternoon')) return 'A';
    if (shiftTypeName.toLowerCase().includes('night')) return 'N';
    return '-';
  };

  const getShiftTypeColor = (shiftTypeName: string) => {
    if (shiftTypeName.toLowerCase().includes('morning')) return 'bg-blue-50 text-blue-700';
    if (shiftTypeName.toLowerCase().includes('afternoon')) return 'bg-orange-50 text-orange-700';
    if (shiftTypeName.toLowerCase().includes('night')) return 'bg-purple-50 text-purple-700';
    return 'bg-gray-50 text-gray-700';
  };

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
                {building.shifts.map((shift) => (
                  <div key={shift.id} className="border rounded-lg overflow-hidden">
                    <div className="bg-secondary/10 p-3 border-b">
                      <h4 className="text-sm font-medium flex items-center gap-2 text-primary">
                        <Clock className="h-4 w-4" />
                        Week {shift.shiftInspectors[0]?.shift.week} Assignments
                      </h4>
                    </div>
                    <div className="p-3">
                      {/* Inspectors Section */}
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-muted-foreground mb-2">Assigned Inspectors:</h5>
                        <div className="flex flex-wrap gap-2">
                          {shift.shiftInspectors.map((si) => (
                            <span
                              key={si.inspector.id}
                              className="inline-flex items-center gap-1 text-sm bg-secondary/20 rounded-full px-3 py-1"
                            >
                              {si.inspector.fullName}
                              {si.isPrimary && (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-1">
                                  Primary
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Weekly Schedule Section */}
                      <div>
                        <h5 className="text-sm font-medium text-muted-foreground mb-2">Daily Schedule:</h5>
                        <div className="grid grid-cols-7 gap-1 text-center">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                            <div key={day} className="space-y-1">
                              <div className="text-xs font-medium text-muted-foreground">{day}</div>
                              <div className={`
                                p-2 rounded-md text-sm font-medium
                                ${getShiftTypeColor(shift.shiftInspectors[0]?.shift.shiftType.name || '')}
                              `}>
                                {getShiftTypeDisplay(shift.shiftInspectors[0]?.shift.shiftType.name || '-')}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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