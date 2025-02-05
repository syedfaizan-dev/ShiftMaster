import { Express, Request, Response } from "express";
import passport from "passport";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { crypto } from "../middlewares/auth";

export function registerAuthRoutes(app: Express) {
  // Register new user
  app.post("/api/register", async (req: Request, res: Response) => {
    try {
      const { username, password, fullName } = req.body;

      if (!username || !password || !fullName) {
        return res.status(400).json({
          message: "Missing required fields",
          details: "Username, password, and full name are required",
        });
      }

      // Check if user already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({
          message: "Username already exists",
          details: "Please choose a different username",
        });
      }

      // Hash password and create user
      const hashedPassword = await crypto.hash(password);
      const [newUser] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          fullName,
          isAdmin: false,
          isInspector: false,
          isManager: false,
        })
        .returning();

      // Log in the new user
      req.login(newUser, (err) => {
        if (err) {
          return res.status(500).json({
            message: "Error logging in after registration",
            error: err.message,
          });
        }
        return res.status(201).json({
          message: "Registration successful",
          user: {
            id: newUser.id,
            username: newUser.username,
            fullName: newUser.fullName,
            isAdmin: newUser.isAdmin,
            isInspector: newUser.isInspector,
            isManager: newUser.isManager,
          },
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        message: "Error during registration",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Login user
  app.post("/api/login", (req: Request, res: Response, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        return res.status(500).json({
          message: "Error during login",
          error: err.message,
        });
      }

      if (!user) {
        return res.status(401).json({
          message: "Authentication failed",
          details: info?.message || "Invalid credentials",
        });
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({
            message: "Error during login",
            error: loginErr.message,
          });
        }

        return res.json({
          message: "Login successful",
          user: {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            isAdmin: user.isAdmin,
            isInspector: user.isInspector,
            isManager: user.isManager,
          },
        });
      });
    })(req, res, next);
  });

  // Logout user
  app.post("/api/logout", (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({
          message: "Error during logout",
          error: err.message,
        });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Get current user
  app.get("/api/user", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user;
    res.json({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      isAdmin: user.isAdmin,
      isInspector: user.isInspector,
      isManager: user.isManager,
    });
  });
}