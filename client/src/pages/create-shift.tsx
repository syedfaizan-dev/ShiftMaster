import { useState } from "react";
import { useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import * as z from "zod";
import Navbar from "@/components/navbar";
import { format } from "date-fns";

// Schema for shift creation
const shiftSchema = z.object({
  inspectorId: z.string().min(1, "Inspector is required"),
  roleId: z.string().min(1, "Role is required"),
  shiftTypeId: z.string().min(1, "Shift type is required"),
  week: z.string().min(1, "Week is required"),
  backupId: z.string().optional(),
});

type ShiftFormData = z.infer<typeof shiftSchema>;

type InspectorAvailability = {
  id: number;
  fullName: string;
  username: string;
  existingShifts: {
    week: string;
    shiftType: {
      name: string;
      startTime: string;
      endTime: string;
    };
  }[];
  isAvailable: boolean;
};

export default function CreateShift() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedShiftType, setSelectedShiftType] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string>("");

  const form = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      inspectorId: "",
      roleId: "",
      shiftTypeId: "",
      week: "",
      backupId: "",
    },
  });

  // Fetch required data
  const { data: roles = [] } = useQuery<any[]>({
    queryKey: ["/api/roles"],
  });

  const { data: shiftTypes = [] } = useQuery<any[]>({
    queryKey: ["/api/shift-types"],
  });

  // Fetch inspector availability
  const { data: inspectorAvailability = [], isLoading: isLoadingAvailability } = useQuery<InspectorAvailability[]>({
    queryKey: ["/api/admin/shifts/inspectors/availability", selectedShiftType, selectedWeek],
    queryFn: async () => {
      if (!selectedShiftType || !selectedWeek) return [];
      const response = await fetch(
        `/api/admin/shifts/inspectors/availability?shiftTypeId=${selectedShiftType}&week=${selectedWeek}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch inspector availability");
      return response.json();
    },
    enabled: !!selectedShiftType && !!selectedWeek,
  });

  const createShift = useMutation({
    mutationFn: async (data: ShiftFormData) => {
      const res = await fetch("/api/admin/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          inspectorId: parseInt(data.inspectorId),
          roleId: parseInt(data.roleId),
          shiftTypeId: parseInt(data.shiftTypeId),
          backupId: data.backupId ? parseInt(data.backupId) : null,
        }),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Shift created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shifts"] });
      setLocation("/shifts");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
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
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/shifts")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Shifts
          </Button>
          <h1 className="text-3xl font-bold">Create New Shift</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(async (data) => {
                  await createShift.mutateAsync(data);
                })}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="shiftTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shift Type</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedShiftType(value);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select shift type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {shiftTypes?.map((type) => (
                            <SelectItem key={type.id} value={type.id.toString()}>
                              {type.name} ({type.startTime} - {type.endTime})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="week"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Week</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            setSelectedWeek(e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="roleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roles?.map((role) => (
                            <SelectItem
                              key={role.id}
                              value={role.id.toString()}
                            >
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="inspectorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inspector</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select inspector" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {inspectorAvailability?.map((inspector) => (
                            <SelectItem
                              key={inspector.id}
                              value={inspector.id.toString()}
                              disabled={!inspector.isAvailable}
                            >
                              {inspector.fullName}
                              {!inspector.isAvailable && " (Not Available)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={createShift.isPending}
                  className="w-full"
                >
                  {createShift.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Shift
                </Button>
              </form>
            </Form>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Inspector Availability</h2>
            {!selectedShiftType || !selectedWeek ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Select Shift Type and Week</AlertTitle>
                <AlertDescription>
                  Please select a shift type and week to see inspector availability.
                </AlertDescription>
              </Alert>
            ) : isLoadingAvailability ? (
              <div className="flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {inspectorAvailability.map((inspector) => (
                  <div
                    key={inspector.id}
                    className="p-4 border rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{inspector.fullName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {inspector.username}
                        </p>
                      </div>
                      {inspector.isAvailable ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    {inspector.existingShifts.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium">Existing Shifts:</p>
                        <ul className="mt-1 space-y-1">
                          {inspector.existingShifts.map((shift, index) => (
                            <li key={index} className="text-sm text-muted-foreground">
                              {format(new Date(shift.week), "MMM d, yyyy")} -{" "}
                              {shift.shiftType.name} ({shift.shiftType.startTime} -{" "}
                              {shift.shiftType.endTime})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Navbar>
  );
}