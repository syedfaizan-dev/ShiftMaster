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
import { Loader2, Clock, ArrowLeft } from "lucide-react";
import Navbar from "@/components/navbar";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

export default function WeekDetails() {
  const { user } = useUser();
  const { buildingId, weekId } = useParams();

  const { data: shiftData, isLoading } = useQuery<ShiftAssignment>({
    queryKey: ["/api/buildings", buildingId, "weeks", weekId],
    queryFn: async () => {
      const response = await fetch(`/api/buildings/${buildingId}/weeks/${weekId}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch week details");
      }
      return response.json();
    },
    enabled: !!user?.isAdmin && !!buildingId && !!weekId,
  });

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

  return (
    <Navbar>
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href={`/building/${buildingId}/weeks`}>
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Weeks
            </Button>
          </Link>
          {shiftData && (
            <div>
              <h1 className="text-3xl font-bold">
                Week {shiftData.week} - {shiftData.building.name}
              </h1>
              <p className="text-muted-foreground">
                {shiftData.role.name}
              </p>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : !shiftData ? (
          <Alert>
            <AlertTitle>Week Not Found</AlertTitle>
            <AlertDescription>
              The requested week could not be found.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {shiftData.inspectorGroups.map((group) => (
              <Card key={group.id}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>{group.name}</CardTitle>
                      <CardDescription>
                        {group.inspectors.length} Inspectors Assigned
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
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

                    <div>
                      <h3 className="text-sm font-medium mb-2">Assigned Inspectors</h3>
                      <div className="space-y-2">
                        {group.inspectors.map((si) => (
                          <div key={si.inspector.id} className="flex items-center justify-between bg-muted/30 p-2 rounded">
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Navbar>
  );
}
