import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Loader2 } from "lucide-react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export function DashboardStatistics() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const response = await fetch("/api/admin/dashboard/stats");
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard stats");
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-4">
      {/* Quick Stats Cards */}
      <Card className="p-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Total Employees</p>
          <p className="text-2xl font-bold">{stats?.totalEmployees || 0}</p>
          <p className="text-xs text-muted-foreground">
            {stats?.employeeGrowth > 0 ? '+' : ''}{stats?.employeeGrowth || 0}% from last month
          </p>
        </div>
      </Card>
      
      <Card className="p-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Active Tasks</p>
          <p className="text-2xl font-bold">{stats?.activeTasks || 0}</p>
          <p className="text-xs text-muted-foreground">
            {stats?.taskCompletion || 0}% completion rate
          </p>
        </div>
      </Card>
      
      <Card className="p-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Buildings Managed</p>
          <p className="text-2xl font-bold">{stats?.totalBuildings || 0}</p>
          <p className="text-xs text-muted-foreground">
            {stats?.buildingUtilization || 0}% utilization
          </p>
        </div>
      </Card>
      
      <Card className="p-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Shift Coverage</p>
          <p className="text-2xl font-bold">{stats?.shiftCoverage || 0}%</p>
          <p className="text-xs text-muted-foreground">
            {stats?.openShifts || 0} open shifts
          </p>
        </div>
      </Card>

      {/* Charts */}
      <Card className="p-4 col-span-2">
        <h3 className="font-semibold mb-4">Monthly Task Completion</h3>
        <LineChart width={500} height={300} data={stats?.monthlyTaskCompletion || []}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="completed" stroke="#0088FE" name="Completed Tasks" />
          <Line type="monotone" dataKey="total" stroke="#00C49F" name="Total Tasks" />
        </LineChart>
      </Card>

      <Card className="p-4 col-span-2">
        <h3 className="font-semibold mb-4">Building Occupancy</h3>
        <BarChart width={500} height={300} data={stats?.buildingOccupancy || []}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="building" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="occupancy" fill="#0088FE" name="Occupancy Rate %" />
        </BarChart>
      </Card>

      <Card className="p-4 col-span-2">
        <h3 className="font-semibold mb-4">Task Distribution</h3>
        <div className="flex items-center justify-center">
          <PieChart width={400} height={300}>
            <Pie
              data={stats?.taskDistribution || []}
              cx={200}
              cy={150}
              labelLine={false}
              label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {(stats?.taskDistribution || []).map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </div>
      </Card>

      <Card className="p-4 col-span-2">
        <h3 className="font-semibold mb-4">Shift Coverage Trends</h3>
        <LineChart width={500} height={300} data={stats?.shiftCoverageTrends || []}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="coverage" stroke="#0088FE" name="Coverage %" />
        </LineChart>
      </Card>
    </div>
  );
}
