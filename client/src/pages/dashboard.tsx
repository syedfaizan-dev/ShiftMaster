import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/hooks/use-user";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/navbar";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

type TaskStats = {
  shiftTypeId: number;
  shiftTypeName: string;
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
};

type BuildingWithShifts = {
  id: number;
  name: string;
  area: string;
  supervisor: {
    id: number;
    fullName: string;
    username: string;
  };
  shiftInspectors: Array<{
    inspector: {
      id: number;
      fullName: string;
      username: string;
    };
    shift: {
      id: number;
      week: string;
      shiftType: {
        id: number;
        name: string;
        startTime: string;
        endTime: string;
      };
    };
  }>;
};

type BuildingsResponse = {
  buildings: BuildingWithShifts[];
};

// Colors for the pie chart sections
const COLORS = ["#fbbf24", "#3b82f6", "#22c55e"];
const RADIAN = Math.PI / 180;

const CustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent === 0) return null;

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function Dashboard() {
  const { user } = useUser();

  const { data: taskStats = [], isLoading: isLoadingStats } = useQuery<TaskStats[]>({
    queryKey: ["/api/admin/tasks/stats"],
  });

  const { data: buildingsData, isLoading: isLoadingBuildings } = useQuery<BuildingsResponse>({
    queryKey: ["/api/buildings/shifts"],
    enabled: !!user,
  });

  return (
    <Navbar>
      <div className="p-4 md:p-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-6">
          {user?.isAdmin ? "Dashboard" : "My Dashboard"}
        </h1>

        {/* Task Statistics Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Task Statistics</h2>
          {isLoadingStats ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : taskStats.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No Tasks Found</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  There are no tasks available to display.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {taskStats.map((stat) => {
                const data = [
                  { name: "Pending", value: Number(stat.pending) },
                  { name: "In Progress", value: Number(stat.inProgress) },
                  { name: "Completed", value: Number(stat.completed) },
                ].filter((item) => item.value > 0);

                return (
                  <Card key={stat.shiftTypeId} className="w-full">
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {stat.shiftTypeName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={data}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={CustomLabel}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {data.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={COLORS[index % COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend
                              verticalAlign="bottom"
                              height={36}
                              formatter={(value, entry, index) => {
                                const item = data[index];
                                return `${value} (${item.value})`;
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Buildings with Shifts Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Building Assignments</h2>
          {isLoadingBuildings ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : !buildingsData?.buildings.length ? (
            <Card>
              <CardHeader>
                <CardTitle>No Buildings Found</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  There are no buildings with assigned shifts to display.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {buildingsData.buildings.map((building) => (
                <Card key={building.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{building.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">Area: {building.area}</p>
                    <p className="text-sm text-muted-foreground">
                      Supervisor: {building.supervisor.fullName}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {building.shiftInspectors.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No approved shifts assigned</p>
                      ) : (
                        building.shiftInspectors.map((si, index) => (
                          <div key={`${si.inspector.id}-${si.shift.id}`} className="border-b last:border-0 pb-2 last:pb-0">
                            <p className="font-medium">{si.inspector.fullName}</p>
                            <p className="text-sm text-muted-foreground">
                              {si.shift.shiftType.name} ({si.shift.shiftType.startTime} - {si.shift.shiftType.endTime})
                            </p>
                            <p className="text-sm text-muted-foreground">Week: {si.shift.week}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </Navbar>
  );
}