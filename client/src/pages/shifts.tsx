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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, X, UserPlus, Clock, Check, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Navbar from "@/components/navbar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ShiftAssignmentList } from "@/components/shift-assignment-list";

type Inspector = {
  id: number;
  fullName: string;
  username: string;
};

type ShiftInspector = {
  inspector: Inspector;
  isPrimary: boolean;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
};

type ShiftType = {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
};

type ShiftDay = {
  id: number;
  dayOfWeek: number;
  shiftType?: ShiftType;
};

type ShiftWithRelations = {
  id: number;
  roleId: number;
  buildingId: number;
  week: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  responseAt: string | null;
  rejectionReason: string | null;
  shiftInspectors: ShiftInspector[];
  role: { id: number; name: string };
  building: { id: number; name: string; code: string; area: string };
  days: ShiftDay[];
};

type BuildingWithShifts = {
  id: number;
  name: string;
  code: string;
  area: string;
  shifts: ShiftWithRelations[];
};

type BuildingsResponse = {
  buildings: BuildingWithShifts[];
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type EditShiftDayFormData = {
  shiftTypeId: string;
};

type EditInspectorGroupFormData = {
  inspectors: string[];
};

type RejectShiftFormData = {
  rejectionReason: string;
};

const rejectShiftSchema = z.object({
  rejectionReason: z.string().min(1, "Rejection reason is required"),
});

export default function Shifts() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [editingDay, setEditingDay] = useState<{
    shiftId: number;
    dayOfWeek: number;
  } | null>(null);
  const [editingInspectors, setEditingInspectors] = useState<{
    shiftId: number;
    week: string;
  } | null>(null);
  const [rejectingShift, setRejectingShift] = useState<{
    shiftId: number;
    inspectorId: number;
  } | null>(null);

  const shiftDayForm = useForm<EditShiftDayFormData>({
    defaultValues: {
      shiftTypeId: "",
    },
  });

  const rejectShiftForm = useForm<RejectShiftFormData>({
    resolver: zodResolver(rejectShiftSchema),
    defaultValues: {
      rejectionReason: "",
    },
  });

  const inspectorGroupForm = useForm<EditInspectorGroupFormData>({
    defaultValues: {
      inspectors: [],
    },
  });

  const { data: buildingsData, isLoading: isLoadingBuildings } = useQuery<BuildingsResponse>({
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
  });

  const buildings = buildingsData?.buildings || [];

  const { data: shiftTypes } = useQuery<ShiftType[]>({
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

  const { data: inspectors, isLoading: isLoadingInspectors } = useQuery<Inspector[]>({
    queryKey: ["available-inspectors", editingInspectors?.shiftId, editingInspectors?.week],
    queryFn: async () => {
      if (!editingInspectors) return [];
      try {
        const response = await fetch(`/api/shifts/${editingInspectors.week}/available-inspectors`, {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("Failed to fetch available inspectors");
        }
        return response.json();
      } catch (error) {
        console.error("Error fetching inspectors:", error);
        throw error;
      }
    },
    enabled: !!editingInspectors,
    refetchOnMount: true,
  });

  const updateShiftDay = useMutation({
    mutationFn: async ({
      shiftId,
      dayOfWeek,
      shiftTypeId,
    }: {
      shiftId: number;
      dayOfWeek: number;
      shiftTypeId: number;
    }) => {
      const res = await fetch(`/api/shifts/${shiftId}/days/${dayOfWeek}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shiftTypeId }),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Shift day updated successfully",
      });
      setEditingDay(null);
      queryClient.invalidateQueries({
        queryKey: ["/api/buildings/with-shifts"],
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const updateInspectorGroup = useMutation({
    mutationFn: async ({
      shiftId,
      inspectors,
    }: {
      shiftId: number;
      inspectors: { id: number; isPrimary: boolean }[];
    }) => {
      const res = await fetch(`/api/shifts/${shiftId}/inspectors`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inspectors }),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Inspector group updated successfully",
      });
      setEditingInspectors(null);
      queryClient.invalidateQueries({ queryKey: ["/api/buildings/with-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["available-inspectors"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const handleShiftResponse = useMutation({
    mutationFn: async ({
      shiftId,
      inspectorId,
      action,
      rejectionReason,
    }: {
      shiftId: number;
      inspectorId: number;
      action: "ACCEPT" | "REJECT";
      rejectionReason?: string;
    }) => {
      const res = await fetch(`/api/shifts/${shiftId}/inspectors/${inspectorId}/response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectionReason }),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Shift response updated successfully",
      });
      setRejectingShift(null);
      queryClient.invalidateQueries({
        queryKey: ["/api/buildings/with-shifts"],
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });


  const handleEditInspectors = (shiftId: number, week: string) => {
    inspectorGroupForm.reset({ inspectors: [] });
    setEditingInspectors({ shiftId, week });
    setTimeout(() => {
      const shift = buildings
        .flatMap((b) => b.shifts)
        .find((s) => s.id === shiftId);

      if (shift) {
        inspectorGroupForm.reset({
          inspectors: shift.shiftInspectors.map((si) => si.inspector.id.toString()),
        });
      }
    }, 0);
  };

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const handleShiftDaySubmit = (data: EditShiftDayFormData) => {
    if (!editingDay) return;
    updateShiftDay.mutate({
      shiftId: editingDay.shiftId,
      dayOfWeek: editingDay.dayOfWeek,
      shiftTypeId: parseInt(data.shiftTypeId),
    });
  };

  const handleInspectorGroupSubmit = (data: EditInspectorGroupFormData) => {
    if (!editingInspectors) return;
    const inspectorList = data.inspectors.map((id) => ({
      id: parseInt(id),
      isPrimary: false,
    }));
    updateInspectorGroup.mutate({
      shiftId: editingInspectors.shiftId,
      inspectors: inspectorList,
    });
  };

  const handleRejectShiftSubmit = (data: RejectShiftFormData) => {
    if (!rejectingShift) return;
    handleShiftResponse.mutate({
      shiftId: rejectingShift.shiftId,
      inspectorId: rejectingShift.inspectorId,
      action: "REJECT",
      rejectionReason: data.rejectionReason,
    });
  };

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ["/api/shifts"],
  });

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
        ) : shifts.length === 0 ? (
          <Alert>
            <AlertTitle>No Shifts Found</AlertTitle>
            <AlertDescription>
              {user?.isAdmin
                ? "No shifts have been created yet."
                : "You don't have any shift assignments yet."}
            </AlertDescription>
          </Alert>
        ) : user?.isInspector ? (
          <ShiftAssignmentList shifts={shifts} userId={user.id} />
        ) : (
          // Keep the existing admin view here
          <div className="grid gap-6">
            {buildings.map((building: BuildingWithShifts) => (
              <Card key={building.id}>
                <CardHeader>
                  <CardTitle>{building.name}</CardTitle>
                  <CardDescription>
                    Code: {building.code} | Area: {building.area}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {building.shifts.length === 0 ? (
                    <p className="text-center text-gray-500">
                      No shifts assigned
                    </p>
                  ) : (
                    <div className="space-y-6">
                      {building.shifts
                        .slice(startIndex, endIndex)
                        .map((shift) => (
                          <div key={shift.id} className="space-y-4">
                            <div className="flex justify-between items-center">
                              <div>
                                <h3 className="text-lg font-semibold">
                                  Week {shift.week} - {shift.role?.name}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge
                                    variant={
                                      shift.status === "ACCEPTED"
                                        ? "success"
                                        : shift.status === "REJECTED"
                                          ? "destructive"
                                          : "default"
                                    }
                                  >
                                    {shift.status}
                                  </Badge>
                                  {shift.rejectionReason && (
                                    <span className="text-sm text-muted-foreground">
                                      Reason: {shift.rejectionReason}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditInspectors(shift.id, shift.week)}
                                >
                                  <UserPlus className="w-4 h-4 mr-1" />
                                  Edit Inspectors
                                </Button>
                              </div>
                            </div>

                            <div className="rounded-md border">
                              <table className="w-full">
                                <thead>
                                  <tr className="border-b bg-muted/50">
                                    <th className="p-2 text-left font-medium w-1/4">
                                      Inspectors
                                    </th>
                                    {DAYS.map((day, index) => (
                                      <th
                                        key={day}
                                        className="p-2 text-center font-medium"
                                      >
                                        <div className="flex flex-col items-center">
                                          <span>{day}</span>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 mt-1"
                                            onClick={() =>
                                              setEditingDay({
                                                shiftId: shift.id,
                                                dayOfWeek: index,
                                              })
                                            }
                                          >
                                            <Clock className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td className="p-2 align-top">
                                      <div className="space-y-1">
                                        {shift.shiftInspectors?.map((si, index) => (
                                          <div
                                            key={`${si.inspector.id}-${index}`}
                                            className="flex items-center justify-between gap-2 p-2 bg-secondary/10 rounded-md"
                                          >
                                            <span>{si.inspector.fullName}</span>
                                            <div className="flex items-center gap-2">
                                              {si.status === "PENDING" && user?.id === si.inspector.id && (
                                                <>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                      handleShiftResponse.mutate({
                                                        shiftId: shift.id,
                                                        inspectorId: si.inspector.id,
                                                        action: "ACCEPT",
                                                      })
                                                    }
                                                  >
                                                    <Check className="w-4 h-4 mr-1" />
                                                    Accept
                                                  </Button>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                      setRejectingShift({
                                                        shiftId: shift.id,
                                                        inspectorId: si.inspector.id,
                                                      })
                                                    }
                                                  >
                                                    <XCircle className="w-4 h-4 mr-1" />
                                                    Reject
                                                  </Button>
                                                </>
                                              )}
                                              {si.status !== "PENDING" && (
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
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </td>
                                    {DAYS.map((_, dayIndex) => {
                                      const dayShift = shift.days?.find(
                                        (d) => d.dayOfWeek === dayIndex,
                                      );
                                      return (
                                        <td
                                          key={dayIndex}
                                          className={`p-2 text-center`}
                                        >
                                          {dayShift?.shiftType?.name}
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
            ))}
          </div>
        )}
      </div>
    </Navbar>
  );
}