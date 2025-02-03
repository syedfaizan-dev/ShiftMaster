import express from "express";
import { setupAuth } from "./middlewares/auth";
import { registerRoutes } from "./routes";
import path from "path";

const app = express();

// Essential middleware
app.use(express.json());

// API Routes - Must be first
app.use("/api", (req, res, next) => {
  res.setHeader("Content-Type", "application/json");
  next();
});

// Auth setup
setupAuth(app);

// Register API routes
registerRoutes(app);

// Handle API 404s before static files
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: "API endpoint not found" });
});

// Error handling middleware for API routes
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Error:", err.stack);
  if (req.path.startsWith('/api/')) {
    res.status(500).json({ message: "Internal Server Error" });
  } else {
    next(err);
  }
});

// Static file serving must be after API routes
app.use(express.static(path.join(__dirname, "../client/dist")));

// SPA fallback - must be last
app.get("*", (req, res, next) => {
  if (!req.path.startsWith("/api/")) {
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
  } else {
    next();
  }
});

export { app };