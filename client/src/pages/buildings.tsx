import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Plus, Minus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Navbar from "@/components/navbar";
import * as z from "zod";
import { TablePagination } from "@/components/table-pagination";
import { Checkbox } from "@/components/ui/checkbox";

const areaSchema = z.object({
  name: z.string().min(1, "Area name is required"),
  isCentralArea: z.boolean().default(false)
});

const coordinatorSchema = z.object({
  coordinatorId: z.string().min(1, "Coordinator is required"),
  shiftType: z.enum(["MORNING", "EVENING"], {
    required_error: "Shift type is required"
  })
});

const buildingSchema = z.object({
  name: z.string().min(1, "Building name is required"),
  code: z.string().min(1, "Building code is required"),
  supervisorId: z.string().min(1, "Supervisor is required"),
  areas: z.array(areaSchema).min(1, "At least one area is required"),
  coordinators: z.array(coordinatorSchema)
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
      areas: [{ name: "", isCentralArea: false }],
      coordinators: []
    }
  });

  const { data: buildings = [], isLoading } = useQuery({
    queryKey: ["/api/admin/buildings"],
    enabled: user?.isAdmin
  });

  const { data: managers = [] } = useQuery({
    queryKey: ["/api/admin/managers"],
    enabled: user?.isAdmin
  });

  // Calculate pagination
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

  const assignCoordinator = useMutation({
    mutationFn: async ({ buildingId, coordinatorId, shiftType }: { buildingId: number; coordinatorId: string; shiftType: string }) => {
      const res = await fetch(`/api/admin/buildings/${buildingId}/assign-coordinator`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coordinatorId, shiftType }),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Coordinator assigned successfully" });
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

  const addArea = () => {
    const currentAreas = form.getValues("areas");
    form.setValue("areas", [...currentAreas, { name: "", isCentralArea: false }]);
  };

  const removeArea = (index: number) => {
    const currentAreas = form.getValues("areas");
    form.setValue("areas", currentAreas.filter((_, i) => i !== index));
  };

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
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Supervisor</TableHead>
                  <TableHead>Areas</TableHead>
                  <TableHead>Coordinators</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentBuildings.map((building: any) => (
                  <TableRow key={building.id}>
                    <TableCell>{building.name}</TableCell>
                    <TableCell>{building.code}</TableCell>
                    <TableCell>
                      {building.supervisor?.fullName || "Not assigned"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {building.areas?.map((area: any) => (
                          <Badge
                            key={area.id}
                            variant={area.isCentralArea ? "default" : "outline"}
                          >
                            {area.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {building.coordinators?.map((coord: any) => (
                          <div key={coord.id} className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {coord.coordinator.fullName} ({coord.shiftType})
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            // Handle edit
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <TablePagination
              currentPage={currentPage}
              totalItems={buildings.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
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

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Areas</h3>
                    <Button type="button" variant="outline" size="sm" onClick={addArea}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Area
                    </Button>
                  </div>
                  {form.getValues("areas").map((_, index) => (
                    <div key={index} className="flex gap-4 items-start">
                      <FormField
                        control={form.control}
                        name={`areas.${index}.name`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input {...field} placeholder="Area name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`areas.${index}.isCentralArea`}
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 h-10">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="!mt-0">Central Area</FormLabel>
                          </FormItem>
                        )}
                      />
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeArea(index)}
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