import { useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  taskTypeId: z.string().min(1, "Task type is required"),
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
  taskTypeId: number;
  status: string;
  date: string;
  isFollowupNeeded: boolean;
  assignedTo: number;
  inspector: { id: number; fullName: string; username: string };
  assignedEmployee: { id: number; fullName: string; username: string };
  shiftType: { id: number; name: string; startTime: string; endTime: string };
  taskType: { id: number; name: string; description: string | null };
};

export default function Tasks() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedShiftType, setSelectedShiftType] = useState<string | null>(
    null,
  );

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      shiftTypeId: "",
      inspectorId: "",
      taskTypeId: "",
      status: "PENDING",
      date: "",
      isFollowupNeeded: false,
      assignedTo: "",
    },
  });

  const {
    data: tasks = [],
    isLoading: isLoadingTasks,
    error: tasksError,
  } = useQuery<TaskWithRelations[]>({
    queryKey: ["/api/admin/tasks"],
    retry: 1,
    retryDelay: 1000,
  });

  const { data: shiftTypes = [] } = useQuery<any[]>({
    queryKey: ["/api/shift-types"],
  });

  type Inspector = {
    id: number;
    fullName: string;
    username: string;
  };

  const { data: inspectors = [], isLoading: isLoadingInspectors } = useQuery<
    Inspector[]
  >({
    queryKey: ["/api/admin/shifts/inspectors", selectedShiftType],
    enabled: !!selectedShiftType,
    queryFn: async () => {
      if (!selectedShiftType) return [];
      const response = await fetch(
        `/api/admin/shifts/inspectors/${selectedShiftType}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch inspectors");
      }
      return response.json();
    },
  });

  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/employees"],
  });

  const { data: taskTypes = [] } = useQuery<any[]>({
    queryKey: ["/api/task-types"],
  });

  useEffect(() => {
    if (selectedShiftType) {
      form.setValue("inspectorId", "");
    }
  }, [selectedShiftType, form]);

  const createTask = useMutation({
    mutationFn: async (data: TaskFormData) => {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          inspectorId: parseInt(data.inspectorId),
          shiftTypeId: parseInt(data.shiftTypeId),
          taskTypeId: parseInt(data.taskTypeId),
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

  if (isLoadingTasks) {
    return (
      <Navbar>
        <div className="p-6">
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </Navbar>
    );
  }

  if (tasksError) {
    return (
      <Navbar>
        <div className="p-6">
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load tasks. Please try again later.
            </AlertDescription>
          </Alert>
        </div>
      </Navbar>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <Navbar>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Tasks</h1>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setIsDialogOpen(true)}>
                  Create Task
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] w-[90vw] max-w-[600px] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                  <DialogDescription>
                    Fill in the details below to create a new task.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Form {...form}>
                    <form
                      id="task-form"
                      onSubmit={form.handleSubmit(async (data) => {
                        await createTask.mutateAsync(data);
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
                                form.setValue("inspectorId", "");
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
                                  <SelectItem
                                    key={type.id}
                                    value={type.id.toString()}
                                  >
                                    {type.name} ({type.startTime} -{" "}
                                    {type.endTime})
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
                              disabled={
                                !selectedShiftType || isLoadingInspectors
                              }
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={
                                      isLoadingInspectors
                                        ? "Loading inspectors..."
                                        : !selectedShiftType
                                          ? "Select a shift type first"
                                          : "Select inspector"
                                    }
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {inspectors?.map((inspector) => (
                                  <SelectItem
                                    key={inspector.id}
                                    value={inspector.id.toString()}
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
                      <FormField
                        control={form.control}
                        name="taskTypeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Task Type</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select task type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {taskTypes?.map((type) => (
                                  <SelectItem
                                    key={type.id}
                                    value={type.id.toString()}
                                  >
                                    {type.name}{" "}
                                    {type.description &&
                                      `- ${type.description}`}
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
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="PENDING">Pending</SelectItem>
                                <SelectItem value="IN_PROGRESS">
                                  In Progress
                                </SelectItem>
                                <SelectItem value="COMPLETED">
                                  Completed
                                </SelectItem>
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
                          <FormItem className="mb-6">
                            <FormLabel>Assign To</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select employee" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {employees?.map((employee) => (
                                  <SelectItem
                                    key={employee.id}
                                    value={employee.id.toString()}
                                  >
                                    {employee.fullName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end gap-4 pt-4 sticky bottom-0 bg-background pb-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          form="task-form"
                          disabled={createTask.isPending}
                        >
                          {createTask.isPending ? "Creating..." : "Create Task"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Alert>
            <AlertTitle>No Tasks Found</AlertTitle>
            <AlertDescription>
              Create your first task to start managing work.
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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>Create Task</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] w-[90vw] max-w-[600px] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
                <DialogDescription>
                  Fill in the details below to create a new task.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Form {...form}>
                  <form
                    id="task-form"
                    onSubmit={form.handleSubmit(async (data) => {
                      await createTask.mutateAsync(data);
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
                              form.setValue("inspectorId", "");
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
                                <SelectItem
                                  key={type.id}
                                  value={type.id.toString()}
                                >
                                  {type.name} ({type.startTime} - {type.endTime}
                                  )
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
                            disabled={!selectedShiftType || isLoadingInspectors}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={
                                    isLoadingInspectors
                                      ? "Loading inspectors..."
                                      : !selectedShiftType
                                        ? "Select a shift type first"
                                        : "Select inspector"
                                  }
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {inspectors?.map((inspector) => (
                                <SelectItem
                                  key={inspector.id}
                                  value={inspector.id.toString()}
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
                    <FormField
                      control={form.control}
                      name="taskTypeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Task Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select task type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {taskTypes?.map((type) => (
                                <SelectItem
                                  key={type.id}
                                  value={type.id.toString()}
                                >
                                  {type.name}{" "}
                                  {type.description && `- ${type.description}`}
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
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="PENDING">Pending</SelectItem>
                              <SelectItem value="IN_PROGRESS">
                                In Progress
                              </SelectItem>
                              <SelectItem value="COMPLETED">
                                Completed
                              </SelectItem>
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
                        <FormItem className="mb-6">
                          <FormLabel>Assign To</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select employee" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {employees?.map((employee) => (
                                <SelectItem
                                  key={employee.id}
                                  value={employee.id.toString()}
                                >
                                  {employee.fullName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-4 pt-4 sticky bottom-0 bg-background pb-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        form="task-form"
                        disabled={createTask.isPending}
                      >
                        {createTask.isPending ? "Creating..." : "Create Task"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Inspector</TableHead>
              <TableHead>Shift Type</TableHead>
              <TableHead>Task Type</TableHead>
              <TableHead>Task Description</TableHead>

              <TableHead>Status</TableHead>
              <TableHead>Followup Needed</TableHead>
              <TableHead>Assigned To</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell>
                  {format(new Date(task.date), "MMM d, yyyy")}
                </TableCell>
                <TableCell>{task.inspector?.fullName || "Unknown"}</TableCell>
                <TableCell>{task.shiftType?.name || "Unknown"}</TableCell>
                <TableCell>{task.taskType?.name || "Unknown"}</TableCell>
                <TableCell>{task.taskType?.description || "Unknown"}</TableCell>
                <TableCell>{task.status}</TableCell>
                <TableCell>{task.isFollowupNeeded ? "Yes" : "No"}</TableCell>
                <TableCell>
                  {task.assignedEmployee?.fullName || "Unknown"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Navbar>
  );
}
