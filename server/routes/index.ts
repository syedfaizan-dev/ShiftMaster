import { Express } from "express";
import { registerAuthRoutes } from "./authRoutes";
import { registerUserRoutes } from "./userRoutes";
import { registerShiftRoutes } from "./shiftRoutes";
import { registerRoleRoutes } from "./roleRoutes";
import { registerTaskRoutes } from "./taskRoutes";
import { registerBuildingRoutes } from "./buildingRoutes";
import { registerRequestRoutes } from "./requestRoutes";

export function registerRoutes(app: Express) {
  registerAuthRoutes(app);
  registerUserRoutes(app);
  registerShiftRoutes(app);
  registerRoleRoutes(app);
  registerTaskRoutes(app);
  registerBuildingRoutes(app);
  registerRequestRoutes(app);
}