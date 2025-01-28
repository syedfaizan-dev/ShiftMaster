import { type Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { shifts, users, roles, requests } from "@db/schema";
import { eq, and, or, isNull } from "drizzle-orm";

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

  // Middleware to check if user is authenticated and is manager or admin
  const requireManagerOrAdmin = (req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }
    if (!req.user.isManager && !req.user.isAdmin) {
      return res.status(403).send("Not authorized");
    }
    next();
  };

  // Get all managers
  app.get("/api/admin/managers", requireAdmin, async (req, res) => {
    const managers = await db
      .select()
      .from(users)
      .where(eq(users.isManager, true));
    res.json(managers);
  });

  // Admin: Assign request to manager
  app.post("/api/admin/requests/:id/assign", requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { managerId } = req.body;

    const [updatedRequest] = await db
      .update(requests)
      .set({
        managerId,
      })
      .where(eq(requests.id, parseInt(id)))
      .returning();

    res.json(updatedRequest);
  });

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

  // Get requests based on user role
  app.get("/api/requests", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    let whereClause;

    // Determine the where clause based on user role
    if (req.user.isAdmin) {
      // Admin sees all requests
      whereClause = undefined;
    } else if (req.user.isManager) {
      // Managers only see requests assigned to them
      whereClause = eq(requests.managerId, req.user.id);
    } else {
      // Regular users only see their own requests
      whereClause = eq(requests.requesterId, req.user.id);
    }

    // Build the base query
    const requestsQuery = db
      .select({
        request: requests,
        requester: {
          id: users.id,
          username: users.username,
          fullName: users.fullName,
        }
      })
      .from(requests)
      .leftJoin(users, eq(requests.requesterId, users.id));

    // Apply the where clause if it exists
    const userRequests = whereClause 
      ? await requestsQuery.where(whereClause)
      : await requestsQuery;

    // Get additional details (reviewer and manager information)
    const requestsWithDetails = await Promise.all(
      userRequests.map(async ({ request }) => {
        let reviewer = null;
        let manager = null;

        if (request.reviewerId) {
          const [reviewerData] = await db
            .select({
              id: users.id,
              username: users.username,
              fullName: users.fullName,
            })
            .from(users)
            .where(eq(users.id, request.reviewerId))
            .limit(1);
          reviewer = reviewerData;
        }

        if (request.managerId) {
          const [managerData] = await db
            .select({
              id: users.id,
              username: users.username,
              fullName: users.fullName,
            })
            .from(users)
            .where(eq(users.id, request.managerId))
            .limit(1);
          manager = managerData;
        }

        return {
          ...request,
          requester: userRequests.find(r => r.request.id === request.id)?.requester,
          reviewer,
          manager,
        };
      })
    );

    res.json(requestsWithDetails);
  });

  // Manager/Admin: Review request (approve/reject)
  app.put("/api/admin/requests/:id", requireManagerOrAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    // Check if the user has permission to review this request
    const [request] = await db
      .select()
      .from(requests)
      .where(eq(requests.id, parseInt(id)))
      .limit(1);

    if (!request) {
      return res.status(404).send("Request not found");
    }

    if (!req.user.isAdmin && request.managerId !== req.user.id) {
      return res.status(403).send("Not authorized to review this request");
    }

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