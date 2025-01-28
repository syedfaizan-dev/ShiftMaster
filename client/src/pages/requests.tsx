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
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/navbar";
import RequestForm from "@/components/request-form";

const getStatusColor = (status: string) => {
  switch (status) {
    case 'approved':
      return 'success';
    case 'rejected':
      return 'destructive';
    case 'escalated':
      return 'warning';
    default:
      return 'secondary';
  }
};

export default function RequestsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: requests = [], isLoading: isLoadingRequests } = useQuery<any[]>({
    queryKey: [user?.isSupervisor || user?.isManager ? "/api/requests/review" : "/api/requests"],
  });

  const handleRequest = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number; status: string; notes?: string }) => {
      const res = await fetch(`/api/requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Request updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/requests/review"] });
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

  return (
    <Navbar>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">
            {user?.isSupervisor || user?.isManager ? "Review Requests" : "My Requests"}
          </h1>
          {!user?.isSupervisor && !user?.isManager && (
            <Button onClick={() => setIsDialogOpen(true)}>
              New Request
            </Button>
          )}
        </div>

        {isLoadingRequests ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <p className="text-center text-gray-500">No requests found</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Created At</TableHead>
                {(user?.isSupervisor || user?.isManager) && (
                  <TableHead>Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="capitalize">{request.type.replace('_', ' ')}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(request.status)}>
                      {request.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{request.reason}</TableCell>
                  <TableCell>
                    {request.startDate && (
                      <>
                        {format(new Date(request.startDate), "MMM d, yyyy")}
                        {request.endDate && (
                          <> - {format(new Date(request.endDate), "MMM d, yyyy")}</>
                        )}
                      </>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(request.createdAt), "MMM d, yyyy h:mm a")}
                  </TableCell>
                  {(user?.isSupervisor || user?.isManager) && request.status === 'pending' && (
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleRequest.mutate({ id: request.id, status: 'approved' })}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRequest.mutate({ id: request.id, status: 'rejected' })}
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
            <DialogTitle>New Request</DialogTitle>
            <RequestForm onSuccess={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </Navbar>
  );
}
