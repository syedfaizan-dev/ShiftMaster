import { Express } from "express";
import { dashboardController } from "../controllers/dashboardController";
import { requireAdmin } from "../middlewares/auth";

export function registerDashboardRoutes(app: Express) {
  app.get("/api/admin/dashboard/stats", requireAdmin, dashboardController.getDashboardStats);
}
