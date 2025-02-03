import { Express } from "express";
import { userController } from "../controllers/userController";
import { requireAdmin } from "../middlewares/auth";

export function registerUserRoutes(app: Express) {
  // Get all admin users
  app.get("/api/admin/users/admins", requireAdmin, userController.getAdmins);

  // Get all managers
  app.get("/api/admin/users/managers", requireAdmin, userController.getManagers);

  // Get all inspectors
  app.get("/api/admin/users/inspectors", requireAdmin, userController.getInspectors);

  // Get all employees
  app.get("/api/admin/users/employees", requireAdmin, userController.getEmployees);

  // Get all users
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users = await userController.getAllUsers(req, res);
      res.json(users);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Error fetching all users" });
    }
  });
}