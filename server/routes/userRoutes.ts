import { Express } from "express";
import { userController } from "../controllers/userController";
import { requireAdmin } from "../middlewares/auth";

export function registerUserRoutes(app: Express) {
  app.get("/api/admin/users/admins", requireAdmin, userController.getAdmins);
  app.get("/api/admin/users/managers", requireAdmin, userController.getManagers);
  app.get("/api/admin/users/inspectors", requireAdmin, userController.getInspectors);
  app.get("/api/admin/users/employees", requireAdmin, userController.getEmployees);
}
