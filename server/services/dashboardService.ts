import { db } from "../config/database";
import { shifts, users, tasks, buildings } from "@db/schema";
import { and, eq, sql } from "drizzle-orm";

class DashboardService {
  async getDashboardStats() {
    const [
      totalEmployees,
      activeTasks,
      totalBuildings,
      shiftStats,
    ] = await Promise.all([
      this.getTotalEmployees(),
      this.getActiveTasks(),
      this.getTotalBuildings(),
      this.getShiftStats(),
    ]);

    const monthlyTaskCompletion = await this.getMonthlyTaskCompletion();
    const buildingOccupancy = await this.getBuildingOccupancy();
    const taskDistribution = await this.getTaskDistribution();
    const shiftCoverageTrends = await this.getShiftCoverageTrends();

    return {
      totalEmployees: totalEmployees.count,
      employeeGrowth: 5, // Placeholder: Calculate from historical data
      activeTasks: activeTasks.count,
      taskCompletion: Math.round((activeTasks.completed / activeTasks.count) * 100),
      totalBuildings: totalBuildings.count,
      buildingUtilization: 85, // Placeholder: Calculate from actual usage
      shiftCoverage: shiftStats.coverage,
      openShifts: shiftStats.openShifts,
      monthlyTaskCompletion,
      buildingOccupancy,
      taskDistribution,
      shiftCoverageTrends,
    };
  }

  private async getTotalEmployees() {
    const [result] = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(users)
      .where(
        and(
          eq(users.isAdmin, false),
          eq(users.isManager, false)
        )
      );
    return { count: result.count };
  }

  private async getActiveTasks() {
    const [result] = await db
      .select({
        count: sql<number>`count(*)::int`,
        completed: sql<number>`sum(case when status = 'COMPLETED' then 1 else 0 end)::int`,
      })
      .from(tasks);
    return { count: result.count, completed: result.completed };
  }

  private async getTotalBuildings() {
    const [result] = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(buildings);
    return { count: result.count };
  }

  private async getShiftStats() {
    const [result] = await db
      .select({
        total: sql<number>`count(*)::int`,
        filled: sql<number>`sum(case when "inspectorId" is not null then 1 else 0 end)::int`,
      })
      .from(shifts)
      .where(sql`date_trunc('week', week) = date_trunc('week', current_date)`);
    
    const coverage = result.total ? Math.round((result.filled / result.total) * 100) : 0;
    const openShifts = result.total - result.filled;
    
    return { coverage, openShifts };
  }

  private async getMonthlyTaskCompletion() {
    // Mock data - Replace with actual DB query
    return [
      { month: "Jan", completed: 65, total: 100 },
      { month: "Feb", completed: 75, total: 90 },
      { month: "Mar", completed: 85, total: 95 },
      { month: "Apr", completed: 80, total: 100 },
      { month: "May", completed: 90, total: 110 },
    ];
  }

  private async getBuildingOccupancy() {
    // Mock data - Replace with actual DB query
    return [
      { building: "Building A", occupancy: 85 },
      { building: "Building B", occupancy: 72 },
      { building: "Building C", occupancy: 90 },
      { building: "Building D", occupancy: 68 },
    ];
  }

  private async getTaskDistribution() {
    // Mock data - Replace with actual DB query
    return [
      { name: "Completed", value: 45 },
      { name: "In Progress", value: 30 },
      { name: "Pending", value: 15 },
      { name: "Overdue", value: 10 },
    ];
  }

  private async getShiftCoverageTrends() {
    // Mock data - Replace with actual DB query
    return [
      { week: "Week 1", coverage: 85 },
      { week: "Week 2", coverage: 88 },
      { week: "Week 3", coverage: 92 },
      { week: "Week 4", coverage: 89 },
    ];
  }
}

export const dashboardService = new DashboardService();
