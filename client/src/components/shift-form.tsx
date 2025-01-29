import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useUser } from "@/hooks/use-user";

type ShiftWithRelations = {
  id: number;
  inspectorId: number;
  roleId: number;
  shiftTypeId: number;
  week: number;
  backupId: number | null;
  // Add other relevant fields from your API response
};

type ShiftFormProps = {
  onSuccess: () => void;
  editShift?: ShiftWithRelations | null;
};

const shiftSchema = z.object({
  inspectorId: z.string().min(1, "Inspector is required"),
  roleId: z.string().min(1, "Role is required"),
  shiftTypeId: z.string().min(1, "Shift type is required"),
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
      inspectorId: editShift ? editShift.inspectorId.toString() : "",
      roleId: editShift ? editShift.roleId.toString() : "",
      shiftTypeId: editShift ? editShift.shiftTypeId.toString() : "",
      week: editShift ? editShift.week.toString() : "",
      backupId: editShift?.backupId ? editShift.backupId.toString() : "",
    },
  });

  const { data: users } = useQuery<any[]>({
    queryKey: [user?.isAdmin ? "/api/admin/users" : "/api/users"],
  });

  const { data: roles } = useQuery<any[]>({
    queryKey: [user?.isAdmin ? "/api/admin/roles" : "/api/roles"],
  });

  const { data: shiftTypes } = useQuery<any[]>({
    queryKey: ["/api/shift-types"],
  });

  const createShift = useMutation({
    mutationFn: async (data: any) => {
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
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to create shift');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ 
        title: "Success", 
        description: editShift ? "Shift updated successfully" : "Shift created successfully",
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
          inspectorId: parseInt(data.inspectorId),
          roleId: parseInt(data.roleId),
          shiftTypeId: parseInt(data.shiftTypeId),
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
            name="inspectorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Inspector</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an inspector" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {users?.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.fullName}
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
                    {users?.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.fullName}
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