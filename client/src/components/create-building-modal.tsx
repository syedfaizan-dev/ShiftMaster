import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash } from "lucide-react";

const buildingFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  area: z.string().min(1, "Area is required"),
  supervisorId: z.string().min(1, "Supervisor is required"),
  coordinators: z.array(z.object({
    coordinatorId: z.string().min(1, "Coordinator is required"),
    shiftTypeId: z.string().min(1, "Shift type is required")
  })).min(1, "At least one coordinator is required")
});

type BuildingFormValues = z.infer<typeof buildingFormSchema>;

export function CreateBuildingModal() {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: admins = [] } = useQuery({
    queryKey: ["/api/admin/admins"],
    queryFn: async () => {
      const response = await fetch("/api/admin/admins");
      if (!response.ok) throw new Error("Failed to fetch admins");
      return response.json();
    }
  });

  const { data: coordinators = [] } = useQuery({
    queryKey: ["/api/admin/managers"],
    queryFn: async () => {
      const response = await fetch("/api/admin/managers");
      if (!response.ok) throw new Error("Failed to fetch coordinators");
      return response.json();
    }
  });

  const { data: shiftTypes = [] } = useQuery({
    queryKey: ["/api/shift-types"],
    queryFn: async () => {
      const response = await fetch("/api/shift-types");
      if (!response.ok) throw new Error("Failed to fetch shift types");
      return response.json();
    }
  });

  const form = useForm<BuildingFormValues>({
    resolver: zodResolver(buildingFormSchema),
    defaultValues: {
      coordinators: [{ coordinatorId: "", shiftTypeId: "" }]
    }
  });

  const createBuilding = useMutation({
    mutationFn: async (data: BuildingFormValues) => {
      const response = await fetch("/api/admin/buildings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buildings"] });
      toast({
        title: "Success",
        description: "Building created successfully"
      });
      setOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  });

  const addCoordinator = () => {
    const currentCoordinators = form.getValues("coordinators");
    form.setValue("coordinators", [
      ...currentCoordinators,
      { coordinatorId: "", shiftTypeId: "" }
    ]);
  };

  const removeCoordinator = (index: number) => {
    const currentCoordinators = form.getValues("coordinators");
    if (currentCoordinators.length > 1) {
      form.setValue("coordinators", currentCoordinators.filter((_, i) => i !== index));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Building
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Building</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(data => createBuilding.mutate(data))}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Building Name</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="Enter building name"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Building Code</Label>
                <Input
                  id="code"
                  {...form.register("code")}
                  placeholder="Enter building code"
                />
                {form.formState.errors.code && (
                  <p className="text-sm text-red-500">{form.formState.errors.code.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="area">Area</Label>
                <Input
                  id="area"
                  {...form.register("area")}
                  placeholder="Enter building area"
                />
                {form.formState.errors.area && (
                  <p className="text-sm text-red-500">{form.formState.errors.area.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="supervisorId">Supervisor</Label>
                <Select
                  onValueChange={value => form.setValue("supervisorId", value)}
                  defaultValue={form.getValues("supervisorId")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supervisor" />
                  </SelectTrigger>
                  <SelectContent>
                    {admins.map((admin: any) => (
                      <SelectItem key={admin.id} value={admin.id.toString()}>
                        {admin.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.supervisorId && (
                  <p className="text-sm text-red-500">{form.formState.errors.supervisorId.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Coordinators</Label>
                <Button type="button" variant="outline" size="sm" onClick={addCoordinator}>
                  Add Coordinator
                </Button>
              </div>
              {form.watch("coordinators").map((_, index) => (
                <div key={index} className="grid grid-cols-3 gap-4 items-end border p-4 rounded-lg">
                  <div className="space-y-2 col-span-2">
                    <Label>Coordinator</Label>
                    <Select
                      onValueChange={value => 
                        form.setValue(`coordinators.${index}.coordinatorId`, value)
                      }
                      defaultValue={form.getValues(`coordinators.${index}.coordinatorId`)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select coordinator" />
                      </SelectTrigger>
                      <SelectContent>
                        {coordinators.map((coordinator: any) => (
                          <SelectItem key={coordinator.id} value={coordinator.id.toString()}>
                            {coordinator.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Shift Type</Label>
                    <Select
                      onValueChange={value => 
                        form.setValue(`coordinators.${index}.shiftTypeId`, value)
                      }
                      defaultValue={form.getValues(`coordinators.${index}.shiftTypeId`)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select shift type" />
                      </SelectTrigger>
                      <SelectContent>
                        {shiftTypes.map((shiftType: any) => (
                          <SelectItem key={shiftType.id} value={shiftType.id.toString()}>
                            {shiftType.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {index > 0 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => removeCoordinator(index)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {form.formState.errors.coordinators && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.coordinators.message}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createBuilding.isPending}>
              {createBuilding.isPending ? "Creating..." : "Create Building"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}