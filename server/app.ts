import express from "express";
import { setupAuth } from "./middlewares/auth";
import { registerAuthRoutes } from "./routes/authRoutes";
import { registerRoutes } from "./routes";

const app = express();

// Middleware
app.use(express.json());

// Setup authentication
setupAuth(app);

// Register auth routes first
registerAuthRoutes(app);

// Register other routes
registerRoutes(app);

export { app };