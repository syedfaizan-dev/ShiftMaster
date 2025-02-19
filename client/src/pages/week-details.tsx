import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Link, useParams } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Users, Clock, Edit, ArrowLeft } from "lucide-react";
import Navbar from "@/components/navbar";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

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

const inspectorGroupSchema = z.object({
  name: z.string().min(1, "Group name is required"),
});

type InspectorGroupFormData = z.infer<typeof inspectorGroupSchema>;

const singleDayShiftTypeSchema = z.object({
  shiftTypeId: z.string(),
});

type SingleDayShiftTypeFormData = z.infer<typeof singleDayShiftTypeSchema>;

export default function WeekDetails() {
  const { user } = useUser();
  const { buildingId, weekId } = useParams();
  const queryClient = useQueryClient();
  const [selectedInspector, setSelectedInspector] = useState<string | null>(null);
  const [editingDay, setEditingDay] = useState<{ groupId: number; dayOfWeek: number } | null>(null);

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

  const { data: shiftTypesData } = useQuery<ShiftType[]>({
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

  // Find the building and shift from the existing data
  const building = buildingsData?.buildings.find(b => b.id.toString() === buildingId);
  const shiftData = building?.shifts.find(s => s.id.toString() === weekId);

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

  const createInspectorGroupMutation = useMutation({
    mutationFn: async (data: InspectorGroupFormData) => {
      const response = await fetch(`/api/admin/shifts/${weekId}/inspector-groups`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: data.name,
          days: DAYS.map((_, index) => ({
            dayOfWeek: index,
            shiftTypeId: null,
          })),
        }),
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

  const getAvailableInspectorsForGroup = (group: InspectorGroup) => {
    if (!availableInspectors) return [];
    const assignedInspectorIds = new Set(group.inspectors.map((si) => si.inspector.id));
    return availableInspectors.filter((inspector) => !assignedInspectorIds.has(inspector.id));
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
                Week {shiftData.week}
              </h1>
              <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                <span>{building?.name}</span>
                {shiftData.role && (
                  <>
                    <span>•</span>
                    <span>{shiftData.role.name}</span>
                  </>
                )}
              </div>
            </div>
          )}

          <Dialog>
            <DialogTrigger asChild>
              <Button className="ml-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Inspector Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Inspector Group</DialogTitle>
                <DialogDescription>
                  Create a new group of inspectors. You can add inspectors and set their schedules after creating the group.
                </DialogDescription>
              </DialogHeader>
              <Form {...createGroupForm}>
                <form
                  onSubmit={createGroupForm.handleSubmit((data) => createInspectorGroupMutation.mutate(data))}
                  className="space-y-4"
                >
                  <FormField
                    control={createGroupForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Group Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter group name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={createInspectorGroupMutation.isPending}>
                      {createInspectorGroupMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Create Group
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
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
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline">
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
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>
                                      {shiftDay.shiftType.startTime} - {shiftDay.shiftType.endTime}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">No shift assigned</p>
                              )}

                              <Dialog
                                open={editingDay?.groupId === group.id && editingDay?.dayOfWeek === index}
                                onOpenChange={(open) => {
                                  if (!open) {
                                    setEditingDay(null);
                                    singleDayShiftTypeForm.reset();
                                  }
                                }}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-2 w-full"
                                    onClick={() => {
                                      setEditingDay({ groupId: group.id, dayOfWeek: index });
                                      singleDayShiftTypeForm.reset({
                                        shiftTypeId: shiftDay?.shiftType?.id.toString() || "none",
                                      });
                                    }}
                                  >
                                    {shiftDay?.shiftType ? (
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
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>
                                      {shiftDay?.shiftType ? "Edit" : "Add"} Shift Type for {day}
                                    </DialogTitle>
                                    <DialogDescription>
                                      Select a shift type for this day.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <Form {...singleDayShiftTypeForm}>
                                    <form
                                      onSubmit={singleDayShiftTypeForm.handleSubmit((data) => {
                                        if (editingDay) {
                                          updateSingleDayShiftTypeMutation.mutate({
                                            groupId: editingDay.groupId,
                                            dayOfWeek: editingDay.dayOfWeek,
                                            shiftTypeId: data.shiftTypeId,
                                          });
                                        }
                                      })}
                                      className="space-y-4"
                                    >
                                      <FormField
                                        control={singleDayShiftTypeForm.control}
                                        name="shiftTypeId"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Shift Type</FormLabel>
                                            <Select
                                              onValueChange={field.onChange}
                                              value={field.value}
                                            >
                                              <FormControl>
                                                <SelectTrigger>
                                                  <SelectValue placeholder="Select shift type" />
                                                </SelectTrigger>
                                              </FormControl>
                                              <SelectContent>
                                                <SelectItem value="none">No shift</SelectItem>
                                                {shiftTypesData?.map((type) => (
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
                                          type="submit"
                                          disabled={updateSingleDayShiftTypeMutation.isPending}
                                        >
                                          {updateSingleDayShiftTypeMutation.isPending && (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          )}
                                          Save Changes
                                        </Button>
                                      </DialogFooter>
                                    </form>
                                  </Form>
                                </DialogContent>
                              </Dialog>
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