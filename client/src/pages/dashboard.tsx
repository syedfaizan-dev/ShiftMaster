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

// Enhanced colors with a more professional palette
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
      className="text-sm font-medium"
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
      <div className="p-4 md:p-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-6">
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
              // Convert string numbers to actual numbers
              const data = [
                { name: "Pending", value: Number(stat.pending) },
                { name: "In Progress", value: Number(stat.inProgress) },
                { name: "Completed", value: Number(stat.completed) },
              ].filter((item) => item.value > 0); // Remove categories with zero value

              return (
                <Card
                  key={stat.shiftTypeId}
                  className="w-full transition-all duration-300 hover:shadow-lg border-t-4 border-primary bg-gradient-to-b from-card to-background"
                >
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
                            dataKey="value"
                          >
                            {data.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{
                              background: "rgba(255, 255, 255, 0.9)",
                              border: "1px solid #ccc",
                              borderRadius: "4px",
                              padding: "8px"
                            }}
                          />
                          <Legend
                            verticalAlign="bottom"
                            height={36}
                            formatter={(value, entry, index) => {
                              const item = data[index];
                              return (
                                <span className="text-sm">
                                  {value} ({item.value})
                                </span>
                              );
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
    </Navbar>
  );
}