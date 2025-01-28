import { type Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { shifts, users, roles, requests } from "@db/schema";
import { eq, and, or } from "drizzle-orm";

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

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existingUser && existingUser.id !== parseInt(id)) {
      return res.status(400).send("Email already exists");
    }

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

  // Create a new request (shift swap or leave)
  app.post("/api/requests", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const { type, shiftId, targetShiftId, startDate, endDate, reason } = req.body;

    const [newRequest] = await db.insert(requests)
      .values({
        requesterId: req.user.id,
        type,
        shiftId,
        targetShiftId,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        reason,
      })
      .returning();

    res.json(newRequest);
  });

  // Get requests for the current user
  app.get("/api/requests", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const userRequests = await db
      .select({
        request: requests,
        requester: users,
        reviewer: {
          id: users.id,
          fullName: users.fullName,
          username: users.username,
        },
      })
      .from(requests)
      .leftJoin(users, eq(requests.requesterId, users.id))
      .leftJoin(users, eq(requests.reviewerId, users.id), { as: "reviewer" })
      .where(eq(requests.requesterId, req.user.id));

    res.json(userRequests.map(({ request, requester, reviewer }) => ({
      ...request,
      requester: {
        id: requester.id,
        fullName: requester.fullName,
        username: requester.username,
      },
      reviewer,
    })));
  });

  // Admin: Get all requests
  app.get("/api/admin/requests", requireAdmin, async (req, res) => {
    const allRequests = await db
      .select({
        request: requests,
        requester: users,
        reviewer: {
          id: users.id,
          fullName: users.fullName,
          username: users.username,
        },
      })
      .from(requests)
      .leftJoin(users, eq(requests.requesterId, users.id))
      .leftJoin(users, eq(requests.reviewerId, users.id), { as: "reviewer" });

    res.json(allRequests.map(({ request, requester, reviewer }) => ({
      ...request,
      requester: {
        id: requester.id,
        fullName: requester.fullName,
        username: requester.username,
      },
      reviewer,
    })));
  });

  // Admin: Review request (approve/reject)
  app.put("/api/admin/requests/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const [updatedRequest] = await db
      .update(requests)
      .set({
        status,
        reviewerId: req.user.id,
        reviewedAt: new Date(),
      })
      .where(eq(requests.id, parseInt(id)))
      .returning();

    res.json(updatedRequest);
  });

  const httpServer = createServer(app);
  return httpServer;
}