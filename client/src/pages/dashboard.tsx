import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/hooks/use-user";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/navbar";
import {
  PieChart,
  Pie,
  Cell,
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

  const COLORS = {
    pending: "#fbbf24",    // Yellow for pending
    inProgress: "#3b82f6", // Blue for in progress
    completed: "#22c55e",  // Green for completed
  };

  const transformDataForChart = (stats: TaskStats) => {
    return [
      {
        name: "Pending",
        value: stats.pending,
        color: COLORS.pending,
      },
      {
        name: "In Progress",
        value: stats.inProgress,
        color: COLORS.inProgress,
      },
      {
        name: "Completed",
        value: stats.completed,
        color: COLORS.completed,
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
                      <PieChart>
                        <Pie
                          data={transformDataForChart(stat)}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius="60%"
                          outerRadius="80%"
                          label={(entry) => `${entry.name}: ${entry.value}`}
                        >
                          {transformDataForChart(stat).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
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