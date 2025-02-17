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
                  {building.shifts.map((shift) => (
                    shift.shiftInspectors?.map((si, index) => (
                      <div
                        key={`${si.inspector.id}-${si.shift.id}`}
                        className={`
                          p-3 rounded-lg transition-colors duration-200
                          ${index % 2 === 0 ? 'bg-secondary/20' : 'bg-secondary/10'}
                          hover:bg-secondary/30
                        `}
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {si.inspector.fullName}
                              </span>
                              {si.isPrimary && (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                  Primary
                                </span>
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              Week {si.shift.week}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-medium">{si.shift.shiftType.name}</span>
                            <span>•</span>
                            <span>
                              {format(new Date(`2000-01-01T${si.shift.shiftType.startTime}`), "h:mm a")} - 
                              {format(new Date(`2000-01-01T${si.shift.shiftType.endTime}`), "h:mm a")}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ))}
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