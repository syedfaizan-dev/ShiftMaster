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
import { Loader2, ChevronDown, ChevronUp, Clock } from "lucide-react";
import Navbar from "@/components/navbar";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

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

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function BuildingWeeks() {
  const { user } = useUser();
  const { buildingId } = useParams();
  const [selectedWeek, setSelectedWeek] = useState<ShiftAssignment | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<number[]>([]);

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

  const toggleGroup = (groupId: number) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

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
                  <CardDescription className="flex items-center gap-2">
                    <span>{shift.role.name}</span>
                    <Badge variant={
                      shift.status === "ACCEPTED" ? "default" :
                      shift.status === "REJECTED" ? "destructive" : "secondary"
                    }>
                      {shift.status}
                    </Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {shift.inspectorGroups.length} Inspector Groups
                    </p>
                    {selectedWeek?.id === shift.id && (
                      <div className="mt-4 space-y-4">
                        {shift.inspectorGroups.map((group) => (
                          <div key={group.id} className="border rounded-lg overflow-hidden">
                            <div 
                              className="p-4 bg-muted flex justify-between items-center cursor-pointer hover:bg-muted/80"
                              onClick={() => toggleGroup(group.id)}
                            >
                              <h4 className="font-medium flex items-center gap-2">
                                {group.name}
                                <Badge variant="outline">
                                  {group.inspectors.length} Inspectors
                                </Badge>
                              </h4>
                              <Button variant="ghost" size="sm">
                                {expandedGroups.includes(group.id) ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </div>

                            {expandedGroups.includes(group.id) && (
                              <div className="p-4 border-t bg-card">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                  {DAYS.map((day, index) => {
                                    const shiftDay = group.days.find(d => d.dayOfWeek === index);
                                    return (
                                      <Card key={index} className="bg-muted/30">
                                        <CardHeader className="p-3">
                                          <CardTitle className="text-sm">{day}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-3 pt-0">
                                          {shiftDay?.shiftType ? (
                                            <div className="space-y-1">
                                              <p className="font-medium text-sm">
                                                {shiftDay.shiftType.name}
                                              </p>
                                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {shiftDay.shiftType.startTime} - {shiftDay.shiftType.endTime}
                                              </p>
                                            </div>
                                          ) : (
                                            <p className="text-sm text-muted-foreground">No shift assigned</p>
                                          )}
                                        </CardContent>
                                      </Card>
                                    );
                                  })}
                                </div>

                                <div className="mt-4">
                                  <h5 className="font-medium mb-2">Inspectors:</h5>
                                  <div className="space-y-2">
                                    {group.inspectors.map((si) => (
                                      <div key={si.inspector.id} className="flex items-center justify-between">
                                        <span className="text-sm">{si.inspector.fullName}</span>
                                        <Badge variant={
                                          si.status === "ACCEPTED" ? "default" :
                                          si.status === "REJECTED" ? "destructive" : "secondary"
                                        }>
                                          {si.status}
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
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