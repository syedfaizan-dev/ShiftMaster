import express from "express";
import { setupAuth } from "./middlewares/auth";
import { registerRoutes } from "./routes";
import { registerAuthRoutes } from "./routes/authRoutes";

const app = express();

// Middleware
app.use(express.json());

// Auth setup
setupAuth(app);

// Register routes
registerAuthRoutes(app); // Register auth routes first
registerRoutes(app);

export { app };