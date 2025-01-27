import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type ShiftFormProps = {
  onSuccess: () => void;
};

export default function ShiftForm({ onSuccess }: ShiftFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: {
      inspectorId: "",
      roleId: "",
      startTime: "",
      endTime: "",
      week: "",
      backupId: "",
    },
  });

  const { data: users } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: roles } = useQuery<any[]>({
    queryKey: ["/api/admin/roles"],
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
          backupId: data.backupId ? parseInt(data.backupId) : null,
        }),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Shift created successfully" });
      // Invalidate both admin and user shift queries
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
      });
    },
  });

  return (
    <>
      <DialogTitle>Create New Shift</DialogTitle>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => createShift.mutate(data))} className="space-y-4">
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
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time</FormLabel>
                <FormControl>
                  <Input 
                    type="datetime-local" 
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Time</FormLabel>
                <FormControl>
                  <Input 
                    type="datetime-local" 
                    {...field}
                  />
                </FormControl>
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
                  <Input {...field} />
                </FormControl>
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

          <Button type="submit" disabled={createShift.isPending}>
            Create Shift
          </Button>
        </form>
      </Form>
    </>
  );
}