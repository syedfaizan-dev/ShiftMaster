import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useUser } from "@/hooks/use-user";

type User = {
  id: number;
  fullName: string;
  isInspector: boolean;
};

type Building = {
  id: number;
  name: string;
  code: string;
  area: string;
};

type Role = {
  id: number;
  name: string;
};

type ShiftType = {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
};

type DailyShiftType = {
  dayOfWeek: "SUNDAY" | "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY";
  shiftTypeId: string;
};

type Inspector = {
  id: string;
  isPrimary: boolean;
};

type ShiftFormProps = {
  onSuccess: () => void;
};

const shiftSchema = z.object({
  buildingId: z.string().min(1, "Building is required"),
  week: z.string().min(1, "Week is required"),
  roleId: z.string().min(1, "Role is required"),
  inspectors: z.array(z.object({
    id: z.string(),
    isPrimary: z.boolean(),
  })).min(1, "At least one inspector is required"),
  dailyShifts: z.array(z.object({
    dayOfWeek: z.enum(["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]),
    shiftTypeId: z.string(),
  })),
});

export default function ShiftForm({ onSuccess }: ShiftFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useUser();

  const form = useForm({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      buildingId: "",
      week: "",
      roleId: "",
      inspectors: [],
      dailyShifts: [],
    },
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: [user?.isAdmin ? "/api/admin/users" : "/api/users"],
  });

  const inspectors = users.filter(user => user.isInspector);

  const { data: roles } = useQuery<Role[]>({
    queryKey: [user?.isAdmin ? "/api/admin/roles" : "/api/roles"],
  });

  const { data: shiftTypes } = useQuery<ShiftType[]>({
    queryKey: ["/api/shift-types"],
  });

  const { data: buildings } = useQuery<Building[]>({
    queryKey: ["/api/admin/buildings"],
  });

  const createWeeklyShift = useMutation({
    mutationFn: async (data: z.infer<typeof shiftSchema>) => {
      const res = await fetch("/api/admin/weekly-shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buildingId: parseInt(data.buildingId),
          week: data.week,
          role: {
            id: parseInt(data.roleId),
          },
          inspectors: data.inspectors.map(inspector => ({
            id: parseInt(inspector.id),
            isPrimary: inspector.isPrimary,
          })),
          dailyShifts: data.dailyShifts.map(shift => ({
            dayOfWeek: shift.dayOfWeek,
            shiftTypeId: parseInt(shift.shiftTypeId),
          })),
        }),
        credentials: "include",
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to create weekly shift assignment');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ 
        title: "Success", 
        description: "Weekly shift assignment created successfully",
        duration: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/buildings/with-shifts"] });
      form.reset();
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
        duration: 5000,
      });
    },
  });

  const onSubmit = async (data: z.infer<typeof shiftSchema>) => {
    try {
      await createWeeklyShift.mutateAsync(data);
    } catch (error) {
      console.error('Weekly shift assignment operation failed:', error);
    }
  };

  const daysOfWeek = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ] as const;

  return (
    <div className="overflow-y-auto flex-1 px-6 py-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="buildingId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Building</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a building" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {buildings?.map((building) => (
                      <SelectItem key={building.id} value={building.id.toString()}>
                        {building.name} ({building.code})
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
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select week" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Array.from({ length: 52 }, (_, i) => i + 1).map((week) => (
                      <SelectItem key={week} value={week.toString()}>
                        Week {week}
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
            name="roleId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
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

          {daysOfWeek.map((day) => (
            <FormField
              key={day}
              control={form.control}
              name={`dailyShifts.${day}`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{day.charAt(0) + day.slice(1).toLowerCase()}</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      const currentShifts = form.getValues("dailyShifts");
                      const updatedShifts = value
                        ? [...currentShifts, { dayOfWeek: day, shiftTypeId: value }]
                        : currentShifts.filter((shift) => shift.dayOfWeek !== day);
                      form.setValue("dailyShifts", updatedShifts);
                    }}
                    value={
                      form
                        .getValues("dailyShifts")
                        .find((shift) => shift.dayOfWeek === day)?.shiftTypeId || ""
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select shift type (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">No Shift</SelectItem>
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
          ))}

          <FormField
            control={form.control}
            name="inspectors"
            render={() => (
              <FormItem>
                <FormLabel>Inspectors</FormLabel>
                <div className="space-y-2">
                  {inspectors.map((inspector) => {
                    const isSelected = form
                      .getValues("inspectors")
                      .some((i) => i.id === inspector.id.toString());
                    return (
                      <div key={inspector.id} className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          onClick={() => {
                            const currentInspectors = form.getValues("inspectors");
                            if (isSelected) {
                              form.setValue(
                                "inspectors",
                                currentInspectors.filter((i) => i.id !== inspector.id.toString())
                              );
                            } else {
                              form.setValue("inspectors", [
                                ...currentInspectors,
                                { id: inspector.id.toString(), isPrimary: false },
                              ]);
                            }
                          }}
                        >
                          {inspector.fullName}
                        </Button>
                        {isSelected && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const currentInspectors = form.getValues("inspectors");
                              const inspectorIndex = currentInspectors.findIndex(
                                (i) => i.id === inspector.id.toString()
                              );
                              const updatedInspectors = [...currentInspectors];
                              updatedInspectors[inspectorIndex] = {
                                ...updatedInspectors[inspectorIndex],
                                isPrimary: !updatedInspectors[inspectorIndex].isPrimary,
                              };
                              form.setValue("inspectors", updatedInspectors);
                            }}
                          >
                            {form
                              .getValues("inspectors")
                              .find((i) => i.id === inspector.id.toString())?.isPrimary
                              ? "Primary"
                              : "Make Primary"}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="sticky bottom-0 bg-white pb-4 pt-2">
            <Button 
              type="submit" 
              disabled={createWeeklyShift.isPending}
              className="w-full"
            >
              {createWeeklyShift.isPending ? "Creating..." : "Create Weekly Assignment"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}