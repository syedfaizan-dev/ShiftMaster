import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Loader2 } from "lucide-react";
import * as z from "zod";
import Navbar from "@/components/navbar";

const shiftSchema = z.object({
  inspectorId: z.string().min(1, "Inspector is required"),
  roleId: z.string().min(1, "Role is required"),
  shiftTypeId: z.string().min(1, "Shift type is required"),
  week: z.string().min(1, "Week is required"),
  backupId: z.string().optional(),
});

type ShiftFormData = z.infer<typeof shiftSchema>;

export default function CreateShift() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const { data: roles = [] } = useQuery<any[]>({
    queryKey: ["/api/roles"],
  });

  const { data: shiftTypes = [] } = useQuery<any[]>({
    queryKey: ["/api/shift-types"],
  });

  const shiftTypeId = form.watch("shiftTypeId");
  const week = form.watch("week");

  const { data: inspectorAvailability = [], isLoading: isLoadingAvailability } = useQuery({
    queryKey: ["/api/admin/shifts/inspectors/availability", { shiftTypeId, week }],
    queryFn: async () => {
      if (!shiftTypeId || !week) return [];
      console.log("Fetching availability with params:", { shiftTypeId, week });
      const params = new URLSearchParams({
        shiftTypeId: shiftTypeId.toString(),
        week: week.toString(),
      });
      const response = await fetch(`/api/admin/shifts/inspectors/availability?${params}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        const error = await response.json();
        console.error("Availability API error:", error);
        throw new Error(error.message || "Failed to fetch inspector availability");
      }
      const data = await response.json();
      console.log("Availability data:", data);
      return data;
    },
    enabled: Boolean(shiftTypeId && week),
  });

  const createShift = useMutation({
    mutationFn: async (data: ShiftFormData) => {
      const res = await fetch("/api/admin/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inspectorId: parseInt(data.inspectorId),
          roleId: parseInt(data.roleId),
          shiftTypeId: parseInt(data.shiftTypeId),
          week: parseInt(data.week),
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

  return (
    <Navbar>
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/shifts")}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Shifts
          </Button>
          <h1 className="text-3xl font-bold">Create New Shift</h1>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Shift Details</h2>
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
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select shift type" />
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

                <FormField
                  control={form.control}
                  name="week"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Week</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select week" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.from({ length: 52 }, (_, i) => i + 1).map(
                            (week) => (
                              <SelectItem
                                key={week}
                                value={week.toString()}
                              >
                                Week {week}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
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
                        disabled={!form.watch("shiftTypeId") || !form.watch("week")}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                !form.watch("shiftTypeId") || !form.watch("week")
                                  ? "Select shift type and week first"
                                  : "Select inspector"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {inspectorAvailability?.map((inspector) => (
                            <SelectItem
                              key={inspector.id}
                              value={inspector.id.toString()}
                            >
                              {inspector.fullName}
                              {inspector.hasConflict && " (Has conflicting shift)"}
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
                  name="backupId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Backup Inspector (Optional)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!form.watch("shiftTypeId") || !form.watch("week")}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                !form.watch("shiftTypeId") || !form.watch("week")
                                  ? "Select shift type and week first"
                                  : "Select backup inspector"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {inspectorAvailability?.map((inspector) => (
                            <SelectItem
                              key={inspector.id}
                              value={inspector.id.toString()}
                              disabled={inspector.id.toString() === form.watch("inspectorId")}
                            >
                              {inspector.fullName}
                              {inspector.hasConflict && " (Has conflicting shift)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={createShift.isPending}
                    className="w-full"
                  >
                    {createShift.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Shift"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Inspector Availability</h2>
            {!form.watch("shiftTypeId") || !form.watch("week") ? (
              <Alert>
                <AlertTitle>No availability information</AlertTitle>
                <AlertDescription>
                  Select a shift type and week to see inspector availability.
                </AlertDescription>
              </Alert>
            ) : isLoadingAvailability ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : inspectorAvailability.length === 0 ? (
              <Alert>
                <AlertTitle>No inspectors found</AlertTitle>
                <AlertDescription>
                  No inspectors are available for this shift.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {inspectorAvailability.map((inspector) => (
                  <div
                    key={inspector.id}
                    className={`p-4 rounded-lg border ${
                      inspector.hasConflict
                        ? "bg-red-50 border-red-200"
                        : "bg-green-50 border-green-200"
                    }`}
                  >
                    <div className="font-medium">{inspector.fullName}</div>
                    <div className="text-sm text-gray-600">
                      {inspector.hasConflict
                        ? "Has conflicting shifts this week"
                        : "Available for this shift"}
                    </div>
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