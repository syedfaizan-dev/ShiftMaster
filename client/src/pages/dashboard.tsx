import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/hooks/use-user";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Building2, UserCircle2, Clock } from "lucide-react";
import Navbar from "@/components/navbar";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
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

type Supervisor = {
  id: number;
  fullName: string;
  username: string;
};

type ShiftType = {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
};

type Inspector = {
  id: number;
  fullName: string;
  username: string;
};

type Shift = {
  inspector: Inspector;
  shiftType: ShiftType;
  week: string;
  status: string;
};

type Building = {
  id: number;
  name: string;
  code: string;
  area: string;
  supervisor: Supervisor;
  shifts: Shift[];
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

  const { data: taskStats = [], isLoading: isTaskStatsLoading } = useQuery<TaskStats[]>({
    queryKey: ["/api/admin/tasks/stats"],
    enabled: !!user?.isAdmin,
  });

  const { data: buildings = [], isLoading: isBuildingsLoading } = useQuery<Building[]>({
    queryKey: ["/api/buildings/stats"],
    enabled: !!user?.isAdmin,
  });

  if (!user?.isAdmin) {
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

  const isLoading = isTaskStatsLoading || isBuildingsLoading;

  return (
    <Navbar>
      <div className="p-4 md:p-6 space-y-8">
        {/* Task Statistics Section */}
        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Task Statistics</h2>
          {isTaskStatsLoading ? (
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

        {/* Buildings Overview Section */}
        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Buildings Overview</h2>
          {isBuildingsLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : buildings.length === 0 ? (
            <Alert>
              <AlertTitle>No Buildings Found</AlertTitle>
              <AlertDescription>
                There are no buildings configured in the system.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {buildings.map((building) => (
                <Card key={building.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      <CardTitle className="text-lg">
                        {building.name} ({building.code})
                      </CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Area: {building.area || "Not specified"}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <UserCircle2 className="h-4 w-4" />
                      <p className="text-sm">
                        Supervisor: {building.supervisor?.fullName || "Unassigned"}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <h3 className="font-semibold mb-2">Assigned Inspectors</h3>
                    {building.shifts.length > 0 ? (
                      <div className="space-y-3">
                        {building.shifts.map((shift, index) => (
                          <div
                            key={`${building.id}-${index}`}
                            className="flex flex-col space-y-1 p-2 rounded-lg bg-secondary"
                          >
                            <div className="flex items-center gap-2">
                              <UserCircle2 className="h-4 w-4" />
                              <p className="text-sm font-medium">
                                {shift.inspector.fullName}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <p className="text-sm text-muted-foreground">
                                {shift.shiftType.name} ({shift.shiftType.startTime} -{" "}
                                {shift.shiftType.endTime})
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Week: {shift.week}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No active inspectors assigned
                      </p>
                    )}
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