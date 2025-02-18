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

  return (
    <Navbar>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Shifts by Building</h1>
        </div>

        {isLoadingBuildings ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : buildings.length === 0 ? (
          <p className="text-center text-gray-500">No buildings found</p>
        ) : (
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

        <Dialog
          open={!!editingDay}
          onOpenChange={(open) => !open && setEditingDay(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Shift Type</DialogTitle>
              <DialogDescription>
                Select a shift type for{" "}
                {editingDay ? DAYS[editingDay.dayOfWeek] : ""}.
              </DialogDescription>
            </DialogHeader>
            <Form {...shiftDayForm}>
              <form
                onSubmit={shiftDayForm.handleSubmit(handleShiftDaySubmit)}
                className="space-y-4"
              >
                <FormField
                  control={shiftDayForm.control}
                  name="shiftTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shift Type</FormLabel>
                      <Select onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a shift type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {shiftTypes?.map((type) => (
                            <SelectItem
                              key={type.id}
                              value={type.id.toString()}
                            >
                              {type.name} ({type.startTime} - {type.endTime})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setEditingDay(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateShiftDay.isPending}>
                    {updateShiftDay.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={!!editingInspectors}
          onOpenChange={(open) => {
            if (!open) {
              inspectorGroupForm.reset({ inspectors: [] });
              setEditingInspectors(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Inspector Group</DialogTitle>
              <DialogDescription>
                Select inspectors for this shift.
              </DialogDescription>
            </DialogHeader>
            <Form {...inspectorGroupForm}>
              <form
                onSubmit={inspectorGroupForm.handleSubmit(
                  handleInspectorGroupSubmit,
                )}
                className="space-y-4"
              >
                <FormField
                  control={inspectorGroupForm.control}
                  name="inspectors"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inspectors</FormLabel>
                      {isLoadingInspectors ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : inspectors && inspectors.length > 0 ? (
                        <>
                          <Select
                            onValueChange={(value) => {
                              const currentValues = field.value || [];
                              if (!currentValues.includes(value)) {
                                field.onChange([...currentValues, value]);
                              }
                            }}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Add inspectors" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {inspectors.map((inspector) => (
                                <SelectItem
                                  key={inspector.id}
                                  value={inspector.id.toString()}
                                >
                                  {inspector.fullName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="mt-2 space-y-2">
                            {field.value.map((inspectorId) => {
                              const inspector = inspectors?.find(
                                (i) => i.id.toString() === inspectorId
                              );
                              return (
                                <div
                                  key={inspectorId}
                                  className="flex items-center justify-between bg-muted p-2 rounded-md"
                                >
                                  <span>{inspector?.fullName}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      field.onChange(
                                        field.value.filter(
                                          (id) => id !== inspectorId
                                        )
                                      );
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        <p>No inspectors available for this shift</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setEditingInspectors(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateInspectorGroup.isPending}
                  >
                    {updateInspectorGroup.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={!!rejectingShift}
          onOpenChange={(open) => {
            if (!open) {
              setRejectingShift(null);
              rejectShiftForm.reset();
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Shift Assignment</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this shift assignment.
              </DialogDescription>
            </DialogHeader>
            <Form {...rejectShiftForm}>
              <form
                onSubmit={rejectShiftForm.handleSubmit(handleRejectShiftSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={rejectShiftForm.control}
                  name="rejectionReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter your reason for rejecting this shift"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setRejectingShift(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={handleShiftResponse.isPending}
                  >
                    {handleShiftResponse.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Rejecting...
                      </>
                    ) : (
                      "Reject"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </Navbar>
  );
}