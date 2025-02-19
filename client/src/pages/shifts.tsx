import { useState, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Users, Clock, Edit } from "lucide-react";
import Navbar from "@/components/navbar";
import * as z from "zod";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Type definitions
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

// Form schemas
const filterFormSchema = z.object({
  buildingId: z.string().min(1, "Please select a building"),
  weekId: z.string().optional(),
});

const inspectorGroupSchema = z.object({
  name: z.string().min(1, "Group name is required"),
});

const singleDayShiftTypeSchema = z.object({
  shiftTypeId: z.string(),
});

type FilterFormData = z.infer<typeof filterFormSchema>;
type InspectorGroupFormData = z.infer<typeof inspectorGroupSchema>;
type SingleDayShiftTypeFormData = z.infer<typeof singleDayShiftTypeSchema>;

export default function BuildingShifts() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedInspector, setSelectedInspector] = useState<string | undefined>(undefined);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<ShiftAssignment | null>(null);
  const [selectedGroupForShiftTypes, setSelectedGroupForShiftTypes] = useState<InspectorGroup | null>(null);
  const [isEditShiftTypesOpen, setIsEditShiftTypesOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<{ groupId: number; dayOfWeek: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);


  const filterForm = useForm<FilterFormData>({
    resolver: zodResolver(filterFormSchema),
    defaultValues: {
      buildingId: "",
      weekId: "",
    },
  });

  const createGroupForm = useForm<InspectorGroupFormData>({
    resolver: zodResolver(inspectorGroupSchema),
    defaultValues: {
      name: "",
    },
  });

  const singleDayShiftTypeForm = useForm<SingleDayShiftTypeFormData>({
    resolver: zodResolver(singleDayShiftTypeSchema),
    defaultValues: {
      shiftTypeId: "",
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
    enabled: !!user?.isAdmin,
  });

  // Set default values when buildings data is loaded
  useEffect(() => {
    if (buildingsData?.buildings.length) {
      const firstBuilding = buildingsData.buildings[0];
      filterForm.setValue("buildingId", firstBuilding.id.toString());

      if (firstBuilding.shifts.length) {
        filterForm.setValue("weekId", firstBuilding.shifts[0].id.toString());
      }
    }
  }, [buildingsData, filterForm]);

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

  const { data: shiftTypesData, isLoading: isLoadingShiftTypes } = useQuery<ShiftType[]>({
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
    enabled: !!user?.isAdmin,
  });

  // Get the selected building's data
  const selectedBuilding = buildingsData?.buildings.find(
    (b) => b.id.toString() === filterForm.watch("buildingId")
  );

  // Get the selected week's data
  const selectedWeek = selectedBuilding?.shifts.find(
    (s) => s.id.toString() === filterForm.watch("weekId")
  );

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
      setSelectedInspector(undefined);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to assign inspector",
        variant: "destructive",
      });
    },
  });

  const createInspectorGroupMutation = useMutation({
    mutationFn: async ({ shiftId, data }: { shiftId: number; data: InspectorGroupFormData }) => {
      const response = await fetch(`/api/admin/shifts/${shiftId}/inspector-groups`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to create inspector group");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildings/with-shifts"] });
      toast({
        title: "Success",
        description: "Inspector group created successfully",
      });
      setIsCreateGroupDialogOpen(false);
      setSelectedShift(null);
      createGroupForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create inspector group",
        variant: "destructive",
      });
    },
  });

  const updateSingleDayShiftTypeMutation = useMutation({
    mutationFn: async ({
      groupId,
      dayOfWeek,
      shiftTypeId
    }: {
      groupId: number;
      dayOfWeek: number;
      shiftTypeId: string;
    }) => {
      const response = await fetch(`/api/admin/inspector-groups/${groupId}/days/${dayOfWeek}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          shiftTypeId: shiftTypeId === "none" ? null : parseInt(shiftTypeId),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update shift type");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildings/with-shifts"] });
      toast({
        title: "Success",
        description: "Shift type updated successfully",
      });
      setEditingDay(null);
      singleDayShiftTypeForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update shift type",
        variant: "destructive",
      });
    },
  });

  const getAvailableShiftTypes = (group: InspectorGroup, currentDayOfWeek: number, isEditing: boolean) => {
    if (!shiftTypesData) return [];

    if (!isEditing) {
      return shiftTypesData;
    }

    const currentDay = group.days.find(d => d.dayOfWeek === currentDayOfWeek);
    const currentShiftTypeId = currentDay?.shiftType?.id;

    if (!currentShiftTypeId) {
      return shiftTypesData;
    }

    return shiftTypesData.filter(type => type.id !== currentShiftTypeId);
  };

  const buildings = buildingsData?.buildings || [];
  const isLoading = isLoadingBuildings || isLoadingShiftTypes;

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

  const onFilterSubmit = (data: FilterFormData) => {
    // Handle form submission if needed
    console.log("Filter form submitted:", data);
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

  return (
    <Navbar>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Shifts Management</h1>

        <Form {...filterForm}>
          <form onSubmit={filterForm.handleSubmit(onFilterSubmit)} className="mb-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Building Selection */}
              <FormField
                control={filterForm.control}
                name="buildingId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Building</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          // When building changes, set the first week as selected
                          const building = buildingsData?.buildings.find(b => b.id.toString() === value);
                          if (building?.shifts.length) {
                            filterForm.setValue("weekId", building.shifts[0].id.toString());
                          } else {
                            filterForm.setValue("weekId", "");
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a building" />
                        </SelectTrigger>
                        <SelectContent>
                          {buildingsData?.buildings.map((building) => (
                            <SelectItem key={building.id} value={building.id.toString()}>
                              {building.name} ({building.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Week Selection */}
              <FormField
                control={filterForm.control}
                name="weekId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Week</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a week" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedBuilding?.shifts.map((shift) => (
                            <SelectItem key={shift.id} value={shift.id.toString()}>
                              Week {shift.week} - {shift.role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>

        {/* Show loading state */}
        {isLoading && (
          <div className="flex justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}

        {/* Show week details if both building and week are selected */}
        {selectedWeek && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedBuilding?.name} - Week {selectedWeek.week}
                </CardTitle>
                <CardDescription>
                  Role: {selectedWeek.role.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedWeek.inspectorGroups.map((group) => (
                  <div key={group.id} className="space-y-4 border rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">{group.name}</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedGroup(group.id)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Inspector
                      </Button>
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {DAYS.map((day, dayIndex) => {
                        const existingDay = group.days.find(
                          (d) => d.dayOfWeek === dayIndex
                        );
                        return (
                          <div
                            key={dayIndex}
                            className="flex items-center justify-between p-3 bg-secondary/10 rounded-md"
                          >
                            <div>
                              <p className="font-medium">{day}</p>
                              {existingDay?.shiftType ? (
                                <p className="text-sm text-muted-foreground">
                                  {existingDay.shiftType.name}
                                  <br />
                                  {existingDay.shiftType.startTime} -{" "}
                                  {existingDay.shiftType.endTime}
                                </p>
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  No shift assigned
                                </p>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingDay({ groupId: group.id, dayOfWeek: dayIndex });
                                setSelectedGroupForShiftTypes(group);
                                singleDayShiftTypeForm.reset({
                                  shiftTypeId: existingDay?.shiftType?.id.toString() || "none",
                                });
                              }}
                            >
                              {existingDay?.shiftType ? (
                                <>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </>
                              ) : (
                                <>
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add
                                </>
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>

                    {/* View Inspectors Button */}
                    <Button variant="outline" size="sm">
                      <Users className="h-4 w-4 mr-2" />
                      View Inspectors
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Navbar>
  );
}