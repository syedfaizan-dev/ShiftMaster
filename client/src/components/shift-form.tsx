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

type ShiftWithRelations = {
  id: number;
  inspectors: {inspector: User}[];
  roleId: number;
  shiftTypeId: number;
  buildingId: number;
  week: number;
  backupId: number | null;
};

type ShiftFormProps = {
  onSuccess: () => void;
  editShift?: ShiftWithRelations | null;
};

const shiftSchema = z.object({
  inspectorIds: z.array(z.string()).min(1, "At least one inspector is required"),
  roleId: z.string().min(1, "Role is required"),
  shiftTypeId: z.string().min(1, "Shift type is required"),
  buildingId: z.string().min(1, "Building is required"),
  week: z.string().min(1, "Week is required"),
  backupId: z.string().optional(),
});

export default function ShiftForm({ onSuccess, editShift }: ShiftFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useUser();

  const form = useForm({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      inspectorIds: editShift ? editShift.inspectors.map(i => i.inspector.id.toString()) : [],
      roleId: editShift ? editShift.roleId.toString() : "",
      shiftTypeId: editShift ? editShift.shiftTypeId.toString() : "",
      buildingId: editShift ? editShift.buildingId.toString() : "",
      week: editShift ? editShift.week.toString() : "",
      backupId: editShift?.backupId ? editShift.backupId.toString() : "",
    },
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: [user?.isAdmin ? "/api/admin/users" : "/api/users"],
  });

  // Filter users to only show inspectors
  const inspectors = users.filter(user => user.isInspector);

  const { data: roles } = useQuery<any[]>({
    queryKey: [user?.isAdmin ? "/api/admin/roles" : "/api/roles"],
  });

  const { data: shiftTypes } = useQuery<any[]>({
    queryKey: ["/api/shift-types"],
  });

  const { data: buildings } = useQuery<Building[]>({
    queryKey: ["/api/admin/buildings"],
  });

  const createShift = useMutation({
    mutationFn: async (data: z.infer<typeof shiftSchema>) => {
      const res = await fetch("/api/admin/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          inspectorIds: data.inspectorIds.map(id => parseInt(id)),
          roleId: parseInt(data.roleId),
          shiftTypeId: parseInt(data.shiftTypeId),
          buildingId: parseInt(data.buildingId),
          backupId: data.backupId ? parseInt(data.backupId) : null,
        }),
        credentials: "include",
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to create shift');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ 
        title: "Success", 
        description: "Shift created successfully",
        duration: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
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

  const updateShift = useMutation({
    mutationFn: async (data: any) => {
      if (!editShift) throw new Error("No shift selected for update");

      const res = await fetch(`/api/admin/shifts/${editShift.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          inspectorIds: data.inspectorIds.map(id => parseInt(id)),
          roleId: parseInt(data.roleId),
          shiftTypeId: parseInt(data.shiftTypeId),
          buildingId: parseInt(data.buildingId),
          backupId: data.backupId ? parseInt(data.backupId) : null,
        }),
        credentials: "include",
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to update shift');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ 
        title: "Success", 
        description: "Shift updated successfully",
        duration: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
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
      if (editShift) {
        await updateShift.mutateAsync(data);
      } else {
        await createShift.mutateAsync(data);
      }
    } catch (error) {
      console.error('Shift operation failed:', error);
    }
  };

  return (
    <div className="overflow-y-auto flex-1 px-6 py-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="inspectorIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Inspectors</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    const currentValues = field.value || [];
                    if (!currentValues.includes(value)) {
                      field.onChange([...currentValues, value]);
                    }
                  }}
                  value={field.value?.[field.value.length - 1] || ""}
                  multiple
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select inspectors" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {inspectors.map((inspector) => (
                      <SelectItem 
                        key={inspector.id} 
                        value={inspector.id.toString()}
                        disabled={field.value?.includes(inspector.id.toString())}
                      >
                        {inspector.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {field.value?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {field.value.map((inspectorId) => {
                      const inspector = inspectors.find(i => i.id.toString() === inspectorId);
                      return (
                        <div
                          key={inspectorId}
                          className="flex items-center gap-1 bg-secondary/20 px-2 py-1 rounded-md"
                        >
                          <span className="text-sm">{inspector?.fullName}</span>
                          <button
                            type="button"
                            onClick={() => {
                              field.onChange(field.value.filter(id => id !== inspectorId));
                            }}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
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

          <FormField
            control={form.control}
            name="shiftTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Shift Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a shift type" />
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
            name="backupId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Backup Inspector</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a backup inspector" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {inspectors.map((inspector) => (
                      <SelectItem key={inspector.id} value={inspector.id.toString()}>
                        {inspector.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="sticky bottom-0 bg-white pb-4 pt-2">
            <Button 
              type="submit" 
              disabled={createShift.isPending || updateShift.isPending}
              className="w-full"
            >
              {editShift 
                ? (updateShift.isPending ? "Updating..." : "Update Shift")
                : (createShift.isPending ? "Creating..." : "Create Shift")
              }
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}