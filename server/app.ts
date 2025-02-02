import express from "express";
import { setupAuth } from "./middlewares/auth";
import { registerRoutes } from "./routes";

const app = express();

// Middleware
app.use(express.json());

// Auth setup
setupAuth(app);

// Register routes
registerRoutes(app);

export { app };
