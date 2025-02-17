import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { TablePagination } from "@/components/table-pagination";
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
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Trash2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Navbar from "@/components/navbar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

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
  buildingId: number;
  week: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  responseAt: string | null;
  rejectionReason: string | null;
  shiftInspectors: ShiftInspector[];
  role: { id: number; name: string };
  building: { id: number; name: string; code: string; area: string };
  days?: {dayOfWeek:number, shiftType?: {name:string}}[]
};

type BuildingWithShifts = {
  id: number;
  name: string;
  code: string;
  area: string;
  shifts: ShiftWithRelations[];
};

type BuildingsResponse = {
  buildings: BuildingWithShifts[];
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getShiftTypeDisplay = (shiftType?: { name: string }) => {
  if (!shiftType) return '-';
  if (shiftType.name.toLowerCase().includes('morning')) return 'Mo';
  if (shiftType.name.toLowerCase().includes('afternoon')) return 'A';
  if (shiftType.name.toLowerCase().includes('night')) return 'N';
  return '-';
};

const getShiftTypeColor = (shiftType?: { name: string }) => {
  if (!shiftType) return 'bg-white';
  if (shiftType.name.toLowerCase().includes('morning')) return 'bg-blue-50';
  if (shiftType.name.toLowerCase().includes('afternoon')) return 'bg-orange-50';
  if (shiftType.name.toLowerCase().includes('night')) return 'bg-purple-50';
  return 'bg-white';
};

const rejectShiftSchema = z.object({
  rejectionReason: z.string().min(1, "Please provide a reason for rejection"),
});

export default function Shifts() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [shiftToDelete, setShiftToDelete] = useState<ShiftWithRelations | null>(null);
  const [shiftToReject, setShiftToReject] = useState<ShiftWithRelations | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const form = useForm<{ rejectionReason: string }>({
    resolver: zodResolver(rejectShiftSchema),
    defaultValues: {
      rejectionReason: "",
    },
  });

  const { data: buildingsData, isLoading: isLoadingBuildings } = useQuery<BuildingsResponse>({
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

  // Calculate pagination values for shifts within each building
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

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

  const respondToShift = useMutation({
    mutationFn: async ({
      id,
      action,
      rejectionReason,
    }: {
      id: number;
      action: "ACCEPT" | "REJECT";
      rejectionReason?: string;
    }) => {
      const res = await fetch(`/api/shifts/${id}/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, rejectionReason }),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Response submitted successfully",
      });
      setShiftToReject(null);
      form.reset();
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

  const handleAccept = (shift: ShiftWithRelations) => {
    respondToShift.mutate({ id: shift.id, action: "ACCEPT" });
  };

  const handleReject = async (data: { rejectionReason: string }) => {
    if (!shiftToReject) return;
    await respondToShift.mutateAsync({
      id: shiftToReject.id,
      action: "REJECT",
      rejectionReason: data.rejectionReason,
    });
  };

  const renderShiftTable = (shift: ShiftWithRelations) => {
    return (
      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-medium">Inspectors</th>
              {DAYS.map(day => (
                <th key={day} className="p-2 text-center font-medium">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shift.shiftInspectors?.map((si, index) => (
              <tr key={`${si.inspector.id}-${index}`} className="border-b">
                <td className="p-2">
                  <div className="flex flex-col">
                    <span>{si.inspector.fullName}</span>
                    {si.isPrimary && (
                      <span className="text-xs text-muted-foreground">(Primary)</span>
                    )}
                  </div>
                </td>
                {DAYS.map((_, dayIndex) => {
                  const dayShift = shift.days?.find(d => d.dayOfWeek === dayIndex);
                  return (
                    <td key={dayIndex} className={`p-2 text-center ${getShiftTypeColor(dayShift?.shiftType)}`}>
                      {getShiftTypeDisplay(dayShift?.shiftType)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

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
            {buildings.map((building: BuildingWithShifts) => (
              <Card key={building.id}>
                <CardHeader>
                  <CardTitle>{building.name}</CardTitle>
                  <CardDescription>
                    Code: {building.code} | Area: {building.area}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {building.shifts.length === 0 ? (
                    <p className="text-center text-gray-500">No shifts assigned</p>
                  ) : (
                    <div className="space-y-6">
                      {building.shifts.slice(startIndex, endIndex).map((shift) => (
                        <div key={shift.id} className="space-y-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="text-lg font-semibold">
                                Week {shift.week} - Group {shift.shiftInspectors[0]?.inspector.fullName}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                Role: {shift.role?.name}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  shift.status === "ACCEPTED"
                                    ? "success"
                                    : shift.status === "REJECTED"
                                    ? "destructive"
                                    : "default"
                                }
                              >
                                {shift.status}
                              </Badge>
                              {!user?.isAdmin && shift.status === "PENDING" ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleAccept(shift)}
                                    disabled={respondToShift.isPending}
                                  >
                                    <Check className="h-4 w-4 text-green-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShiftToReject(shift)}
                                    disabled={respondToShift.isPending}
                                  >
                                    <X className="h-4 w-4 text-red-600" />
                                  </Button>
                                </>
                              ) : (
                                user?.isAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShiftToDelete(shift)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                )
                              )}
                            </div>
                          </div>
                          {renderShiftTable(shift)}
                        </div>
                      ))}
                      <TablePagination
                        currentPage={currentPage}
                        totalItems={building.shifts.length}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={setPageSize}
                      />
                    </div>
                  )}
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

        <Dialog
          open={!!shiftToReject}
          onOpenChange={(open) => !open && setShiftToReject(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Shift</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleReject)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="rejectionReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Rejection</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Please provide a reason for rejecting this shift"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShiftToReject(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={respondToShift.isPending}>
                    {respondToShift.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </Navbar>
  );
}