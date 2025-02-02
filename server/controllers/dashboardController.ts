import { Request, Response } from "express";
import { dashboardService } from "../services/dashboardService";

export class DashboardController {
  async getDashboardStats(req: Request, res: Response) {
    try {
      const stats = await dashboardService.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Error fetching dashboard statistics" });
    }
  }
}

export const dashboardController = new DashboardController();
