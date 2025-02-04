import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/hooks/use-user";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/navbar";
import { BuildingsOverview } from "@/components/buildings-overview";
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

  const { data: taskStats = [], isLoading } = useQuery<TaskStats[]>({
    queryKey: ["/api/admin/tasks/stats"],
  });

  return (
    <Navbar>
      <div className="p-4 md:p-6 space-y-6">
        <div className="space-y-6">
          <h1 className="text-2xl md:text-3xl font-bold">
            {user?.isAdmin ? "Task Statistics" : "My Tasks"}
          </h1>

          {isLoading ? (
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
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Buildings Overview</h2>
          <BuildingsOverview />
        </div>
      </div>
    </Navbar>
  );
}