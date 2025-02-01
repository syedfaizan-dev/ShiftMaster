import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Trash } from "lucide-react";
import Navbar from "@/components/navbar";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { CreateBuildingModal } from "@/components/create-building-modal";

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
  const columns = [
    {
      header: "Name",
      accessorKey: "name",
    },
    {
      header: "Code",
      accessorKey: "code",
    },
    {
      header: "Area",
      accessorKey: "area",
    },
    {
      header: "Supervisor",
      accessorKey: "supervisor",
      cell: (value: any) => value?.fullName || "Not assigned",
    },
    {
      header: "Morning Coordinator",
      accessorKey: "morningCoordinator",
      cell: (value: any) => value?.coordinator?.fullName || "Not assigned",
    },
    {
      header: "Evening Coordinator",
      accessorKey: "eveningCoordinator",
      cell: (value: any) => value?.coordinator?.fullName || "Not assigned",
    },
  ];

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

  // Transform the data to match the column structure
  const transformedData = buildings.map(building => ({
    ...building,
    morningCoordinator: building.coordinators.find(c => c.shiftType === "MORNING"),
    eveningCoordinator: building.coordinators.find(c => c.shiftType === "EVENING"),
  }));

  if (isLoading) {
    return <Navbar>Loading...</Navbar>;
  }

  return (
    <Navbar>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight">Buildings</h1>
          <CreateBuildingModal />
        </div>

        <div className="rounded-md border">
          <ResponsiveTable 
            columns={columns}
            data={transformedData}
          />
        </div>
      </div>
    </Navbar>
  );
}