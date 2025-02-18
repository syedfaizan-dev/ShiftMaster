import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { TablePagination } from "@/components/table-pagination";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ShiftAssignmentList } from "@/components/shift-assignment-list";
import Navbar from "@/components/navbar";

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

export default function Shifts() {
  const { user } = useUser();

  const { data: shifts, isLoading } = useQuery<ShiftAssignment[]>({
    queryKey: ["/api/shifts"],
    queryFn: async () => {
      const response = await fetch("/api/shifts", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch shifts");
      }
      return response.json();
    },
  });

  if (!user?.isInspector && !user?.isAdmin) {
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
          <h1 className="text-3xl font-bold">
            {user?.isAdmin ? "Shifts by Building" : "My Shift Assignments"}
          </h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : !shifts || shifts.length === 0 ? (
          <Alert>
            <AlertTitle>No Shifts Found</AlertTitle>
            <AlertDescription>
              {user?.isAdmin
                ? "No shifts have been created yet."
                : "You don't have any shift assignments yet."}
            </AlertDescription>
          </Alert>
        ) : user?.isInspector ? (
          <ShiftAssignmentList shifts={shifts} userId={user.id} />
        ) : null}
      </div>
    </Navbar>
  );
}