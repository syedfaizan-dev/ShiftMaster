import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from "@/components/ui/dialog";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { TablePagination } from "@/components/table-pagination";
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
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import * as z from "zod";
import Navbar from "@/components/navbar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const taskSchema = z.object({
  shiftTypeId: z.string().min(1, "Shift type is required"),
  inspectorId: z.string().min(1, "Inspector is required"),
  taskTypeId: z.string().min(1, "Task type is required"),
  status: z.string().min(1, "Status is required"),
  date: z.string().min(1, "Date is required"),
  isFollowupNeeded: z.boolean(),
  assignedTo: z.string().min(1, "Assigned agency is required"), // Changed label
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
  assignedAgency: { id: number; name: string; description: string | null }; // Updated type
  shiftType: { id: number; name: string; startTime: string; endTime: string };
  taskType: { id: number; name: string; description: string | null };
};

export default function Tasks() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedShiftType, setSelectedShiftType] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null);

  // Add pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

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

  const { data: inspectors = [], isLoading: isLoadingInspectors } = useQuery<any[]>({
    queryKey: ["/api/admin/shifts/inspectors", selectedShiftType],
    enabled: !!selectedShiftType,
    queryFn: async () => {
      const response = await fetch(`/api/admin/shifts/inspectors?shiftTypeId=${selectedShiftType}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch inspectors');
      }
      return response.json();
    }
  });

  // Replace employees query with agencies query
  const { data: agencies = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/agencies"],
  });

  const { data: taskTypes = [] } = useQuery<any[]>({
    queryKey: ["/api/task-types"],
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
      setEditingTask(null);
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

  const updateTask = useMutation({
    mutationFn: async (data: TaskFormData & { id: number }) => {
      const { id, ...updateData } = data;
      const res = await fetch(`/api/admin/tasks/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          ...updateData,
          inspectorId: parseInt(updateData.inspectorId),
          shiftTypeId: parseInt(updateData.shiftTypeId),
          taskTypeId: parseInt(updateData.taskTypeId),
          assignedTo: parseInt(updateData.assignedTo),
        }),
        credentials: "include",
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to update task");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Task updated successfully" });
      setIsDialogOpen(false);
      setEditingTask(null);
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

  const deleteTask = useMutation({
    mutationFn: async (taskId: number) => {
      const res = await fetch(`/api/admin/tasks/${taskId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Task deleted successfully" });
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

  // Calculate pagination values
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentTasks = tasks.slice(startIndex, endIndex);

  // Handle pagination changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const handleOpenDialog = (task?: TaskWithRelations) => {
    if (task) {
      setEditingTask(task);
      // Add type checking before accessing shiftTypeId
      const shiftTypeId = task.shiftTypeId ? task.shiftTypeId.toString() : "";
      setSelectedShiftType(shiftTypeId);
      form.reset({
        shiftTypeId: shiftTypeId,
        inspectorId: task.inspectorId ? task.inspectorId.toString() : "",
        taskTypeId: task.taskTypeId ? task.taskTypeId.toString() : "",
        status: task.status || "PENDING",
        date: task.date || "",
        isFollowupNeeded: task.isFollowupNeeded || false,
        assignedTo: task.assignedTo ? task.assignedTo.toString() : "",
      });
    } else {
      setEditingTask(null);
      setSelectedShiftType(null);
      form.reset({
        shiftTypeId: "",
        inspectorId: "",
        taskTypeId: "",
        status: "PENDING",
        date: "",
        isFollowupNeeded: false,
        assignedTo: "",
      });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: TaskFormData) => {
    if (editingTask) {
      await updateTask.mutateAsync({ ...data, id: editingTask.id });
    } else {
      await createTask.mutateAsync(data);
    }
  };

  const columns = [
    {
      header: "Date",
      accessorKey: "date",
      cell: (value: string) => format(new Date(value), "MMM d, yyyy"),
    },
    {
      header: "Inspector",
      accessorKey: "inspector",
      cell: (value: any) => value?.fullName || "Unknown",
    },
    {
      header: "Shift Type",
      accessorKey: "shiftType",
      cell: (value: any) => value?.name || "Unknown",
    },
    {
      header: "Task Type",
      accessorKey: "taskType",
      cell: (value: any) => value?.name || "Unknown",
    },
    {
      header: "Description",
      accessorKey: "taskType",
      cell: (value: any) => value?.description || "Unknown",
    },
    {
      header: "Status",
      accessorKey: "status",
    },
    {
      header: "Follow-up Needed",
      accessorKey: "isFollowupNeeded",
      cell: (value: boolean) => (value ? "Yes" : "No"),
    },
    {
      header: "Assigned Agency",
      accessorKey: "assignedAgency",
      cell: (value: any) => value?.name || "Unknown",
    },
    {
      header: "Actions",
      accessorKey: "id",
      cell: (value: any, row: any) => {
        // Find the complete task data from the tasks array
        const task = tasks.find((t) => t.id === value);
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleOpenDialog(task)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the task.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteTask.mutate(value)}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      },
    },
  ];

  // Transform the data for the table
  const transformedData = tasks.map((task) => ({
    id: task.id,
    date: task.date,
    inspector: task.inspector,
    shiftType: task.shiftType,
    taskType: task.taskType,
    status: task.status,
    isFollowupNeeded: task.isFollowupNeeded,
    assignedAgency: task.assignedAgency,
  }));

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

  return (
    <Navbar>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Tasks</h1>
          <Button onClick={() => handleOpenDialog()}>Create Task</Button>
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
          <div className="rounded-md border">
            <ResponsiveTable
              columns={columns}
              data={transformedData.slice(startIndex, endIndex)}
            />
            <TablePagination
              currentPage={currentPage}
              totalItems={transformedData.length}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-h-[90vh] w-[90vw] max-w-[600px] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
              <DialogDescription>
                Fill in the details below to {editingTask ? 'update the' : 'create a new'} task.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Form {...form}>
                <form
                  id="task-form"
                  onSubmit={form.handleSubmit(onSubmit)}
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
                      <FormItem className="mb-6">
                        <FormLabel>Assign To Agency</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select agency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {agencies?.map((agency) => (
                              <SelectItem
                                key={agency.id}
                                value={agency.id.toString()}
                              >
                                {agency.name}
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
                      onClick={() => {
                        setIsDialogOpen(false);
                        setEditingTask(null);
                        form.reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      form="task-form"
                      disabled={createTask.isPending || updateTask.isPending}
                    >
                      {createTask.isPending || updateTask.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {editingTask ? 'Update Task' : 'Create Task'}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Navbar>
  );
}