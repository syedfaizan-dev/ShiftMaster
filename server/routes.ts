import { type Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { shifts, users, roles } from "@db/schema";
import { eq } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Middleware to check if user is authenticated and is admin
  const requireAdmin = (req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }
    if (!req.user.isAdmin) {
      return res.status(403).send("Not authorized");
    }
    next();
  };

  // Get all shifts for a user
  app.get("/api/shifts", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const userShifts = await db.select()
      .from(shifts)
      .where(eq(shifts.inspectorId, req.user.id));

    res.json(userShifts);
  });

  // Admin: Get all shifts
  app.get("/api/admin/shifts", requireAdmin, async (req, res) => {
    const allShifts = await db.select().from(shifts);
    res.json(allShifts);
  });

  // Admin: Create shift
  app.post("/api/admin/shifts", requireAdmin, async (req, res) => {
    const { inspectorId, roleId, startTime, endTime, week, backupId } = req.body;

    const [newShift] = await db.insert(shifts)
      .values({
        inspectorId,
        roleId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        week,
        backupId,
        createdBy: req.user.id,
      })
      .returning();

    res.json(newShift);
  });

  // Admin: Get all users
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    const allUsers = await db.select().from(users);
    res.json(allUsers);
  });

  // Admin: Update user
  app.put("/api/admin/users/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { username, fullName } = req.body;

    // Check if email already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existingUser && existingUser.id !== parseInt(id)) {
      return res.status(400).send("Email already exists");
    }

    // Update user
    const [updatedUser] = await db
      .update(users)
      .set({
        username,
        fullName,
      })
      .where(eq(users.id, parseInt(id)))
      .returning();

    res.json(updatedUser);
  });

  // Admin: Get all roles
  app.get("/api/admin/roles", requireAdmin, async (req, res) => {
    const allRoles = await db.select().from(roles);
    res.json(allRoles);
  });

  // Admin: Create role
  app.post("/api/admin/roles", requireAdmin, async (req, res) => {
    const { name, description } = req.body;

    const [newRole] = await db.insert(roles)
      .values({
        name,
        description,
        createdBy: req.user.id,
      })
      .returning();

    res.json(newRole);
  });

  // Admin: Update role
  app.put("/api/admin/roles/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;

    const [updatedRole] = await db
      .update(roles)
      .set({
        name,
        description,
      })
      .where(eq(roles.id, parseInt(id)))
      .returning();

    res.json(updatedRole);
  });

  const httpServer = createServer(app);
  return httpServer;
}