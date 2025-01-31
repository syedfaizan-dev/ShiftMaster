import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Plus, Minus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Navbar from "@/components/navbar";
import * as z from "zod";
import { ResponsiveTable } from "@/components/ui/responsive-table";

type ShiftType = {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
};

const coordinatorSchema = z.object({
  coordinatorId: z.string().min(1, "Coordinator is required"),
  shiftType: z.string().min(1, "Shift type is required")
});

const buildingSchema = z.object({
  name: z.string().min(1, "Building name is required"),
  code: z.string().min(1, "Building code is required"),
  supervisorId: z.string().min(1, "Supervisor is required"),
  area: z.string().min(1, "Area is required"),
  coordinators: z.array(coordinatorSchema).min(1, "At least one coordinator is required")
});

type BuildingFormData = z.infer<typeof buildingSchema>;

export default function BuildingsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const form = useForm<BuildingFormData>({
    resolver: zodResolver(buildingSchema),
    defaultValues: {
      name: "",
      code: "",
      supervisorId: "",
      area: "",
      coordinators: [{ coordinatorId: "", shiftType: "" }]
    }
  });

  // Add useFieldArray hook for managing dynamic coordinator fields
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "coordinators"
  });

  const { data: buildings = [], isLoading } = useQuery({
    queryKey: ["/api/admin/buildings"],
    enabled: user?.isAdmin
  });

  // Query for shift types
  const { data: shiftTypes = [] } = useQuery<ShiftType[]>({
    queryKey: ["/api/shift-types"],
    enabled: user?.isAdmin
  });

  // Query for all users who can be supervisors
  const { data: supervisors = [] } = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: user?.isAdmin
  });

  // Query for managers who can be coordinators
  const { data: managers = [] } = useQuery({
    queryKey: ["/api/admin/managers"],
    enabled: user?.isAdmin
  });

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentBuildings = buildings.slice(startIndex, endIndex);

  const createBuilding = useMutation({
    mutationFn: async (data: BuildingFormData) => {
      const res = await fetch("/api/admin/buildings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Building created successfully" });
      setIsDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/buildings"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const addCoordinator = () => {
    append({ coordinatorId: "", shiftType: "" });
  };

  const removeCoordinator = (index: number) => {
    remove(index);
  };

  const columns = [
    {
      header: "Name",
      accessorKey: "name",
    },
    {
      header: "Code",
      accessorKey: "code",
    },
    {
      header: "Area",
      accessorKey: "area",
    },
    {
      header: "Supervisor",
      accessorKey: "supervisor",
      cell: (value: any) => value?.fullName || "Not assigned",
    },
    {
      header: "Coordinators",
      accessorKey: "coordinators",
      cell: (coordinators: any[]) => (
        <div className="flex flex-col gap-1">
          {coordinators?.map((coord: any) => (
            <Badge key={coord.id} variant="secondary">
              {coord.coordinator.fullName} ({coord.shiftType})
            </Badge>
          ))}
        </div>
      ),
    },
    {
      header: "Actions",
      accessorKey: "id",
      cell: (value: number) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            // Handle edit
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ];

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
          <h1 className="text-3xl font-bold">Buildings</h1>
          <Button onClick={() => setIsDialogOpen(true)}>
            Add New Building
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : buildings.length === 0 ? (
          <Alert>
            <AlertTitle>No Buildings</AlertTitle>
            <AlertDescription>
              There are no buildings in the system yet.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <ResponsiveTable
              columns={columns}
              data={currentBuildings}
            />

            <div className="mt-4">
              <TablePagination
                currentPage={currentPage}
                totalItems={buildings.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogTitle>Add New Building</DialogTitle>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createBuilding.mutate(data))} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Building Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Building Code</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="area"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Area</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter area name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="supervisorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supervisor</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select supervisor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {supervisors.map((supervisor: any) => (
                            <SelectItem key={supervisor.id} value={String(supervisor.id)}>
                              {supervisor.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Shift Coordinators</h3>
                    <Button type="button" variant="outline" size="sm" onClick={addCoordinator}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Coordinator
                    </Button>
                  </div>
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex gap-4 items-start">
                      <FormField
                        control={form.control}
                        name={`coordinators.${index}.coordinatorId`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select coordinator" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {managers.map((manager: any) => (
                                  <SelectItem key={manager.id} value={String(manager.id)}>
                                    {manager.fullName}
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
                        name={`coordinators.${index}.shiftType`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select shift type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {shiftTypes.map((shiftType) => (
                                  <SelectItem key={shiftType.id} value={shiftType.name}>
                                    {shiftType.name} ({shiftType.startTime} - {shiftType.endTime})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCoordinator(index)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <Button type="submit" disabled={createBuilding.isPending}>
                  {createBuilding.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Building'
                  )}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </Navbar>
  );
}