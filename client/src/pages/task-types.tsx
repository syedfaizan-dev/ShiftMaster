import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import * as z from "zod";
import Navbar from "@/components/navbar";
import { TablePagination } from "@/components/table-pagination";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const taskTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

type TaskTypeFormData = z.infer<typeof taskTypeSchema>;

type TaskType = {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
};

export default function TaskTypes() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTaskType, setSelectedTaskType] = useState<TaskType | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const form = useForm<TaskTypeFormData>({
    resolver: zodResolver(taskTypeSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const { data: taskTypes = [], isLoading: isLoadingTaskTypes } = useQuery<TaskType[]>({
    queryKey: ["/api/task-types"],
  });

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentTaskTypes = taskTypes.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const createTaskType = useMutation({
    mutationFn: async (data: TaskTypeFormData) => {
      const res = await fetch("/api/admin/task-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Task type created successfully" });
      setIsDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/task-types"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const updateTaskType = useMutation({
    mutationFn: async (data: TaskTypeFormData & { id: number }) => {
      const res = await fetch(`/api/admin/task-types/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Task type updated successfully" });
      setIsDialogOpen(false);
      setSelectedTaskType(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/task-types"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const deleteTaskType = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/task-types/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Task type deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/task-types"] });
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

  const columns = [
    {
      header: "Name",
      accessorKey: "name",
    },
    {
      header: "Description",
      accessorKey: "description",
      cell: (value: string | null) => value || "—",
    },
    {
      header: "Actions",
      accessorKey: "id",
      cell: (value: number) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const taskType = taskTypes.find((t) => t.id === value);
              if (taskType) {
                setSelectedTaskType(taskType);
                form.reset({
                  name: taskType.name,
                  description: taskType.description || "",
                });
                setIsDialogOpen(true);
              }
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              if (confirm("Are you sure you want to delete this task type?")) {
                deleteTaskType.mutate(value);
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Navbar>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Task Types</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>Create Task Type</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] w-[90vw] max-w-[600px] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedTaskType ? "Edit Task Type" : "Create New Task Type"}
                </DialogTitle>
                <DialogDescription>
                  {selectedTaskType
                    ? "Edit the task type details below."
                    : "Fill in the details below to create a new task type."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Form {...form}>
                  <form
                    id="task-type-form"
                    onSubmit={form.handleSubmit(async (data) => {
                      if (selectedTaskType) {
                        await updateTaskType.mutateAsync({ ...data, id: selectedTaskType.id });
                      } else {
                        await createTaskType.mutateAsync(data);
                      }
                    })}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter task type name" />
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
                            <Textarea {...field} placeholder="Enter task type description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-4 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsDialogOpen(false);
                          setSelectedTaskType(null);
                          form.reset();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createTaskType.isPending || updateTaskType.isPending}
                      >
                        {createTaskType.isPending || updateTaskType.isPending
                          ? "Saving..."
                          : selectedTaskType
                          ? "Update"
                          : "Create"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoadingTaskTypes ? (
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : taskTypes.length === 0 ? (
          <Alert>
            <AlertTitle>No Task Types Found</AlertTitle>
            <AlertDescription>
              Create your first task type to get started.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <ResponsiveTable
              columns={columns}
              data={currentTaskTypes}
            />

            <TablePagination
              currentPage={currentPage}
              totalItems={taskTypes.length}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </>
        )}
      </div>
    </Navbar>
  );
}