import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/hooks/use-user";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/navbar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type TaskStats = {
  shiftTypeId: number;
  shiftTypeName: string;
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
};

export default function Dashboard() {
  const { user } = useUser();

  const { data: taskStats = [], isLoading } = useQuery<TaskStats[]>({
    queryKey: ["/api/admin/tasks/stats"],
  });

  const transformDataForChart = (stats: TaskStats) => {
    return [
      {
        name: "Pending",
        value: stats.pending,
        fill: "#fbbf24", // Yellow for pending
      },
      {
        name: "In Progress",
        value: stats.inProgress,
        fill: "#3b82f6", // Blue for in progress
      },
      {
        name: "Completed",
        value: stats.completed,
        fill: "#22c55e", // Green for completed
      },
    ];
  };

  return (
    <Navbar>
      <div className="p-4 md:p-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-6">
          {user?.isAdmin ? "Dashboard" : "My Tasks"}
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
          <div className="grid gap-6 md:grid-cols-2">
            {taskStats.map((stat) => (
              <Card key={stat.shiftTypeId} className="w-full">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {stat.shiftTypeName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={transformDataForChart(stat)}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="value"
                          fill="#8884d8"
                          name="Tasks"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Navbar>
  );
}