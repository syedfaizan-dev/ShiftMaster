import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import * as z from "zod";
import Navbar from "@/components/navbar";

const taskSchema = z.object({
  shiftTypeId: z.string().min(1, "Shift type is required"),
  inspectorId: z.string().min(1, "Inspector is required"),
  taskType: z.string().min(1, "Task type is required"),
  description: z.string().min(1, "Description is required"),
  status: z.string().min(1, "Status is required"),
  date: z.string().min(1, "Date is required"),
  isFollowupNeeded: z.boolean(),
  assignedTo: z.string().min(1, "Assigned employee is required"),
});

type TaskFormData = z.infer<typeof taskSchema>;

type TaskWithRelations = {
  id: number;
  inspectorId: number;
  shiftTypeId: number;
  taskType: string;
  description: string;
  status: string;
  date: string;
  isFollowupNeeded: boolean;
  assignedTo: number;
  inspector: { id: number; fullName: string; username: string };
  assignedEmployee: { id: number; fullName: string; username: string };
  shiftType: { id: number; name: string; startTime: string; endTime: string };
};

export default function Tasks() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      shiftTypeId: "",
      inspectorId: "",
      taskType: "",
      description: "",
      status: "PENDING",
      date: "",
      isFollowupNeeded: false,
      assignedTo: "",
    },
  });

  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery<TaskWithRelations[]>({
    queryKey: ["/api/admin/tasks"],
  });

  const { data: shiftTypes = [] } = useQuery<any[]>({
    queryKey: ["/api/shift-types"],
  });

  const { data: inspectors = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    select: (users) => users.filter((user) => user.isInspector),
  });

  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/employees"],
  });

  const createTask = useMutation({
    mutationFn: async (data: TaskFormData) => {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          inspectorId: parseInt(data.inspectorId),
          shiftTypeId: parseInt(data.shiftTypeId),
          assignedTo: parseInt(data.assignedTo),
        }),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Task created successfully" });
      setIsDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tasks"] });
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Tasks</h1>
          <Button onClick={() => setIsDialogOpen(true)}>
            Create Task
          </Button>
        </div>

        {isLoadingTasks ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <Alert>
            <AlertTitle>No Tasks Found</AlertTitle>
            <AlertDescription>
              Create your first task to start managing work.
            </AlertDescription>
          </Alert>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Inspector</TableHead>
                <TableHead>Shift Type</TableHead>
                <TableHead>Task Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Followup</TableHead>
                <TableHead>Assigned To</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>{format(new Date(task.date), "MMM d, yyyy")}</TableCell>
                  <TableCell>{task.inspector?.fullName || "Unknown"}</TableCell>
                  <TableCell>{task.shiftType?.name || "Unknown"}</TableCell>
                  <TableCell>{task.taskType}</TableCell>
                  <TableCell>{task.description}</TableCell>
                  <TableCell>{task.status}</TableCell>
                  <TableCell>{task.isFollowupNeeded ? "Yes" : "No"}</TableCell>
                  <TableCell>{task.assignedEmployee?.fullName || "Unknown"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogTitle>Create New Task</DialogTitle>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(async (data) => await createTask.mutateAsync(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="shiftTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shift Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
                  name="inspectorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inspector</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select inspector" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {inspectors?.map((inspector) => (
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

                <FormField
                  control={form.control}
                  name="taskType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Type</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter task type" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Enter task description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PENDING">Pending</SelectItem>
                          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                          <SelectItem value="COMPLETED">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isFollowupNeeded"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormLabel>Follow-up Needed</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign To</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employees?.map((employee) => (
                            <SelectItem key={employee.id} value={employee.id.toString()}>
                              {employee.fullName}
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
                  disabled={createTask.isPending}
                  className="w-full"
                >
                  {createTask.isPending ? "Creating..." : "Create Task"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </Navbar>
  );
}
