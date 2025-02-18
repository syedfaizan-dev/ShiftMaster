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
import { Loader2, Clock, Users, Plus } from "lucide-react";
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
  const [selectedInspector, setSelectedInspector] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
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
    mutationFn: async ({ groupId, inspectorId }: { groupId: number; inspectorId: number }) => {
      const response = await fetch(`/api/admin/inspector-groups/${groupId}/inspectors`, {
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

  const buildings = buildingsData?.buildings || [];
  const isLoading = isLoadingInspectorShifts || isLoadingBuildings;

  const groupInspectorsByStatus = (inspectors: ShiftInspector[]) => {
    return {
      accepted: inspectors.filter((si) => si.status === "ACCEPTED"),
      pending: inspectors.filter((si) => si.status === "PENDING"),
      rejected: inspectors.filter((si) => si.status === "REJECTED"),
    };
  };

  const getAvailableInspectorsForGroup = (group: InspectorGroup) => {
    if (!availableInspectors) return [];
    const assignedInspectorIds = new Set(group.inspectors.map((si) => si.inspector.id));
    return availableInspectors.filter((inspector) => !assignedInspectorIds.has(inspector.id));
  };

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
                      <p className="text-center text-muted-foreground">No shifts assigned</p>
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
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <Plus className="h-4 w-4 mr-2" />
                                      Add Inspector Group
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Create Inspector Group</DialogTitle>
                                      <DialogDescription>
                                        Create a new group of inspectors for this shift.
                                      </DialogDescription>
                                    </DialogHeader>
                                    {/* Add group creation form here */}
                                  </DialogContent>
                                </Dialog>
                              </div>

                              {shift.inspectorGroups.map((group) => (
                                <div key={group.id} className="space-y-4 border rounded-lg p-4">
                                  <div className="flex justify-between items-center">
                                    <h4 className="font-medium">{group.name}</h4>
                                    <div className="flex items-center gap-2">
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button variant="outline" size="sm">
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add Inspector
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                          <DialogHeader>
                                            <DialogTitle>Add Inspector to Group</DialogTitle>
                                            <DialogDescription>
                                              Select an inspector to add to this group.
                                            </DialogDescription>
                                          </DialogHeader>
                                          <div className="space-y-4 py-4">
                                            <Select
                                              value={selectedInspector || undefined}
                                              onValueChange={setSelectedInspector}
                                            >
                                              <SelectTrigger>
                                                <SelectValue placeholder="Select an inspector" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {getAvailableInspectorsForGroup(group).map((inspector) => (
                                                  <SelectItem
                                                    key={inspector.id}
                                                    value={inspector.id.toString()}
                                                  >
                                                    {inspector.fullName}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <DialogFooter>
                                            <Button
                                              onClick={() => {
                                                if (selectedInspector) {
                                                  assignInspectorMutation.mutate({
                                                    groupId: group.id,
                                                    inspectorId: parseInt(selectedInspector),
                                                  });
                                                }
                                              }}
                                              disabled={!selectedInspector || assignInspectorMutation.isPending}
                                            >
                                              {assignInspectorMutation.isPending && (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                              )}
                                              Add Inspector
                                            </Button>
                                          </DialogFooter>
                                        </DialogContent>
                                      </Dialog>
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button variant="outline" size="sm">
                                            <Users className="h-4 w-4 mr-2" />
                                            View All Inspectors
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-2xl">
                                          <DialogHeader>
                                            <DialogTitle>Group Inspectors</DialogTitle>
                                            <DialogDescription>
                                              Week {shift.week} - {group.name}
                                            </DialogDescription>
                                          </DialogHeader>
                                          {(() => {
                                            const groupedInspectors = groupInspectorsByStatus(group.inspectors);
                                            return (
                                              <div className="space-y-4">
                                                <div>
                                                  <h4 className="font-medium mb-2">
                                                    Accepted ({groupedInspectors.accepted.length})
                                                  </h4>
                                                  <div className="space-y-2">
                                                    {groupedInspectors.accepted.map((si) => (
                                                      <div
                                                        key={si.inspector.id}
                                                        className="flex items-center justify-between p-2 bg-secondary/10 rounded-md"
                                                      >
                                                        <span>{si.inspector.fullName}</span>
                                                        <Badge variant="success">ACCEPTED</Badge>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                                <div>
                                                  <h4 className="font-medium mb-2">
                                                    Pending ({groupedInspectors.pending.length})
                                                  </h4>
                                                  <div className="space-y-2">
                                                    {groupedInspectors.pending.map((si) => (
                                                      <div
                                                        key={si.inspector.id}
                                                        className="flex items-center justify-between p-2 bg-secondary/10 rounded-md"
                                                      >
                                                        <span>{si.inspector.fullName}</span>
                                                        <Badge>PENDING</Badge>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                                <div>
                                                  <h4 className="font-medium mb-2">
                                                    Rejected ({groupedInspectors.rejected.length})
                                                  </h4>
                                                  <div className="space-y-2">
                                                    {groupedInspectors.rejected.map((si) => (
                                                      <div key={si.inspector.id} className="space-y-1">
                                                        <div className="flex items-center justify-between p-2 bg-secondary/10 rounded-md">
                                                          <span>{si.inspector.fullName}</span>
                                                          <Badge variant="destructive">REJECTED</Badge>
                                                        </div>
                                                        {si.rejectionReason && (
                                                          <p className="text-sm text-muted-foreground ml-2">
                                                            Reason: {si.rejectionReason}
                                                          </p>
                                                        )}
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })()}
                                        </DialogContent>
                                      </Dialog>
                                    </div>
                                  </div>

                                  <div className="rounded-md border">
                                    <table className="w-full">
                                      <thead>
                                        <tr className="border-b bg-muted/50">
                                          <th className="p-2 text-left font-medium w-1/3">
                                            Accepted Inspectors ({
                                              groupInspectorsByStatus(group.inspectors).accepted.length
                                            })
                                          </th>
                                          {DAYS.map((day) => (
                                            <th key={day} className="p-2 text-center font-medium">
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
                                              {groupInspectorsByStatus(group.inspectors)
                                                .accepted.map((si) => (
                                                  <div
                                                    key={si.inspector.id}
                                                    className="flex items-center justify-between gap-2 p-2 bg-secondary/10 rounded-md"
                                                  >
                                                    <span>{si.inspector.fullName}</span>
                                                    <Badge variant="success">ACCEPTED</Badge>
                                                  </div>
                                                ))}
                                            </div>
                                          </td>
                                          {DAYS.map((_, dayIndex) => {
                                            const dayShift = group.days?.find(
                                              (d) => d.dayOfWeek === dayIndex
                                            );
                                            return (
                                              <td key={dayIndex} className="p-2 text-center">
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