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
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Navbar from "@/components/navbar";
import * as z from "zod";
import type { Request, Shift } from "@db/schema";

const requestSchema = z.object({
  type: z.enum(["SHIFT_SWAP", "LEAVE"]),
  shiftId: z.number().optional(),
  targetShiftId: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  reason: z.string().min(1, "Reason is required"),
});

type RequestFormData = z.infer<typeof requestSchema>;

function RequestsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      type: "SHIFT_SWAP",
      reason: "",
    },
  });

  const { data: requests = [], isLoading } = useQuery<Request[]>({
    queryKey: [user?.isAdmin ? "/api/admin/requests" : "/api/requests"],
  });

  const { data: shifts = [] } = useQuery<Shift[]>({
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

  const updateRequestStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'APPROVED' | 'REJECTED' }) => {
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/requests"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const onSubmit = (data: RequestFormData) => {
    createRequest.mutate(data);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <Navbar>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Requests</h1>
          <Button onClick={() => setIsDialogOpen(true)}>
            New Request
          </Button>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
                {user?.isAdmin && <TableHead>Requester</TableHead>}
                <TableHead>Dates</TableHead>
                {user?.isAdmin && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="capitalize">
                    {request.type.toLowerCase().replace('_', ' ')}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(request.status)}`}>
                      {request.status}
                    </span>
                  </TableCell>
                  <TableCell>{request.reason}</TableCell>
                  {user?.isAdmin && (
                    <TableCell>{request.requester?.fullName || 'Unknown'}</TableCell>
                  )}
                  <TableCell>
                    {request.type === 'LEAVE' ? (
                      <>
                        {format(new Date(request.startDate!), "MMM d, yyyy")} - 
                        {format(new Date(request.endDate!), "MMM d, yyyy")}
                      </>
                    ) : (
                      format(new Date(shifts.find(s => s.id === request.shiftId)?.startTime || ''), "MMM d, yyyy")
                    )}
                  </TableCell>
                  {user?.isAdmin && request.status === 'PENDING' && (
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => updateRequestStatus.mutate({ id: request.id, status: 'APPROVED' })}
                          disabled={updateRequestStatus.isPending}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateRequestStatus.mutate({ id: request.id, status: 'REJECTED' })}
                          disabled={updateRequestStatus.isPending}
                        >
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogTitle>Create New Request</DialogTitle>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                          <FormLabel>Select Shift</FormLabel>
                          <Select onValueChange={val => field.onChange(parseInt(val))}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select shift" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {shifts.map(shift => (
                                <SelectItem key={shift.id} value={shift.id.toString()}>
                                  {format(new Date(shift.startTime), "MMM d, yyyy h:mm a")}
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
                      name="targetShiftId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Shift</FormLabel>
                          <Select onValueChange={val => field.onChange(parseInt(val))}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select target shift" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {shifts.map(shift => (
                                <SelectItem key={shift.id} value={shift.id.toString()}>
                                  {format(new Date(shift.startTime), "MMM d, yyyy h:mm a")}
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
      </div>
    </Navbar>
  );
}

export default RequestsPage;