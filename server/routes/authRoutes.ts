import { Express } from "express";
import { authController } from "../controllers/authController";

export function registerAuthRoutes(app: Express) {
  app.post("/api/register", authController.register);
  app.post("/api/login", authController.login);
  app.post("/api/logout", authController.logout);
  app.get("/api/user", authController.getCurrentUser);
}
