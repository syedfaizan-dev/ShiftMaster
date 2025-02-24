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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Users, Edit, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import Navbar from "@/components/navbar";
import * as z from "zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";

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

const createWeekFormSchema = z.object({
  week: z.string().min(1, "Week is required"),
  roleId: z.string().min(1, "Role is required"),
});

type FilterFormData = z.infer<typeof filterFormSchema>;
type InspectorGroupFormData = z.infer<typeof inspectorGroupSchema>;
type SingleDayShiftTypeFormData = z.infer<typeof singleDayShiftTypeSchema>;
type CreateWeekFormData = z.infer<typeof createWeekFormSchema>;

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
  const [isAddInspectorOpen, setIsAddInspectorOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [groupToDelete, setGroupToDelete] = useState<number | null>(null);
  const [dayToDelete, setDayToDelete] = useState<{ groupId: number; dayOfWeek: number } | null>(null);
  const [openBuildingCombobox, setOpenBuildingCombobox] = useState(false);
  const [openWeekCombobox, setOpenWeekCombobox] = useState(false);
  const [buildingSearch, setBuildingSearch] = useState("");
  const [weekSearch, setWeekSearch] = useState("");
  const [isCreateWeekDialogOpen, setIsCreateWeekDialogOpen] = useState(false);


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

  const createWeekForm = useForm<CreateWeekFormData>({
    resolver: zodResolver(createWeekFormSchema),
    defaultValues: {
      week: "",
      roleId: "",
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

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: number) => {
      const response = await fetch(`/api/admin/inspector-groups/${groupId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to delete inspector group");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildings/with-shifts"] });
      toast({
        title: "Success",
        description: "Inspector group deleted successfully",
      });
      setGroupToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete inspector group",
        variant: "destructive",
      });
    },
  });

  const deleteShiftTypeMutation = useMutation({
    mutationFn: async ({ groupId, dayOfWeek }: { groupId: number; dayOfWeek: number }) => {
      const response = await fetch(
        `/api/admin/inspector-groups/${groupId}/days/${dayOfWeek}/shift-type`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      if (!response.ok) {
        throw new Error("Failed to delete shift type");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildings/with-shifts"] });
      toast({
        title: "Success",
        description: "Shift type removed successfully",
      });
      setDayToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete shift type",
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

  const getAvailableInspectorsForGroup = (group?: InspectorGroup) => {
    if (!availableInspectors || !group) return [];
    const assignedInspectorIds = new Set(group.inspectors.map((si) => si.inspector.id));
    return availableInspectors.filter((inspector) => !assignedInspectorIds.has(inspector.id));
  };

  const onFilterSubmit = (data: FilterFormData) => {
    // Handle form submission if needed
    console.log("Filter form submitted:", data);
  };

  // Reset selected group when building changes
  useEffect(() => {
    setSelectedGroup(null);
    setSelectedInspector(undefined);
    setIsAddInspectorOpen(false);
    setIsEditShiftTypesOpen(false);
    setEditingDay(null);
  }, [filterForm.watch("buildingId")]);

  // Filter buildings based on search
  const filteredBuildings = buildingsData?.buildings.filter((building) => {
    if (!buildingSearch) return true;
    const searchTerm = buildingSearch.toLowerCase();
    return (
      building.name.toLowerCase().includes(searchTerm) ||
      building.code.toLowerCase().includes(searchTerm) ||
      building.area.toLowerCase().includes(searchTerm)
    );
  });

  // Filter weeks based on search
  const filteredWeeks = selectedBuilding?.shifts.filter((shift) => {
    if (!weekSearch) return true;
    const searchTerm = weekSearch.toLowerCase();
    return (
      shift.week.toLowerCase().includes(searchTerm) ||
      shift.role.name.toLowerCase().includes(searchTerm)
    );
  });

  const columns: ColumnDef<InspectorGroup>[] = [
    {
      id: "inspectors",
      header: "Inspectors Info",
      cell: ({ row }) => {
        const group = row.original;
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{group.name}</div>
                <div className="text-xs text-muted-foreground">
                  {group.inspectors.length} inspector(s)
                </div>
              </div>
              <div className="flex space-x-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setSelectedGroup(group.id);
                    setIsAddInspectorOpen(true);
                  }}
                >
                  <Users className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setGroupToDelete(group.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              {group.inspectors.map((si) => (
                <div key={si.inspector.id} className="flex items-center gap-1 text-sm">
                  <span className="truncate">{si.inspector.fullName}</span>
                  <Badge
                    variant={
                      si.status === "ACCEPTED"
                        ? "success"
                        : si.status === "REJECTED"
                          ? "destructive"
                          : "default"
                    }
                    className="text-xs"
                  >
                    {si.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        );
      },
    },
    ...DAYS.map((day, index) => ({
      id: `day-${index}`,
      header: day,
      cell: ({ row }) => {
        const group = row.original;
        const dayIndex = (index + 1) % 7;
        const existingDay = group.days.find((d) => d.dayOfWeek === dayIndex);

        return (
          <div className="min-w-[180px] p-2">
            {existingDay?.shiftType ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">
                    {existingDay.shiftType.name}
                  </span>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditingDay({ groupId: group.id, dayOfWeek: dayIndex });
                        setSelectedGroupForShiftTypes(group);
                        setIsEditShiftTypesOpen(true);
                        singleDayShiftTypeForm.reset({
                          shiftTypeId: existingDay?.shiftType?.id.toString() || "none",
                        });
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setDayToDelete({ groupId: group.id, dayOfWeek: dayIndex })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {existingDay.shiftType.startTime} - {existingDay.shiftType.endTime}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">No shift assigned</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setEditingDay({ groupId: group.id, dayOfWeek: dayIndex });
                    setSelectedGroupForShiftTypes(group);
                    setIsEditShiftTypesOpen(true);
                    singleDayShiftTypeForm.reset({
                      shiftTypeId: "none",
                    });
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        );
      },
    })),
  ];

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

  const { data: roles } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/admin/roles"],
    queryFn: async () => {
      const response = await fetch("/api/admin/roles", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch roles");
      }
      return response.json();
    },
    enabled: !!user?.isAdmin,
  });

  const createWeekMutation = useMutation({
    mutationFn: async ({ buildingId, data }: { buildingId: number; data: CreateWeekFormData }) => {
      const response = await fetch(`/api/admin/buildings/${buildingId}/weeks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to create week");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildings/with-shifts"] });
      toast({
        title: "Success",
        description: "Week created successfully",
      });
      setIsCreateWeekDialogOpen(false);
      createWeekForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create week",
        variant: "destructive",
      });
    },
  });

  return (
    <Navbar>
      <div className="p-6">
        {/* Filter Form */}
        <Form {...filterForm}>
          <form onSubmit={filterForm.handleSubmit(onFilterSubmit)} className="mb-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Building Selection with Search */}
              <FormField
                control={filterForm.control}
                name="buildingId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Select Building</FormLabel>
                    <Popover open={openBuildingCombobox} onOpenChange={setOpenBuildingCombobox}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openBuildingCombobox}
                            className="justify-between"
                          >
                            {field.value
                              ? buildingsData?.buildings.find(
                                  (building) => building.id.toString() === field.value
                                )?.name || "Select building..."
                              : "Select building..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0">
                        <Command>
                          <CommandInput
                            placeholder="Search buildings..."
                            value={buildingSearch}
                            onValueChange={setBuildingSearch}
                          />
                          <CommandEmpty>No building found.</CommandEmpty>
                          <CommandGroup>
                            {filteredBuildings?.map((building) => (
                              <CommandItem
                                key={building.id}
                                value={building.id.toString()}
                                onSelect={(value) => {
                                  field.onChange(value);
                                  setOpenBuildingCombobox(false);
                                  setSelectedGroup(null);
                                  const building = buildingsData?.buildings.find(
                                    (b) => b.id.toString() === value
                                  );
                                  if (building?.shifts.length) {
                                    filterForm.setValue(
                                      "weekId",
                                      building.shifts[0].id.toString()
                                    );
                                  } else {
                                    filterForm.setValue("weekId", "");
                                  }
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === building.id.toString()
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {building.name} ({building.code})
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Week Selection with Search and Add Week Button */}
              <div className="space-y-2">
                <FormLabel>Week Selection</FormLabel>
                <div className="flex gap-2">
                  <FormField
                    control={filterForm.control}
                    name="weekId"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <Popover open={openWeekCombobox} onOpenChange={setOpenWeekCombobox}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openWeekCombobox}
                                className="justify-between"
                              >
                                {field.value
                                  ? `Week ${
                                      selectedBuilding?.shifts.find(
                                        (s) => s.id.toString() === field.value
                                      )?.week
                                    } - ${
                                      selectedBuilding?.shifts.find(
                                        (s) => s.id.toString() === field.value
                                      )?.role.name
                                    }`
                                  : "Select week..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0">
                            <Command>
                              <CommandInput
                                placeholder="Search weeks..."
                                value={weekSearch}
                                onValueChange={setWeekSearch}
                              />
                              <CommandEmpty>No week found.</CommandEmpty>
                              <CommandGroup>
                                {filteredWeeks?.map((shift) => (
                                  <CommandItem
                                    key={shift.id}
                                    value={shift.id.toString()}
                                    onSelect={(value) => {
                                      field.onChange(value);
                                      setOpenWeekCombobox(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === shift.id.toString()
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    Week {shift.week} - {shift.role.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {selectedBuilding && (
                    <Button
                      type="button"
                      onClick={() => setIsCreateWeekDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Week
                    </Button>
                  )}
                </div>
              </div>
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
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">
                  {selectedBuilding?.name} - Week {selectedWeek.week}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Role: {selectedWeek.role.name}
                </p>
              </div>
              <Button
                onClick={() => {
                  setIsCreateGroupDialogOpen(true);
                  setSelectedShift(selectedWeek);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Inspector Group
              </Button>
            </div>

            <div className="hidden md:block">
              <DataTable columns={columns} data={selectedWeek.inspectorGroups} />
            </div>

            {/* Mobile view */}
            <div className="block md:hidden space-y-6">
              {selectedWeek.inspectorGroups.map((group) => (
                <Card key={group.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{group.name}</CardTitle>
                        <CardDescription>{group.inspectors.length} inspector(s)</CardDescription>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setSelectedGroup(group.id);
                            setIsAddInspectorOpen(true);
                          }}
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setGroupToDelete(group.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Inspectors</h4>
                        {group.inspectors.map((si) => (
                          <div key={si.inspector.id} className="flex items-center gap-1 text-sm">
                            <span className="truncate">{si.inspector.fullName}</span>
                            <Badge
                              variant={
                                si.status === "ACCEPTED"
                                  ? "success"
                                  : si.status === "REJECTED"
                                    ? "destructive"
                                    : "default"
                              }
                              className="text-xs"
                            >
                              {si.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Weekly Schedule</h4>
                        <div className="grid grid-cols-1 gap-4">
                          {DAYS.map((day, index) => {
                            const dayIndex = (index + 1) % 7;
                            const existingDay = group.days.find((d) => d.dayOfWeek === dayIndex);
                            return (
                              <div key={day} className="flex items-center justify-between p-2 rounded-lg border">
                                <div className="font-medium">{day}</div>
                                {existingDay?.shiftType ? (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-4">
                                      <div>
                                        <div className="font-medium text-sm">
                                          {existingDay.shiftType.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {existingDay.shiftType.startTime} - {existingDay.shiftType.endTime}
                                        </div>
                                      </div>
                                      <div className="flex space-x-1">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() => {
                                            setEditingDay({ groupId: group.id, dayOfWeek: dayIndex });
                                            setSelectedGroupForShiftTypes(group);
                                            setIsEditShiftTypesOpen(true);
                                            singleDayShiftTypeForm.reset({
                                              shiftTypeId: existingDay?.shiftType?.id.toString() || "none",
                                            });
                                          }}
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setDayToDelete({ groupId: group.id, dayOfWeek: dayIndex })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {existingDay.shiftType.startTime} - {existingDay.shiftType.endTime}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">No shift</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setEditingDay({ groupId: group.id, dayOfWeek: dayIndex });
                    setSelectedGroupForShiftTypes(group);
                    setIsEditShiftTypesOpen(true);
                    singleDayShiftTypeForm.reset({
                      shiftTypeId: "none",
                    });
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Add Inspector Dialog */}
        <Dialog
          open={isAddInspectorOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsAddInspectorOpen(false);
              setSelectedInspector(undefined);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Inspector to Group</DialogTitle>
              <DialogDescription>Select an inspector to add to this group.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Select
                value={selectedInspector}
                onValueChange={setSelectedInspector}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an inspector" />
                </SelectTrigger>
                <SelectContent>
                  {selectedGroup && selectedWeek && availableInspectors && getAvailableInspectorsForGroup(
                    selectedWeek.inspectorGroups.find(g => g.id === selectedGroup)
                  ).map((inspector) => (
                    <SelectItem
                      key={inspector.id}
                      value={inspector.id.toString()}
                    >
                      {inspector.fullName}
                    </SelectItem>                  ))}
                </SelectContent>
              </Select>
              <DialogFooter>
                <Button
                  onClick={() => {
                    if (selectedInspector && selectedGroup) {
                      assignInspectorMutation.mutate({
                        groupId: selectedGroup,
                        inspectorId: parseInt(selectedInspector),
                      });
                    }
                  }}
                  disabled={!selectedInspector || assignInspectorMutation.isPending}
                >
                  {assignInspectorMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Inspector'
                  )}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Group Dialog */}
        <Dialog
          open={isCreateGroupDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsCreateGroupDialogOpen(false);
              setSelectedShift(null);
              createGroupForm.reset();
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Inspector Group</DialogTitle>
              <DialogDescription>
                Fill in the form below to create a new inspector group for Week {selectedShift?.week}.
              </DialogDescription>
            </DialogHeader>
            <Form {...createGroupForm}>
              <form onSubmit={createGroupForm.handleSubmit((data) =>
                createInspectorGroupMutation.mutate({ shiftId: selectedShift?.id!, data })
              )}>
                <FormField
                  control={createGroupForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group Name</FormLabel>
                      <FormControl>
                        <input
                          type="text"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="mt-4">
                  <Button type="submit" disabled={createInspectorGroupMutation.isPending}>
                    {createInspectorGroupMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Group'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Shift Types Dialog */}
        <Dialog open={isEditShiftTypesOpen} onOpenChange={setIsEditShiftTypesOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Shift Types</DialogTitle>
              <DialogDescription>Select the shift type for {DAYS[editingDay?.dayOfWeek ?? 0]}</DialogDescription>
            </DialogHeader>
            <Form {...singleDayShiftTypeForm}>
              <form
                onSubmit={singleDayShiftTypeForm.handleSubmit((data) =>
                  updateSingleDayShiftTypeMutation.mutate({
                    groupId: editingDay?.groupId!,
                    dayOfWeek: editingDay?.dayOfWeek!,
                    shiftTypeId: data.shiftTypeId,
                  })
                )}
              >
                <FormField
                  control={singleDayShiftTypeForm.control}
                  name="shiftTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shift Type</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a shift type" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedGroupForShiftTypes && getAvailableShiftTypes(
                              selectedGroupForShiftTypes,
                              editingDay?.dayOfWeek!,
                              true
                            ).map((shiftType) => (
                              <SelectItem key={shiftType.id} value={shiftType.id.toString()}>
                                {shiftType.name}
                              </SelectItem>
                            ))}
                            <SelectItem value="none">No Shift</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="mt-4">
                  <Button
                    type="submit"
                    disabled={updateSingleDayShiftTypeMutation.isPending}
                    onClick={() => {
                      if (singleDayShiftTypeForm.formState.isValid) {
                        setIsEditShiftTypesOpen(false);
                      }
                    }}
                  >
                    {updateSingleDayShiftTypeMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Shift Type'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Group Confirmation Dialog */}
        <AlertDialog open={groupToDelete !== null} onOpenChange={(open) => !open && setGroupToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will delete the inspector group and all related shift assignments.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (groupToDelete) {
                    deleteGroupMutation.mutate(groupToDelete);
                  }
                }}
              >
                {deleteGroupMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Group'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Shift Type Confirmation Dialog */}
        <AlertDialog 
          open={dayToDelete !== null} 
          onOpenChange={(open) => !open && setDayToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Shift Type?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the shift type assignment for this day.
                Are you sure you want to continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (dayToDelete) {
                    deleteShiftTypeMutation.mutate(dayToDelete);
                  }
                }}
              >
                {deleteShiftTypeMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Shift Type'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {/* Add Create Week Dialog */}
        <Dialog open={isCreateWeekDialogOpen} onOpenChange={setIsCreateWeekDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Week</DialogTitle>
              <DialogDescription>
                Add a new week to {selectedBuilding?.name}
              </DialogDescription>
            </DialogHeader>
            <Form {...createWeekForm}>
              <form
                onSubmit={createWeekForm.handleSubmit((data) => {
                  if (selectedBuilding) {
                    createWeekMutation.mutate({
                      buildingId: selectedBuilding.id,
                      data,
                    });
                  }
                })}
                className="space-y-4"
              >
                <FormField
                  control={createWeekForm.control}
                  name="week"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Week Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter week number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createWeekForm.control}
                  name="roleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roles?.map((role) => (
                            <SelectItem key={role.id} value={role.id.toString()}>
                              {role.name}
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
                    variant="outline"
                    onClick={() => setIsCreateWeekDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createWeekMutation.isPending}>
                    {createWeekMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Week"
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