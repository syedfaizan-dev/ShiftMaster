import { type Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { shifts, users, roles, requests } from "@db/schema";
import { eq, and, or, isNull, gte, lt } from "drizzle-orm";
import { addDays } from "date-fns";

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

  // Middleware to check if user is supervisor or manager
  const requireSupervisorOrManager = async (req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    if (req.user.isSupervisor || req.user.isManager || req.user.isAdmin) {
      return next();
    }

    return res.status(403).send("Not authorized");
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

  // Request Management Routes

  // Create a new request
  app.post("/api/requests", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const autoEscalateAt = addDays(new Date(), 2); // Auto-escalate after 2 days
      const [newRequest] = await db.insert(requests)
        .values({
          ...req.body,
          requesterId: req.user.id,
          status: 'pending',
          autoEscalateAt,
        })
        .returning();

      res.json(newRequest);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get requests for the current user
  app.get("/api/requests", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const userRequests = await db.select()
      .from(requests)
      .where(eq(requests.requesterId, req.user.id));

    res.json(userRequests);
  });

  // Get requests to review (for supervisors and managers)
  app.get("/api/requests/review", requireSupervisorOrManager, async (req, res) => {
    const pendingRequests = await db.select()
      .from(requests)
      .where(
        and(
          eq(requests.status, 'pending'),
          or(
            isNull(requests.escalatedTo),
            eq(requests.escalatedTo, req.user.id)
          )
        )
      );

    res.json(pendingRequests);
  });

  // Update request status
  app.put("/api/requests/:id", requireSupervisorOrManager, async (req, res) => {
    const { id } = req.params;
    const { status, notes } = req.body;

    try {
      const [updatedRequest] = await db.update(requests)
        .set({
          status,
          notes,
          reviewedBy: req.user.id,
          reviewedAt: new Date(),
        })
        .where(eq(requests.id, parseInt(id)))
        .returning();

      res.json(updatedRequest);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Auto-escalation check endpoint (to be called by a scheduled task)
  app.post("/api/requests/check-escalations", requireAdmin, async (req, res) => {
    const now = new Date();

    try {
      const [escalatedRequests] = await db.update(requests)
        .set({
          status: 'escalated',
          escalatedAt: now,
          escalatedTo: (request) => {
            // Escalate to manager if not already escalated
            return request.escalatedTo ?? db
              .select({ id: users.id })
              .from(users)
              .where(eq(users.isManager, true))
              .limit(1);
          },
        })
        .where(
          and(
            eq(requests.status, 'pending'),
            lt(requests.autoEscalateAt, now)
          )
        )
        .returning();

      res.json(escalatedRequests);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}