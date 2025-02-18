import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const rejectShiftSchema = z.object({
  rejectionReason: z.string().min(1, "Rejection reason is required"),
});

type RejectShiftFormData = z.infer<typeof rejectShiftSchema>;

type ShiftType = {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
};

type ShiftInspector = {
  inspector: {
    id: number;
    fullName: string;
    username: string;
  };
  isPrimary: boolean;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
};

type ShiftDay = {
  id: number;
  dayOfWeek: number;
  shiftType?: ShiftType;
};

type ShiftAssignment = {
  id: number;
  week: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  rejectionReason: string | null;
  role: { id: number; name: string };
  building: { id: number; name: string; code: string; area: string };
  shiftInspectors: ShiftInspector[];
  days: ShiftDay[];
};

type Props = {
  shifts: ShiftAssignment[];
  userId: number;
};

export function ShiftAssignmentList({ shifts, userId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rejectingShift, setRejectingShift] = useState<{
    shiftId: number;
    inspectorId: number;
  } | null>(null);

  const rejectShiftForm = useForm<RejectShiftFormData>({
    resolver: zodResolver(rejectShiftSchema),
    defaultValues: {
      rejectionReason: "",
    },
  });

  const handleShiftResponse = useMutation({
    mutationFn: async ({
      shiftId,
      inspectorId,
      action,
      rejectionReason,
    }: {
      shiftId: number;
      inspectorId: number;
      action: "ACCEPT" | "REJECT";
      rejectionReason?: string;
    }) => {
      const res = await fetch(`/api/shifts/${shiftId}/inspectors/${inspectorId}/response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectionReason }),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Shift response updated successfully",
      });
      setRejectingShift(null);
      queryClient.invalidateQueries({ queryKey: ["/api/buildings/with-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const handleRejectShiftSubmit = (data: RejectShiftFormData) => {
    if (!rejectingShift) return;
    handleShiftResponse.mutate({
      shiftId: rejectingShift.shiftId,
      inspectorId: rejectingShift.inspectorId,
      action: "REJECT",
      rejectionReason: data.rejectionReason,
    });
  };

  return (
    <div className="space-y-6">
      {shifts.map((shift) => (
        <Card key={shift.id}>
          <CardHeader>
            <CardTitle className="text-lg">
              {shift.building.name} - Week {shift.week}
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              Role: {shift.role.name}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
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
                {shift.rejectionReason && (
                  <span className="text-sm text-muted-foreground">
                    Reason: {shift.rejectionReason}
                  </span>
                )}
              </div>

              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {DAYS.map((day) => (
                        <th key={day} className="p-2 text-center font-medium">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {DAYS.map((_, dayIndex) => {
                        const dayShift = shift.days?.find(
                          (d) => d.dayOfWeek === dayIndex
                        );
                        return (
                          <td key={dayIndex} className="p-2 text-center">
                            {dayShift?.shiftType?.name || "-"}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>

              {(shift.shiftInspectors || [])
                .filter((si) => si.inspector.id === userId)
                .map((si) => (
                  <div key={`${shift.id}-${si.inspector.id}`} className="flex justify-end gap-2">
                    {si.status === "PENDING" && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() =>
                            handleShiftResponse.mutate({
                              shiftId: shift.id,
                              inspectorId: si.inspector.id,
                              action: "ACCEPT",
                            })
                          }
                          disabled={handleShiftResponse.isPending}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() =>
                            setRejectingShift({
                              shiftId: shift.id,
                              inspectorId: si.inspector.id,
                            })
                          }
                          disabled={handleShiftResponse.isPending}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog
        open={!!rejectingShift}
        onOpenChange={(open) => {
          if (!open) {
            setRejectingShift(null);
            rejectShiftForm.reset();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Shift Assignment</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this shift assignment.
            </DialogDescription>
          </DialogHeader>
          <Form {...rejectShiftForm}>
            <form
              onSubmit={rejectShiftForm.handleSubmit(handleRejectShiftSubmit)}
              className="space-y-4"
            >
              <FormField
                control={rejectShiftForm.control}
                name="rejectionReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter your reason for rejecting this shift"
                        {...field}
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
                  onClick={() => setRejectingShift(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={handleShiftResponse.isPending}
                >
                  {handleShiftResponse.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    "Reject"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}