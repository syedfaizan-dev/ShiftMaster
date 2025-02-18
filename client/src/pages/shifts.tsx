import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { TablePagination } from "@/components/table-pagination";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Clock } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ShiftAssignmentList } from "@/components/shift-assignment-list";
import Navbar from "@/components/navbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type ShiftType = {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
};

type ShiftInspector = {
  inspector: {
    id: number;
    fullName: string;
    username: string;
  };
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  rejectionReason: string | null;
};

type ShiftDay = {
  id: number;
  dayOfWeek: number;
  shiftType?: ShiftType;
};

type ShiftAssignment = {
  id: number;
  week: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  rejectionReason: string | null;
  role: { id: number; name: string };
  building: { id: number; name: string; code: string; area: string };
  shiftInspectors: ShiftInspector[];
  days: ShiftDay[];
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

export default function Shifts() {
  const { user } = useUser();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Use different endpoints based on user role
  const { data: inspectorShifts, isLoading: isLoadingInspectorShifts } = useQuery<ShiftAssignment[]>({
    queryKey: ["/api/inspector/shifts"],
    queryFn: async () => {
      const response = await fetch("/api/inspector/shifts", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch shifts");
      }
      return response.json();
    },
    enabled: !!user?.isInspector,
  });

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

  const buildings = buildingsData?.buildings || [];
  const isLoading = isLoadingInspectorShifts || isLoadingBuildings;

  if (!user?.isInspector && !user?.isAdmin) {
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">
            {user?.isAdmin ? "Shifts by Building" : "My Shift Assignments"}
          </h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : user?.isInspector ? (
          !inspectorShifts || inspectorShifts.length === 0 ? (
            <Alert>
              <AlertTitle>No Shifts Found</AlertTitle>
              <AlertDescription>
                You don't have any shift assignments yet.
              </AlertDescription>
            </Alert>
          ) : (
            <ShiftAssignmentList shifts={inspectorShifts} userId={user.id} />
          )
        ) : (
          // Admin view - Buildings with shifts
          <div className="grid gap-6">
            {buildings.length === 0 ? (
              <Alert>
                <AlertTitle>No Buildings Found</AlertTitle>
                <AlertDescription>
                  No buildings with shifts have been created yet.
                </AlertDescription>
              </Alert>
            ) : (
              buildings.map((building) => (
                <Card key={building.id}>
                  <CardHeader>
                    <CardTitle>{building.name}</CardTitle>
                    <CardDescription>
                      Code: {building.code} | Area: {building.area}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {building.shifts.length === 0 ? (
                      <p className="text-center text-muted-foreground">
                        No shifts assigned
                      </p>
                    ) : (
                      <div className="space-y-6">
                        {building.shifts
                          .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                          .map((shift) => (
                            <div key={shift.id} className="space-y-4">
                              <div className="flex justify-between items-center">
                                <div>
                                  <h3 className="text-lg font-semibold">
                                    Week {shift.week} - {shift.role?.name}
                                  </h3>
                                </div>
                              </div>

                              <div className="rounded-md border">
                                <table className="w-full">
                                  <thead>
                                    <tr className="border-b bg-muted/50">
                                      <th className="p-2 text-left font-medium w-1/3">
                                        Inspectors & Status
                                      </th>
                                      {DAYS.map((day) => (
                                        <th
                                          key={day}
                                          className="p-2 text-center font-medium"
                                        >
                                          <div className="flex flex-col items-center">
                                            <span>{day}</span>
                                          </div>
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr>
                                      <td className="p-2 align-top">
                                        <div className="space-y-2">
                                          {shift.shiftInspectors?.map((si) => (
                                            <div
                                              key={si.inspector.id}
                                              className="space-y-1"
                                            >
                                              <div className="flex items-center justify-between gap-2 p-2 bg-secondary/10 rounded-md">
                                                <span>{si.inspector.fullName}</span>
                                                <Badge
                                                  variant={
                                                    si.status === "ACCEPTED"
                                                      ? "success"
                                                      : si.status === "REJECTED"
                                                      ? "destructive"
                                                      : "default"
                                                  }
                                                >
                                                  {si.status}
                                                </Badge>
                                              </div>
                                              {si.status === "REJECTED" && si.rejectionReason && (
                                                <div className="text-sm text-muted-foreground ml-2">
                                                  Rejection reason: {si.rejectionReason}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </td>
                                      {DAYS.map((_, dayIndex) => {
                                        const dayShift = shift.days?.find(
                                          (d) => d.dayOfWeek === dayIndex
                                        );
                                        return (
                                          <td
                                            key={dayIndex}
                                            className="p-2 text-center"
                                          >
                                            {dayShift?.shiftType?.name || "-"}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))}
                        <TablePagination
                          currentPage={currentPage}
                          totalItems={building.shifts.length}
                          pageSize={pageSize}
                          onPageChange={setCurrentPage}
                          onPageSizeChange={setPageSize}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </Navbar>
  );
}