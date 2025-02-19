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
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import Navbar from "@/components/navbar";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

type BuildingWithShifts = {
  id: number;
  name: string;
  code: string;
  area: string;
  shifts: Array<{
    id: number;
    week: string;
    status: "PENDING" | "ACCEPTED" | "REJECTED";
    rejectionReason: string | null;
    role: { id: number; name: string };
    inspectorGroups: Array<{
      id: number;
      name: string;
      inspectors: Array<{
        inspector: { id: number; fullName: string; username: string };
        status: "PENDING" | "ACCEPTED" | "REJECTED";
      }>;
    }>;
  }>;
};

type BuildingsResponse = {
  buildings: BuildingWithShifts[];
};

export default function BuildingWeeks() {
  const { user } = useUser();
  const { buildingId } = useParams();

  const { data: buildingsData, isLoading } = useQuery<BuildingsResponse>({
    queryKey: ["/api/buildings/with-shifts"],
    queryFn: async () => {
      const response = await fetch("/api/buildings/with-shifts", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch buildings");
      }
      return response.json();
    },
    enabled: !!user?.isAdmin,
  });

  const building = buildingsData?.buildings.find(b => b.id.toString() === buildingId);

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
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Buildings
            </Button>
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
              <Link 
                key={shift.id} 
                href={`/building/${buildingId}/week/${shift.id}`}
              >
                <Card className="cursor-pointer transition-all duration-200 hover:shadow-lg">
                  <CardHeader>
                    <CardTitle>Week {shift.week}</CardTitle>
                    <CardDescription>
                      <div className="flex items-center gap-2">
                        <span>{shift.role.name}</span>
                        <Badge variant={
                          shift.status === "ACCEPTED" ? "default" :
                          shift.status === "REJECTED" ? "destructive" : "secondary"
                        }>
                          {shift.status}
                        </Badge>
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-muted-foreground">
                        {shift.inspectorGroups.length} Inspector Groups
                      </div>
                      <Button variant="ghost" size="sm">
                        View Details <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Navbar>
  );
}