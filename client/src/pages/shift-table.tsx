import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/navbar";

type ShiftTableRow = {
  building: {
    name: string;
    area: string;
  };
  supervisor: {
    name: string;
  };
  coordinator1: {
    name: string;
    shiftTime: string;
  };
  coordinator2: {
    name: string;
    shiftTime: string;
  };
  supervisorShiftTime: string;
};

export default function ShiftTable() {
  const { data: shifts, isLoading } = useQuery<ShiftTableRow[]>({
    queryKey: ["/api/shifts/table"],
  });

  if (isLoading) {
    return (
      <Navbar>
        <div className="flex justify-center items-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Navbar>
    );
  }

  return (
    <Navbar>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Shift Schedule</h1>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-200 p-3 text-left">Building Name</th>
                <th className="border border-gray-200 p-3 text-left">Area</th>
                <th className="border border-gray-200 p-3 text-left">Shift Supervisor</th>
                <th className="border border-gray-200 p-3 text-left">Supervisor Shift Time</th>
                <th className="border border-gray-200 p-3 text-left">Shift Coordinator (1)</th>
                <th className="border border-gray-200 p-3 text-left">Coordinator Time (1)</th>
                <th className="border border-gray-200 p-3 text-left">Shift Coordinator (2)</th>
                <th className="border border-gray-200 p-3 text-left">Coordinator Time (2)</th>
              </tr>
            </thead>
            <tbody>
              {shifts?.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border border-gray-200 p-3">{row.building.name}</td>
                  <td className="border border-gray-200 p-3">{row.building.area}</td>
                  <td className="border border-gray-200 p-3">{row.supervisor.name}</td>
                  <td className="border border-gray-200 p-3">{row.supervisorShiftTime}</td>
                  <td className="border border-gray-200 p-3">{row.coordinator1.name}</td>
                  <td className="border border-gray-200 p-3">{row.coordinator1.shiftTime}</td>
                  <td className="border border-gray-200 p-3">{row.coordinator2.name}</td>
                  <td className="border border-gray-200 p-3">{row.coordinator2.shiftTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Navbar>
  );
}
