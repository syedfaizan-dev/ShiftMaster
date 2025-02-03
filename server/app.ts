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
  console.error(err.stack);
  res.status(500).json({ message: "Internal Server Error" });
});

// Static file serving should be last
app.use(express.static(path.join(__dirname, "../client/dist")));

// Handle client-side routing
app.get("*", (req, res) => {
  // Only serve index.html for non-API routes
  if (!req.path.startsWith("/api/")) {
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
  }
});

export { app };