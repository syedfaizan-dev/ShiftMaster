import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";
import * as z from "zod";
import Navbar from "@/components/navbar";
import { Badge } from "@/components/ui/badge";

const shiftSchema = z.object({
  inspectorId: z.string().min(1, "Inspector is required"),
  roleId: z.string().min(1, "Role is required"),
  shiftTypeId: z.string().min(1, "Shift type is required"),
  week: z.string().min(1, "Week is required"),
  backupId: z.string(),
});

type ShiftFormData = z.infer<typeof shiftSchema>;

type Inspector = {
  id: number;
  username: string;
  fullName: string;
  availability?: {
    isAvailable: boolean;
    reason?: string;
  };
};

export default function CreateShift() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedShiftType, setSelectedShiftType] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);

  const form = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      inspectorId: "",
      roleId: "",
      shiftTypeId: "",
      week: "",
      backupId: "none",
    },
  });

  const { data: roles = [] } = useQuery<any[]>({
    queryKey: ["/api/roles"],
  });

  const { data: shiftTypes = [] } = useQuery<any[]>({
    queryKey: ["/api/shift-types"],
  });

  // Query to get inspectors and their availability based on both shift type and week
  const { data: inspectorsWithAvailability = [], isLoading: isLoadingInspectors } = useQuery<Inspector[]>({
    queryKey: ["/api/admin/shifts/inspectors", selectedShiftType, selectedWeek],
    enabled: !!(selectedShiftType && selectedWeek),
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
          backupId: data.backupId === "none" ? null : parseInt(data.backupId),
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

  // Get available inspectors (those who can be selected)
  const availableInspectors = inspectorsWithAvailability.filter(
    inspector => inspector.availability?.isAvailable
  );

  return (
    <Navbar>
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            onClick={() => setLocation("/shifts")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Shifts
          </Button>
          <h1 className="text-3xl font-bold">Create New Shift</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="pt-6">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((data) => createShift.mutate(data))}
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
                            // Reset inspector selection when shift type changes
                            form.setValue("inspectorId", "");
                            form.setValue("backupId", "none");
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
                                {type.name}
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
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedWeek(value);
                            // Reset inspector selection when week changes
                            form.setValue("inspectorId", "");
                            form.setValue("backupId", "none");
                          }}
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

                  <FormField
                    control={form.control}
                    name="inspectorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inspector</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!selectedShiftType || !selectedWeek || isLoadingInspectors}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  isLoadingInspectors
                                    ? "Loading inspectors..."
                                    : !selectedShiftType || !selectedWeek
                                      ? "Select shift type and week first"
                                      : "Select inspector"
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableInspectors.map((inspector) => (
                              <SelectItem
                                key={inspector.id}
                                value={inspector.id.toString()}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span>{inspector.fullName}</span>
                                  <Badge variant="success">Available</Badge>
                                </div>
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
                          disabled={!selectedShiftType || !selectedWeek || isLoadingInspectors}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select backup inspector" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {availableInspectors.map((inspector) => (
                              <SelectItem
                                key={inspector.id}
                                value={inspector.id.toString()}
                                disabled={inspector.id.toString() === form.getValues("inspectorId")}
                              >
                                {inspector.fullName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end pt-4">
                    <Button
                      type="submit"
                      disabled={createShift.isPending}
                    >
                      {createShift.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Create Shift
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Inspector Availability</h2>
            {!selectedShiftType || !selectedWeek ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Incomplete Selection</AlertTitle>
                <AlertDescription>
                  Select both a shift type and week to see inspector availability.
                </AlertDescription>
              </Alert>
            ) : isLoadingInspectors ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {inspectorsWithAvailability?.map((inspector) => (
                  <Card key={inspector.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{inspector.fullName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {inspector.username}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {inspector.availability?.isAvailable ? (
                            <>
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                              <span className="text-green-500">Available</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-5 w-5 text-red-500" />
                              <span className="text-red-500">
                                Unavailable
                                {inspector.availability?.reason && ` - ${inspector.availability.reason}`}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Navbar>
  );
}