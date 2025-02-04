import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building } from "lucide-react";
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
  shiftInspectors: Array<{
    inspector: {
      id: number;
      fullName: string;
      username: string;
    };
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Buildings Overview
        </CardTitle>
        <CardDescription>
          Current building assignments and inspectors
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {data?.buildings.map((building) => (
            <div key={building.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{building.name}</h3>
                  <p className="text-sm text-muted-foreground">{building.area}</p>
                </div>
                {building.supervisor && (
                  <div className="text-right">
                    <p className="text-sm font-medium">Supervisor</p>
                    <p className="text-sm text-muted-foreground">
                      {building.supervisor.fullName}
                    </p>
                  </div>
                )}
              </div>
              {building.shiftInspectors.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Assigned Inspectors</p>
                  <div className="grid gap-2">
                    {building.shiftInspectors.map((si, index) => (
                      <div
                        key={`${si.inspector.id}-${si.shift.id}`}
                        className="text-sm bg-secondary/50 rounded-md p-2"
                      >
                        <div className="flex justify-between">
                          <span>{si.inspector.fullName}</span>
                          <span className="text-muted-foreground">
                            {si.shift.shiftType.name} ({si.shift.shiftType.startTime}-
                            {si.shift.shiftType.endTime})
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Week: {si.shift.week}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No inspectors currently assigned
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
