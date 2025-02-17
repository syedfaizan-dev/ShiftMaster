import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import Navbar from "@/components/navbar";

type Inspector = {
  id: number;
  fullName: string;
  username: string;
};

type ShiftInspector = {
  inspector: Inspector;
  isPrimary: boolean;
};

type ShiftWithRelations = {
  id: number;
  roleId: number;
  shiftTypeId: number;
  buildingId: number;
  week: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  responseAt: string | null;
  rejectionReason: string | null;
  shiftInspectors: ShiftInspector[];
  role: { id: number; name: string };
  shiftType: { id: number; name: string; startTime: string; endTime: string };
  building: { id: number; name: string; code: string; area: string };
};

type BuildingWithShifts = {
  id: number;
  name: string;
  code: string;
  area: string;
  shifts: ShiftWithRelations[];
};

type WeeklyTableProps = {
  shifts: ShiftWithRelations[];
  week: string;
  onDeleteShift: (shift: ShiftWithRelations) => void;
  isAdmin: boolean;
};

const WeeklyTable = ({ shifts, week, onDeleteShift, isAdmin }: WeeklyTableProps) => {
  // Group shifts by inspector group
  const inspectorGroups = shifts.reduce((groups: any[], shift) => {
    const groupKey = shift.shiftInspectors.map(si => si.inspector.id).sort().join('-');
    const existingGroup = groups.find(g => g.key === groupKey);

    if (existingGroup) {
      existingGroup.shifts.push(shift);
    } else {
      groups.push({
        key: groupKey,
        inspectors: shift.shiftInspectors,
        shifts: [shift],
      });
    }

    return groups;
  }, []);

  const columns = [
    {
      header: "Inspectors Group",
      accessorKey: "inspectors",
      cell: (inspectors: ShiftInspector[]) => (
        <div className="space-y-1">
          {inspectors?.map((si, index) => (
            <div key={`${si.inspector.id}-${index}`}>
              <span className="text-sm">{si.inspector.fullName}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      header: "Inspectors Info",
      accessorKey: "inspectors",
      cell: (inspectors: ShiftInspector[]) => (
        <span className="text-sm">
          {inspectors?.length || 0} inspector{inspectors?.length !== 1 ? 's' : ''}
        </span>
      ),
    },
    {
      header: "Sunday",
      accessorKey: "shifts",
      cell: (shifts: ShiftWithRelations[]) => {
        const shift = shifts.find(s => {
          // Logic to determine if shift is on Sunday based on shift type
          return true; // Placeholder
        });
        return shift ? `${shift.shiftType.startTime} - ${shift.shiftType.endTime}` : "-";
      },
    },
    {
      header: "Monday",
      accessorKey: "shifts",
      cell: (shifts: ShiftWithRelations[]) => {
        const shift = shifts.find(s => {
          // Logic to determine if shift is on Monday
          return true; // Placeholder
        });
        return shift ? `${shift.shiftType.startTime} - ${shift.shiftType.endTime}` : "-";
      },
    },
    {
      header: "Tuesday",
      accessorKey: "shifts",
      cell: (shifts: ShiftWithRelations[]) => {
        const shift = shifts.find(s => {
          // Logic to determine if shift is on Tuesday
          return true; // Placeholder
        });
        return shift ? `${shift.shiftType.startTime} - ${shift.shiftType.endTime}` : "-";
      },
    },
    {
      header: "Wednesday",
      accessorKey: "shifts",
      cell: (shifts: ShiftWithRelations[]) => {
        const shift = shifts.find(s => {
          // Logic to determine if shift is on Wednesday
          return true; // Placeholder
        });
        return shift ? `${shift.shiftType.startTime} - ${shift.shiftType.endTime}` : "-";
      },
    },
    {
      header: "Thursday",
      accessorKey: "shifts",
      cell: (shifts: ShiftWithRelations[]) => {
        const shift = shifts.find(s => {
          // Logic to determine if shift is on Thursday
          return true; // Placeholder
        });
        return shift ? `${shift.shiftType.startTime} - ${shift.shiftType.endTime}` : "-";
      },
    },
    {
      header: "Friday",
      accessorKey: "shifts",
      cell: (shifts: ShiftWithRelations[]) => {
        const shift = shifts.find(s => {
          // Logic to determine if shift is on Friday
          return true; // Placeholder
        });
        return shift ? `${shift.shiftType.startTime} - ${shift.shiftType.endTime}` : "-";
      },
    },
    {
      header: "Saturday",
      accessorKey: "shifts",
      cell: (shifts: ShiftWithRelations[]) => {
        const shift = shifts.find(s => {
          // Logic to determine if shift is on Saturday
          return true; // Placeholder
        });
        return shift ? `${shift.shiftType.startTime} - ${shift.shiftType.endTime}` : "-";
      },
    },
  ];

  return (
    <div className="rounded-md border">
      <ResponsiveTable
        columns={columns}
        data={inspectorGroups}
      />
    </div>
  );
};

export default function Shifts() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [shiftToDelete, setShiftToDelete] = useState<ShiftWithRelations | null>(null);

  const { data: buildingsData, isLoading: isLoadingBuildings } = useQuery<{
    buildings: BuildingWithShifts[];
  }>({
    queryKey: ["/api/buildings/with-shifts"],
    queryFn: async () => {
      const response = await fetch("/api/buildings/with-shifts", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch buildings");
      }
      return response.json();
    },
  });

  const buildings = buildingsData?.buildings || [];

  const deleteShift = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/shifts/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Shift deleted successfully" });
      setShiftToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/buildings/with-shifts"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  // Get all weeks in the current year
  const weeks = Array.from({ length: 52 }, (_, i) => (i + 1).toString());

  return (
    <Navbar>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Shifts by Building</h1>
          {user?.isAdmin && (
            <Button onClick={() => setLocation("/create-shift")}>
              Create New Shift
            </Button>
          )}
        </div>

        {isLoadingBuildings ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : buildings.length === 0 ? (
          <p className="text-center text-gray-500">No buildings found</p>
        ) : (
          <div className="grid gap-6">
            {buildings.map((building) => (
              <Card key={building.id}>
                <CardHeader>
                  <CardTitle>{building.name}</CardTitle>
                  <CardDescription>
                    Code: {building.code} | Area: {building.area}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {weeks.map((week) => {
                      const weekShifts = building.shifts.filter(
                        (shift) => shift.week === week
                      );

                      return weekShifts.length > 0 ? (
                        <div key={week} className="space-y-2">
                          <h3 className="text-lg font-semibold">Week {week}</h3>
                          <WeeklyTable
                            shifts={weekShifts}
                            week={week}
                            onDeleteShift={setShiftToDelete}
                            isAdmin={!!user?.isAdmin}
                          />
                        </div>
                      ) : null;
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <AlertDialog
          open={!!shiftToDelete}
          onOpenChange={(open) => !open && setShiftToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Shift</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this shift? This action cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() =>
                  shiftToDelete && deleteShift.mutate(shiftToDelete.id)
                }
                disabled={deleteShift.isPending}
              >
                {deleteShift.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Navbar>
  );
}