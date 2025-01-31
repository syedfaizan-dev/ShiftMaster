import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";

interface Building {
  id: number;
  name: string;
  code: string;
  area: string;
  supervisor?: {
    id: number;
    fullName: string;
  };
  coordinators: Array<{
    id: number;
    coordinator: {
      id: number;
      fullName: string;
    };
    shiftType: string;
  }>;
}

export default function BuildingsPage() {
  const { data: buildings = [], isLoading } = useQuery<Building[]>({
    queryKey: ["buildings"],
    queryFn: async () => {
      const response = await fetch("/api/admin/buildings");
      if (!response.ok) {
        throw new Error("Failed to fetch buildings");
      }
      return response.json();
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Buildings</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Building
        </Button>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Area</TableHead>
              <TableHead>Supervisor</TableHead>
              <TableHead>Morning Coordinator</TableHead>
              <TableHead>Evening Coordinator</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {buildings.map((building) => {
              const morningCoordinator = building.coordinators.find(
                (c) => c.shiftType === "MORNING"
              );
              const eveningCoordinator = building.coordinators.find(
                (c) => c.shiftType === "EVENING"
              );

              return (
                <TableRow key={building.id}>
                  <TableCell>{building.name}</TableCell>
                  <TableCell>{building.code}</TableCell>
                  <TableCell>{building.area}</TableCell>
                  <TableCell>
                    {building.supervisor?.fullName || "Not assigned"}
                  </TableCell>
                  <TableCell>
                    {morningCoordinator?.coordinator.fullName || "Not assigned"}
                  </TableCell>
                  <TableCell>
                    {eveningCoordinator?.coordinator.fullName || "Not assigned"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
