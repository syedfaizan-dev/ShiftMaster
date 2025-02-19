import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Link, useParams } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/navbar";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

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
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  rejectionReason: string | null;
};

type ShiftDay = {
  id: number;
  dayOfWeek: number;
  shiftType?: ShiftType;
};

type InspectorGroup = {
  id: number;
  name: string;
  inspectors: ShiftInspector[];
  days: ShiftDay[];
};

type ShiftAssignment = {
  id: number;
  week: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  rejectionReason: string | null;
  role: { id: number; name: string };
  building: { id: number; name: string; code: string; area: string };
  inspectorGroups: InspectorGroup[];
};

type BuildingWithShifts = {
  id: number;
  name: string;
  code: string;
  area: string;
  shifts: ShiftAssignment[];
};

type BuildingsResponse = {
  buildings: BuildingWithShifts[];
};

export default function BuildingWeeks() {
  const { user } = useUser();
  const { buildingId } = useParams();
  const [selectedWeek, setSelectedWeek] = useState<ShiftAssignment | null>(null);

  const { data: buildingsData, isLoading: isLoadingBuildings } = useQuery<BuildingsResponse>({
    queryKey: ["/api/buildings/with-shifts"],
    queryFn: async () => {
      const response = await fetch("/api/buildings/with-shifts", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch buildings with shifts");
      }
      return response.json();
    },
    enabled: !!user?.isAdmin,
  });

  const building = buildingsData?.buildings.find(b => b.id.toString() === buildingId);
  const isLoading = isLoadingBuildings;

  if (!user?.isAdmin) {
    return (
      <Navbar>
        <div className="p-6">
          <Alert variant="destructive">
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You don't have permission to access this page.
            </AlertDescription>
          </Alert>
        </div>
      </Navbar>
    );
  }

  if (!building) {
    return (
      <Navbar>
        <div className="p-6">
          <Alert>
            <AlertTitle>Building Not Found</AlertTitle>
            <AlertDescription>
              The requested building could not be found.
            </AlertDescription>
          </Alert>
        </div>
      </Navbar>
    );
  }

  return (
    <Navbar>
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/shifts">
            <Button variant="outline">← Back to Buildings</Button>
          </Link>
          <h1 className="text-3xl font-bold">
            {building.name} - Weekly Shifts
          </h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : building.shifts.length === 0 ? (
          <Alert>
            <AlertTitle>No Shifts Found</AlertTitle>
            <AlertDescription>
              No shifts have been assigned to this building yet.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {building.shifts.map((shift) => (
              <Card 
                key={shift.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  selectedWeek?.id === shift.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedWeek(shift.id === selectedWeek?.id ? null : shift)}
              >
                <CardHeader>
                  <CardTitle>Week {shift.week}</CardTitle>
                  <CardDescription>{shift.role.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {shift.inspectorGroups.length} Inspector Groups
                    </p>
                    {selectedWeek?.id === shift.id && (
                      <div className="mt-4 space-y-4">
                        {shift.inspectorGroups.map((group) => (
                          <div key={group.id} className="p-4 bg-muted rounded-lg">
                            <h4 className="font-medium mb-2">{group.name}</h4>
                            {/* Add more group details as needed */}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Navbar>
  );
}
