import express from "express";
import { setupAuth } from "./middlewares/auth";
import { registerRoutes } from "./routes";
import path from "path";

const app = express();

// Middleware
app.use(express.json());

// Auth setup
setupAuth(app);

// API Routes - Register before static files
registerRoutes(app);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Error:", err.stack);
  if (req.path.startsWith('/api/')) {
    res.status(500).json({ message: "Internal Server Error" });
  } else {
    next(err);
  }
});

// Handle API 404s
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: "API endpoint not found" });
});

// Static file serving should be last
app.use(express.static(path.join(__dirname, "../client/dist")));

// Handle client-side routing
app.get("*", (req, res, next) => {
  if (!req.path.startsWith("/api/")) {
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
  } else {
    next();
  }
});

export { app };