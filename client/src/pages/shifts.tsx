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
  DialogTrigger,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Clock, Users, Plus, Building } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

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

type Inspector = {
  id: number;
  fullName: string;
  // other inspector properties
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Shifts() {
  const { user } = useUser();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [selectedInspector, setSelectedInspector] = useState<string | null>(null);
  const queryClient = useQueryClient();

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

  const { data: availableInspectors } = useQuery<Inspector[]>({
    queryKey: ["/api/admin/inspectors"],
    queryFn: async () => {
      const response = await fetch("/api/admin/inspectors", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch inspectors");
      }
      return response.json();
    },
    enabled: !!user?.isAdmin,
  });

  const assignInspectorMutation = useMutation({
    mutationFn: async ({ shiftId, inspectorId }: { shiftId: number; inspectorId: number }) => {
      const response = await fetch(`/api/admin/shifts/${shiftId}/inspectors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ inspectorId }),
      });
      if (!response.ok) {
        throw new Error("Failed to assign inspector");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildings/with-shifts"] });
      toast({
        title: "Success",
        description: "Inspector assigned successfully",
      });
      setSelectedInspector(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to assign inspector",
        variant: "destructive",
      });
    },
  });

  const { data: shiftTypes } = useQuery({
    queryKey: ["/api/shift-types"],
    queryFn: async () => {
      const response = await fetch("/api/shift-types", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch shift types");
      }
      return response.json();
    },
  });

  const updateShiftDayMutation = useMutation({
    mutationFn: async ({
      shiftId,
      dayOfWeek,
      shiftTypeId,
    }: {
      shiftId: number;
      dayOfWeek: number;
      shiftTypeId: string | null;
    }) => {
      const response = await fetch(`/api/shifts/${shiftId}/days/${dayOfWeek}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ shiftTypeId: shiftTypeId ? parseInt(shiftTypeId) : null }),
      });
      if (!response.ok) {
        throw new Error("Failed to update shift day");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildings/with-shifts"] });
      toast({
        title: "Success",
        description: "Shift schedule updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update shift schedule",
        variant: "destructive",
      });
    },
  });

  const buildings = buildingsData?.buildings || [];
  const isLoading = isLoadingInspectorShifts || isLoadingBuildings;

  const groupInspectorsByStatus = (inspectors: ShiftInspector[]) => {
    return {
      accepted: inspectors.filter((si) => si.status === "ACCEPTED"),
      pending: inspectors.filter((si) => si.status === "PENDING"),
      rejected: inspectors.filter((si) => si.status === "REJECTED"),
    };
  };

  const getAvailableInspectorsForShift = (shift: ShiftAssignment) => {
    if (!availableInspectors) return [];
    const assignedInspectorIds = new Set(shift.shiftInspectors.map((si) => si.inspector.id));
    return availableInspectors.filter((inspector) => !assignedInspectorIds.has(inspector.id));
  };

  // Mobile card view component for shift schedule
  const ShiftScheduleCard = ({ shift, dayShift, dayIndex }: { shift: ShiftAssignment; dayShift: ShiftDay | undefined; dayIndex: number }) => (
    <div className="p-4 bg-card border rounded-lg space-y-2">
      <div className="flex justify-between items-center">
        <span className="font-medium">{DAYS[dayIndex]}</span>
        <Select
          value={dayShift?.shiftType?.id?.toString() || ""}
          onValueChange={(value) => {
            updateShiftDayMutation.mutate({
              shiftId: shift.id,
              dayOfWeek: dayIndex,
              shiftTypeId: value || null,
            });
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Select shift" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">No shift</SelectItem>
            {shiftTypes?.map((type: ShiftType) => (
              <SelectItem key={type.id} value={type.id.toString()}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {dayShift?.shiftType && (
        <div className="text-sm text-muted-foreground">
          {dayShift.shiftType.startTime} - {dayShift.shiftType.endTime}
        </div>
      )}
    </div>
  );

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
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              {user?.isAdmin ? "Shifts Management" : "My Shift Assignments"}
            </h1>
            <p className="text-muted-foreground">
              {user?.isAdmin
                ? "Manage and assign inspectors to shifts across all buildings"
                : "View and manage your assigned shifts"}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-[400px]">
            <div className="space-y-3 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">Loading shifts data...</p>
            </div>
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
                <Card key={building.id} className="group transition-all duration-200 hover:shadow-md">
                  <CardHeader className="bg-secondary/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Building className="h-5 w-5 text-primary" />
                      <CardTitle>{building.name}</CardTitle>
                    </div>
                    <CardDescription>
                      Code: {building.code} | Area: {building.area}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {building.shifts.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground bg-secondary/5 rounded-lg">
                        <p>No shifts assigned to this building</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {building.shifts
                          .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                          .map((shift) => {
                            const groupedInspectors = groupInspectorsByStatus(shift.shiftInspectors || []);
                            const availableInspectorsForShift = getAvailableInspectorsForShift(shift);

                            return (
                              <div key={shift.id} className="space-y-4">
                                <div className="flex justify-between items-center">
                                  <div className="space-y-1">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                      <Clock className="h-4 w-4 text-primary" />
                                      Week {shift.week}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                      Role: {shift.role?.name}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" className="gap-2">
                                          <Plus className="h-4 w-4" />
                                          Add Inspector
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent>
                                        <DialogHeader>
                                          <DialogTitle>Add Inspector to Shift</DialogTitle>
                                          <DialogDescription>
                                            Select an inspector from the list below to assign them to this shift.
                                          </DialogDescription>
                                        </DialogHeader>
                                        {availableInspectorsForShift.length === 0 ? (
                                          <div className="py-4 text-center text-muted-foreground">
                                            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                            <p>No available inspectors to assign</p>
                                          </div>
                                        ) : (
                                          <div className="space-y-4 py-4">
                                            <Select
                                              value={selectedInspector || undefined}
                                              onValueChange={setSelectedInspector}
                                            >
                                              <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select an inspector" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {availableInspectorsForShift.map((inspector) => (
                                                  <SelectItem
                                                    key={inspector.id}
                                                    value={inspector.id.toString()}
                                                    className="cursor-pointer"
                                                  >
                                                    {inspector.fullName}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        )}
                                        <DialogFooter>
                                          <Button
                                            onClick={() => {
                                              if (selectedInspector) {
                                                assignInspectorMutation.mutate({
                                                  shiftId: shift.id,
                                                  inspectorId: parseInt(selectedInspector),
                                                });
                                              }
                                            }}
                                            disabled={!selectedInspector || assignInspectorMutation.isPending}
                                            className="w-full sm:w-auto"
                                          >
                                            {assignInspectorMutation.isPending && (
                                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            )}
                                            Assign Inspector
                                          </Button>
                                        </DialogFooter>
                                      </DialogContent>
                                    </Dialog>
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" className="gap-2">
                                          <Users className="h-4 w-4" />
                                          View All
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="max-w-2xl">
                                        <DialogHeader>
                                          <DialogTitle>Inspector Assignments</DialogTitle>
                                          <DialogDescription className="space-y-1">
                                            <p>Week {shift.week} - {shift.role?.name}</p>
                                            <p className="text-sm">
                                              Building: {building.name} ({building.code})
                                            </p>
                                          </DialogDescription>
                                        </DialogHeader>
                                        <Separator className="my-4" />
                                        <div className="space-y-6">
                                          <div>
                                            <h4 className="font-medium mb-3 flex items-center gap-2">
                                              <Badge variant="success" className="rounded-full">
                                                {groupedInspectors.accepted.length}
                                              </Badge>
                                              Accepted
                                            </h4>
                                            <div className="space-y-2">
                                              {groupedInspectors.accepted.map((si) => (
                                                <div
                                                  key={si.inspector.id}
                                                  className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg hover:bg-secondary/20 transition-colors"
                                                >
                                                  <span>{si.inspector.fullName}</span>
                                                  <Badge variant="success">ACCEPTED</Badge>
                                                </div>
                                              ))}
                                              {groupedInspectors.accepted.length === 0 && (
                                                <p className="text-sm text-muted-foreground text-center py-2">
                                                  No accepted inspectors yet
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                          <div>
                                            <h4 className="font-medium mb-3 flex items-center gap-2">
                                              <Badge variant="secondary" className="rounded-full">
                                                {groupedInspectors.pending.length}
                                              </Badge>
                                              Pending Response
                                            </h4>
                                            <div className="space-y-2">
                                              {groupedInspectors.pending.map((si) => (
                                                <div
                                                  key={si.inspector.id}
                                                  className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg hover:bg-secondary/20 transition-colors"
                                                >
                                                  <span>{si.inspector.fullName}</span>
                                                  <Badge>PENDING</Badge>
                                                </div>
                                              ))}
                                              {groupedInspectors.pending.length === 0 && (
                                                <p className="text-sm text-muted-foreground text-center py-2">
                                                  No pending responses
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                          <div>
                                            <h4 className="font-medium mb-3 flex items-center gap-2">
                                              <Badge variant="destructive" className="rounded-full">
                                                {groupedInspectors.rejected.length}
                                              </Badge>
                                              Rejected
                                            </h4>
                                            <div className="space-y-3">
                                              {groupedInspectors.rejected.map((si) => (
                                                <div key={si.inspector.id} className="space-y-2">
                                                  <div className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg hover:bg-secondary/20 transition-colors">
                                                    <span>{si.inspector.fullName}</span>
                                                    <Badge variant="destructive">REJECTED</Badge>
                                                  </div>
                                                  {si.rejectionReason && (
                                                    <div className="text-sm text-muted-foreground bg-secondary/5 p-3 rounded-lg ml-4 border-l-2 border-destructive/50">
                                                      <span className="font-medium">Reason:</span>{" "}
                                                      {si.rejectionReason}
                                                    </div>
                                                  )}
                                                </div>
                                              ))}
                                              {groupedInspectors.rejected.length === 0 && (
                                                <p className="text-sm text-muted-foreground text-center py-2">
                                                  No rejections
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  </div>
                                </div>

                                <div className="rounded-lg border bg-card">
                                  <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full">
                                      <thead>
                                        <tr className="border-b bg-muted/50">
                                          <th className="p-3 text-left font-medium w-1/3">
                                            Accepted Inspectors ({groupedInspectors.accepted.length})
                                          </th>
                                          {DAYS.map((day) => (
                                            <th key={day} className="p-3 text-center font-medium">
                                              <div className="flex flex-col items-center gap-1">
                                                <span>{day}</span>
                                              </div>
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr>
                                          <td className="p-3 align-top">
                                            <div className="space-y-2">
                                              {groupedInspectors.accepted.map((si) => (
                                                <div
                                                  key={si.inspector.id}
                                                  className="flex items-center justify-between gap-2 p-2 bg-secondary/10 rounded-lg hover:bg-secondary/20 transition-colors"
                                                >
                                                  <span className="font-medium">
                                                    {si.inspector.fullName}
                                                  </span>
                                                  <Badge variant="success" className="ml-auto">
                                                    ACCEPTED
                                                  </Badge>
                                                </div>
                                              ))}
                                              {groupedInspectors.accepted.length === 0 && (
                                                <div className="text-center py-4 text-muted-foreground">
                                                  <p>No accepted inspectors</p>
                                                </div>
                                              )}
                                            </div>
                                          </td>
                                          {DAYS.map((_, dayIndex) => {
                                            const dayShift = shift.days?.find((d) => d.dayOfWeek === dayIndex);
                                            return (
                                              <td key={dayIndex} className="p-3 text-center">
                                                <Select
                                                  value={dayShift?.shiftType?.id?.toString() || ""}
                                                  onValueChange={(value) => {
                                                    updateShiftDayMutation.mutate({
                                                      shiftId: shift.id,
                                                      dayOfWeek: dayIndex,
                                                      shiftTypeId: value || null,
                                                    });
                                                  }}
                                                >
                                                  <SelectTrigger className="w-[140px]">
                                                    <SelectValue placeholder="Select shift" />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="">No shift</SelectItem>
                                                    {shiftTypes?.map((type: ShiftType) => (
                                                      <SelectItem key={type.id} value={type.id.toString()}>
                                                        {type.name}
                                                      </SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>
                                                {dayShift?.shiftType && (
                                                  <div className="text-xs text-muted-foreground mt-1">
                                                    {dayShift.shiftType.startTime} - {dayShift.shiftType.endTime}
                                                  </div>
                                                )}
                                              </td>
                                            );
                                          })}
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* Mobile view */}
                                  <div className="md:hidden">
                                    <div className="p-3 border-b bg-muted/50">
                                      <h4 className="font-medium">
                                        Accepted Inspectors ({groupedInspectors.accepted.length})
                                      </h4>
                                    </div>
                                    <div className="p-3 space-y-3">
                                      {groupedInspectors.accepted.map((si) => (
                                        <div
                                          key={si.inspector.id}
                                          className="flex items-center justify-between gap-2 p-2 bg-secondary/10 rounded-lg"
                                        >
                                          <span className="font-medium">{si.inspector.fullName}</span>
                                          <Badge variant="success">ACCEPTED</Badge>
                                        </div>
                                      ))}
                                      {groupedInspectors.accepted.length === 0 && (
                                        <div className="text-center py-4 text-muted-foreground">
                                          <p>No accepted inspectors</p>
                                        </div>
                                      )}
                                    </div>
                                    <div className="border-t">
                                      <div className="p-3 border-b bg-muted/50">
                                        <h4 className="font-medium">Weekly Schedule</h4>
                                      </div>
                                      <div className="p-3 grid gap-3">
                                        {DAYS.map((_, dayIndex) => {
                                          const dayShift = shift.days?.find((d) => d.dayOfWeek === dayIndex);
                                          return (
                                            <ShiftScheduleCard
                                              key={dayIndex}
                                              shift={shift}
                                              dayShift={dayShift}
                                              dayIndex={dayIndex}
                                            />
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
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