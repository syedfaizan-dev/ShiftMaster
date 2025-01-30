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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Loader2, Settings } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Navbar from "@/components/navbar";
import * as z from "zod";
import type { RequestWithRelations, Shift, ShiftType, User } from "@db/schema";
import { TablePagination } from "@/components/table-pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableContainer } from "@/components/ui/table-container";

const requestSchema = z.object({
  type: z.enum(["SHIFT_SWAP", "LEAVE"]),
  shiftTypeId: z.number().optional(),
  targetShiftTypeId: z.number().optional(),
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
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(
    null,
  );

  // Add pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
  console.log("All Requests: ", requests);
  const { data: managers = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/managers"],
    enabled: user?.isAdmin,
  });

  const { data: shifts = [] } = useQuery<(Shift & {
    shiftType: { startTime: string; endTime: string; name: string };
  })[]>({
    queryKey: [user?.isAdmin ? "/api/admin/shifts" : "/api/shifts"],
  });

  // Add new query for all shift types
  const { data: allShiftTypes = [] } = useQuery<ShiftType[]>({
    queryKey: ["/api/shift-types"],
  });

  // Get unique shift types from user's shifts for the first dropdown
  const userShiftTypes = shifts
    .filter((shift) => shift.inspectorId === user?.id)
    .map((shift) => ({
      id: shift.shiftTypeId,
      name: shift.shiftType.name,
      startTime: shift.shiftType.startTime,
      endTime: shift.shiftType.endTime,
    }))
    .filter(
      (value, index, self) =>
        self.findIndex((v) => v.id === value.id) === index,
    );

  // Remove duplicates from allShiftTypes array
  const uniqueShiftTypes = allShiftTypes.filter(
    (value, index, self) => index === self.findIndex((t) => t.id === value.id),
  );

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
      toast({
        title: "Success",
        description: "Request submitted successfully",
      });
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

      const res = await fetch(
        `/api/admin/requests/${selectedRequestId}/assign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ managerId: parseInt(data.managerId) }),
          credentials: "include",
        },
      );
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
    mutationFn: async ({
      id,
      status,
    }: {
      id: number;
      status: "APPROVED" | "REJECTED";
    }) => {
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
      toast({
        title: "Success",
        description: "Request status updated successfully",
      });
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

  const formatShiftDateTime = (
    shift: Shift & { shiftType?: { startTime: string; endTime: string } },
  ) => {
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

      const weekStart = new Date(2025, 0, 1);
      weekStart.setDate(weekStart.getDate() + (weekNum - 1) * 7);

      const timeObj = new Date(`2000-01-01T${shift.shiftType.startTime}`);

      const shiftDateTime = new Date(
        weekStart.getFullYear(),
        weekStart.getMonth(),
        weekStart.getDate(),
        timeObj.getHours(),
        timeObj.getMinutes(),
      );

      return {
        date: shiftDateTime,
        formatted: format(shiftDateTime, "MMM d, yyyy h:mm a"),
      };
    } catch (error) {
      console.error("Error formatting shift date:", error);
      return null;
    }
  };

  // Calculate pagination values
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentRequests = requests.slice(startIndex, endIndex);

  // Handle pagination changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };
  console.log(requests);
  return (
    <Navbar>
      <div className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Requests</h1>
          {!user?.isAdmin && !user?.isManager && (
            <Button onClick={() => setIsDialogOpen(true)}>New Request</Button>
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
              {user?.isAdmin
                ? "There are no pending requests to review."
                : "You haven't submitted any requests yet."}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <TableContainer>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px] min-w-[100px]">Type</TableHead>
                    <TableHead className="w-[100px] min-w-[100px]">Status</TableHead>
                    <TableHead className="min-w-[150px]">Reason</TableHead>
                    {(user?.isAdmin || user?.isManager) && (
                      <TableHead className="min-w-[120px]">Requester</TableHead>
                    )}
                    <TableHead className="min-w-[200px]">Details</TableHead>
                    <TableHead className="min-w-[120px]">Assigned To</TableHead>
                    <TableHead className="min-w-[150px]">Review Info</TableHead>
                    {(user?.isAdmin || user?.isManager) && (
                      <TableHead className="w-[70px]">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="capitalize whitespace-nowrap">
                        {request.type.toLowerCase().replace("_", " ")}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                            request.status,
                          )}`}
                        >
                          {request.status}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {request.reason}
                      </TableCell>
                      {(user?.isAdmin || user?.isManager) && (
                        <TableCell className="whitespace-nowrap">
                          {request.requester?.fullName || "Unknown"}
                        </TableCell>
                      )}
                      <TableCell>
                        {request.type === "LEAVE" ? (
                          <div className="space-y-1">
                            <p className="font-medium text-sm">Leave Period:</p>
                            <p className="text-sm">
                              {format(new Date(request.startDate!), "MMM d, yyyy")} -{" "}
                              {format(new Date(request.endDate!), "MMM d, yyyy")}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <p className="font-medium text-sm">Current Shift:</p>
                              {request.shiftType && (
                                <div className="text-sm">
                                  <p>{request.shiftType.name}</p>
                                  <p className="text-gray-500">
                                    {format(
                                      new Date(`2000-01-01T${request.shiftType.startTime}`),
                                      "h:mm a",
                                    )}{" "}
                                    -
                                    {format(
                                      new Date(`2000-01-01T${request.shiftType.endTime}`),
                                      "h:mm a",
                                    )}
                                  </p>
                                </div>
                              )}
                            </div>
                            <div className="space-y-1">
                              <p className="font-medium text-sm">Target Shift:</p>
                              {request.targetShiftType && (
                                <div className="text-sm">
                                  <p>{request.targetShiftType.name}</p>
                                  <p className="text-gray-500">
                                    {format(
                                      new Date(`2000-01-01T${request.targetShiftType.startTime}`),
                                      "h:mm a",
                                    )}{" "}
                                    -
                                    {format(
                                      new Date(`2000-01-01T${request.targetShiftType.endTime}`),
                                      "h:mm a",
                                    )}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
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
                          <div className="text-sm space-y-1">
                            <p className="whitespace-nowrap">By: {request.reviewer.fullName}</p>
                            <p className="text-gray-500 whitespace-nowrap">
                              {format(new Date(request.reviewedAt!), "MMM d, yyyy h:mm a")}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {(user?.isAdmin ||
                          (user?.isManager && request.managerId === user.id)) &&
                          request.status === "PENDING" && (
                            <DropdownMenu modal={false}>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className="relative h-8 w-8 p-0"
                                >
                                  <span className="sr-only">Open menu</span>
                                  <Settings className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                style={{ position: 'fixed' }}
                                className="w-[200px] z-50"
                              >
                                {user.isAdmin && !request.managerId && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedRequestId(request.id);
                                      setAssignManagerDialogOpen(true);
                                    }}
                                  >
                                    Reassign Manager
                                  </DropdownMenuItem>
                                )}
                                {(user.isAdmin ||
                                  (user.isManager && request.managerId === user.id)) && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        updateRequestStatus.mutate({
                                          id: request.id,
                                          status: "APPROVED",
                                        })
                                      }
                                    >
                                      Approve Request
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() =>
                                        updateRequestStatus.mutate({
                                          id: request.id,
                                          status: "REJECTED",
                                        })
                                      }
                                    >
                                      Reject Request
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              currentPage={currentPage}
              totalItems={requests.length}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        )}

        {/* New Request Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogTitle>Create New Request</DialogTitle>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) =>
                  createRequest.mutate(data),
                )}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Request Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
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
                      name="shiftTypeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Shift Type</FormLabel>
                          <Select
                            onValueChange={(val) =>
                              field.onChange(parseInt(val))
                            }
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your shift type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {userShiftTypes.map((shiftType) => (
                                <SelectItem
                                  key={shiftType.id}
                                  value={shiftType.id.toString()}
                                >
                                  {shiftType.name} (
                                  {format(
                                    new Date(
                                      `2000-01-01T${shiftType.startTime}`,
                                    ),
                                    "h:mm a",
                                  )}{" "}
                                  -{" "}
                                  {format(
                                    new Date(`2000-01-01T${shiftType.endTime}`),
                                    "h:mm a",
                                  )}
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
                      name="targetShiftTypeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Shift Type</FormLabel>
                          <Select
                            onValueChange={(val) =>
                              field.onChange(parseInt(val))
                            }
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select target shift type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {uniqueShiftTypes.map((shiftType) => (
                                <SelectItem
                                  key={shiftType.id}
                                  value={shiftType.id.toString()}
                                >
                                  {shiftType.name} (
                                  {format(
                                    new Date(
                                      `2000-01-01T${shiftType.startTime}`,
                                    ),
                                    "h:mm a",
                                  )}{" "}
                                  -{" "}
                                  {format(
                                    new Date(`2000-01-01T${shiftType.endTime}`),
                                    "h:mm a",
                                  )}
                                  )
                                </SelectItem>
                              ))}
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
        <Dialog
          open={assignManagerDialogOpen}
          onOpenChange={setAssignManagerDialogOpen}
        >
          <DialogContent>
            <DialogTitle>Assign Manager</DialogTitle>
            <Form {...assignManagerForm}>
              <form
                onSubmit={assignManagerForm.handleSubmit((data) =>
                  assignManager.mutate(data),
                )}
                className="space-y-4"
              >
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
                            <SelectItem
                              key={manager.id}
                              value={manager.id.toString()}
                            >
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