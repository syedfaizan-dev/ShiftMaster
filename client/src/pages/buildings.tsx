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
import Navbar from "@/components/navbar";
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
    return <Navbar>Loading...</Navbar>;
  }

  return (
    <Navbar>
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
            <TableHeader className="hidden md:table-header-group">
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
                  <TableRow 
                    key={building.id}
                    className="block md:table-row border-b md:border-b-0 p-4 md:p-0"
                  >
                    <TableCell className="block md:table-cell py-2 md:py-4 before:content-['Name_:'] md:before:content-none before:font-bold before:mr-2">
                      {building.name}
                    </TableCell>
                    <TableCell className="block md:table-cell py-2 md:py-4 before:content-['Code_:'] md:before:content-none before:font-bold before:mr-2">
                      {building.code}
                    </TableCell>
                    <TableCell className="block md:table-cell py-2 md:py-4 before:content-['Area_:'] md:before:content-none before:font-bold before:mr-2">
                      {building.area}
                    </TableCell>
                    <TableCell className="block md:table-cell py-2 md:py-4 before:content-['Supervisor_:'] md:before:content-none before:font-bold before:mr-2">
                      {building.supervisor?.fullName || "Not assigned"}
                    </TableCell>
                    <TableCell className="block md:table-cell py-2 md:py-4 before:content-['Morning_Coordinator_:'] md:before:content-none before:font-bold before:mr-2">
                      {morningCoordinator?.coordinator.fullName || "Not assigned"}
                    </TableCell>
                    <TableCell className="block md:table-cell py-2 md:py-4 before:content-['Evening_Coordinator_:'] md:before:content-none before:font-bold before:mr-2">
                      {eveningCoordinator?.coordinator.fullName || "Not assigned"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </Navbar>
  );
}