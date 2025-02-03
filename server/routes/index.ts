import { Express } from "express";
import { registerAuthRoutes } from "./authRoutes";
import { registerUserRoutes } from "./userRoutes";
import { registerShiftRoutes } from "./shiftRoutes";
import { registerRoleRoutes } from "./roleRoutes";
import { registerTaskRoutes } from "./taskRoutes";
import { registerBuildingRoutes } from "./buildingRoutes";
import { registerRequestRoutes } from "./requestRoutes";
import { registerNotificationRoutes } from "./notificationRoutes";

export function registerRoutes(app: Express) {
  // Add API prefix middleware
  app.use("/api", (req, res, next) => {
    console.log(`[API Request] ${req.method} ${req.path}`);
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  // Register all route modules
  registerAuthRoutes(app);
  registerUserRoutes(app);
  registerShiftRoutes(app);
  registerRoleRoutes(app);
  registerTaskRoutes(app);
  registerBuildingRoutes(app);
  registerRequestRoutes(app);
  registerNotificationRoutes(app);
}