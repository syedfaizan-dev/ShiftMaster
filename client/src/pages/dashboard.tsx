import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/hooks/use-user";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/navbar";

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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {taskStats.map((stat) => (
              <Card key={stat.shiftTypeId}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {stat.shiftTypeName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">
                        Total Tasks:
                      </span>
                      <span className="font-medium">{stat.total}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-yellow-600">Pending:</span>
                      <span className="font-medium">{stat.pending}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-600">In Progress:</span>
                      <span className="font-medium">{stat.inProgress}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-green-600">Completed:</span>
                      <span className="font-medium">{stat.completed}</span>
                    </div>
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
