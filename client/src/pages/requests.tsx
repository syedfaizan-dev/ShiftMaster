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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parse, startOfWeek, isValid } from "date-fns";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Navbar from "@/components/navbar";
import * as z from "zod";
import type { RequestWithRelations, Shift, User } from "@db/schema";

const requestSchema = z.object({
  type: z.enum(["SHIFT_SWAP", "LEAVE"]),
  shiftId: z.number().optional(),
  targetShiftId: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  reason: z.string().min(1, "Reason is required"),
});

const assignManagerSchema = z.object({
  managerId: z.string().min(1, "Please select a manager"),
});

type RequestFormData = z.infer<typeof requestSchema>;
type AssignManagerFormData = z.infer<typeof assignManagerSchema>;

function RequestsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [assignManagerDialogOpen, setAssignManagerDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);

  const form = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      type: "SHIFT_SWAP",
      reason: "",
    },
  });

  const assignManagerForm = useForm<AssignManagerFormData>({
    resolver: zodResolver(assignManagerSchema),
  });

  const { data: requests = [], isLoading } = useQuery<RequestWithRelations[]>({
    queryKey: ["/api/requests"],
  });

  const { data: managers = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/managers"],
    enabled: user?.isAdmin,
  });

  const { data: shifts = [] } = useQuery<(Shift & { shiftType: { startTime: string; endTime: string } })[]>({
    queryKey: [user?.isAdmin ? "/api/admin/shifts" : "/api/shifts"],
  });

  const createRequest = useMutation({
    mutationFn: async (data: RequestFormData) => {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Request submitted successfully" });
      setIsDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const assignManager = useMutation({
    mutationFn: async (data: AssignManagerFormData) => {
      if (!selectedRequestId) throw new Error("No request selected");

      const res = await fetch(`/api/admin/requests/${selectedRequestId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ managerId: parseInt(data.managerId) }),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Request assigned successfully" });
      setAssignManagerDialogOpen(false);
      assignManagerForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const updateRequestStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "APPROVED" | "REJECTED" }) => {
      const res = await fetch(`/api/admin/requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Request status updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const formatShiftDateTime = (shift: Shift & { shiftType?: { startTime: string; endTime: string } }) => {
    if (!shift?.shiftType?.startTime || !shift.week) {
      console.debug("Missing required shift data", { shift });
      return null;
    }

    try {
      const weekNum = parseInt(shift.week.toString());
      if (isNaN(weekNum) || weekNum < 1 || weekNum > 52) {
        console.debug("Invalid week number", { week: shift.week });
        return null;
      }

      const weekStart = startOfWeek(new Date(2025, 0, 1));
      const shiftDate = new Date(weekStart.getTime() + (weekNum - 1) * 7 * 24 * 60 * 60 * 1000);

      const timeObj = parse(shift.shiftType.startTime, "HH:mm:ss", new Date());
      if (!isValid(timeObj)) {
        console.debug("Invalid time format", { startTime: shift.shiftType.startTime });
        return null;
      }

      const shiftDateTime = new Date(
        shiftDate.getFullYear(),
        shiftDate.getMonth(),
        shiftDate.getDate(),
        timeObj.getHours(),
        timeObj.getMinutes()
      );

      if (!isValid(shiftDateTime)) {
        console.debug("Invalid final datetime");
        return null;
      }

      return {
        date: shiftDateTime,
        formatted: format(shiftDateTime, "MMM d, yyyy h:mm a")
      };
    } catch (error) {
      console.error("Error formatting shift date:", error);
      return null;
    }
  };

  return (
    <Navbar>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Requests</h1>
          {!user?.isAdmin && !user?.isManager && (
            <Button onClick={() => setIsDialogOpen(true)}>
              New Request
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <Alert>
            <AlertTitle>No Requests Found</AlertTitle>
            <AlertDescription>
              {user?.isAdmin ? "There are no pending requests to review." : "You haven't submitted any requests yet."}
            </AlertDescription>
          </Alert>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
                {(user?.isAdmin || user?.isManager) && <TableHead>Requester</TableHead>}
                <TableHead>Dates</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Review Info</TableHead>
                {(user?.isAdmin || user?.isManager) && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="capitalize">
                    {request.type.toLowerCase().replace("_", " ")}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(request.status)}`}>
                      {request.status}
                    </span>
                  </TableCell>
                  <TableCell>{request.reason}</TableCell>
                  {(user?.isAdmin || user?.isManager) && <TableCell>{request.requester?.fullName || "Unknown"}</TableCell>}
                  <TableCell>
                    {request.type === "LEAVE" ? (
                      <>
                        {format(new Date(request.startDate!), "MMM d, yyyy")} - {format(new Date(request.endDate!), "MMM d, yyyy")}
                      </>
                    ) : (
                      formatShiftDateTime(shifts.find((s) => s.id === request.shiftId)!)?.formatted || "Invalid Shift"
                    )}
                  </TableCell>
                  <TableCell>
                    {request.manager ? (
                      <span className="text-sm font-medium">
                        {request.manager.fullName}
                      </span>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {request.reviewer ? (
                      <div className="text-sm">
                        <p>By: {request.reviewer.fullName}</p>
                        <p className="text-gray-500">
                          {format(new Date(request.reviewedAt!), "MMM d, yyyy h:mm a")}
                        </p>
                      </div>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </TableCell>
                  {(user?.isAdmin || (user?.isManager && request.managerId === user.id)) && request.status === "PENDING" && (
                    <TableCell>
                      <div className="flex gap-2">
                        {user.isAdmin && !request.managerId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRequestId(request.id);
                              setAssignManagerDialogOpen(true);
                            }}
                          >
                            Assign Manager
                          </Button>
                        )}
                        {(user.isAdmin || (user.isManager && request.managerId === user.id)) && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => updateRequestStatus.mutate({ id: request.id, status: "APPROVED" })}
                              disabled={updateRequestStatus.isPending}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateRequestStatus.mutate({ id: request.id, status: "REJECTED" })}
                              disabled={updateRequestStatus.isPending}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* New Request Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogTitle>Create New Request</DialogTitle>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(createRequest.mutate)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Request Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SHIFT_SWAP">Shift Swap</SelectItem>
                          <SelectItem value="LEAVE">Leave</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("type") === "SHIFT_SWAP" && (
                  <>
                    <FormField
                      control={form.control}
                      name="shiftId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Your Shift</FormLabel>
                          <Select onValueChange={(val) => field.onChange(parseInt(val))}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your shift to swap" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {shifts
                                .filter((shift) => {
                                  const dateInfo = formatShiftDateTime(shift);
                                  return shift.inspectorId === user?.id && dateInfo !== null;
                                })
                                .sort((a, b) => {
                                  const dateA = formatShiftDateTime(a)?.date;
                                  const dateB = formatShiftDateTime(b)?.date;
                                  if (!dateA || !dateB) return 0;
                                  return dateA.getTime() - dateB.getTime();
                                })
                                .map((shift) => {
                                  const dateInfo = formatShiftDateTime(shift);
                                  if (!dateInfo) return null;
                                  return (
                                    <SelectItem key={shift.id} value={shift.id.toString()}>
                                      {dateInfo.formatted}
                                    </SelectItem>
                                  );
                                })}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="targetShiftId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Shift</FormLabel>
                          <Select onValueChange={(val) => field.onChange(parseInt(val))}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select target shift" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {shifts
                                .filter((shift) => {
                                  const dateInfo = formatShiftDateTime(shift);
                                  return shift.inspectorId !== user?.id && dateInfo !== null;
                                })
                                .sort((a, b) => {
                                  const dateA = formatShiftDateTime(a)?.date;
                                  const dateB = formatShiftDateTime(b)?.date;
                                  if (!dateA || !dateB) return 0;
                                  return dateA.getTime() - dateB.getTime();
                                })
                                .map((shift) => {
                                  const dateInfo = formatShiftDateTime(shift);
                                  if (!dateInfo) return null;
                                  return (
                                    <SelectItem key={shift.id} value={shift.id.toString()}>
                                      {dateInfo.formatted}
                                    </SelectItem>
                                  );
                                })}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {form.watch("type") === "LEAVE" && (
                  <>
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={createRequest.isPending}>
                  Submit Request
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Assign Manager Dialog */}
        <Dialog open={assignManagerDialogOpen} onOpenChange={setAssignManagerDialogOpen}>
          <DialogContent>
            <DialogTitle>Assign Manager</DialogTitle>
            <Form {...assignManagerForm}>
              <form onSubmit={assignManagerForm.handleSubmit(assignManager.mutate)} className="space-y-4">
                <FormField
                  control={assignManagerForm.control}
                  name="managerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Manager</FormLabel>
                      <Select onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a manager" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {managers.map((manager) => (
                            <SelectItem key={manager.id} value={manager.id.toString()}>
                              {manager.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={assignManager.isPending}>
                  Assign Manager
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </Navbar>
  );
}

export default RequestsPage;