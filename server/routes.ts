import { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { shifts, users, roles, requests } from "@db/schema";
import { eq, and, or, isNull } from "drizzle-orm";
import { getNotifications, markNotificationAsRead } from "./routes/notifications";
import { getShifts, createShift } from "./routes/shifts";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Middleware to check if user is authenticated
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    next();
  };

  // Get basic user info for authenticated users
  app.get("/api/users", requireAuth, async (req: Request, res: Response) => {
    try {
      const allUsers = await db
        .select({
          id: users.id,
          username: users.username,
          fullName: users.fullName,
        })
        .from(users);
      res.json(allUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Error fetching users' });
    }
  });

  // Get basic role info for authenticated users
  app.get("/api/roles", requireAuth, async (req: Request, res: Response) => {
    try {
      const allRoles = await db
        .select({
          id: roles.id,
          name: roles.name,
        })
        .from(roles);
      res.json(allRoles);
    } catch (error) {
      console.error('Error fetching roles:', error);
      res.status(500).json({ message: 'Error fetching roles' });
    }
  });

  // Middleware to check if user is authenticated and is admin
  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }
    next();
  };

  // Notification routes
  app.get("/api/notifications", requireAuth, getNotifications);
  app.post("/api/notifications/:id/read", requireAuth, markNotificationAsRead);

  // Get all managers
  app.get("/api/admin/managers", requireAdmin, async (req: Request, res: Response) => {
    const managers = await db
      .select()
      .from(users)
      .where(eq(users.isManager, true));
    res.json(managers);
  });

  // Admin: Get all users
  app.get("/api/admin/users", requireAdmin, async (req: Request, res: Response) => {
    const allUsers = await db.select().from(users);
    res.json(allUsers);
  });

  // Admin: Update user
  app.put("/api/admin/users/:id", requireAdmin, async (req: Request, res: Response) => {
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

  // Get all shifts for a user (now using the getShifts handler)
  app.get("/api/shifts", requireAuth, getShifts);

  // Admin: Get all shifts (also using the same getShifts handler)
  app.get("/api/admin/shifts", requireAdmin, getShifts);

  // Admin: Create shift
  app.post("/api/admin/shifts", requireAdmin, createShift);

  // Admin: Get all roles
  app.get("/api/admin/roles", requireAdmin, async (req: Request, res: Response) => {
    const allRoles = await db.select().from(roles);
    res.json(allRoles);
  });

  // Admin: Create role
  app.post("/api/admin/roles", requireAdmin, async (req: Request, res: Response) => {
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

  // Get requests based on user role
  app.get("/api/requests", requireAuth, async (req: Request, res: Response) => {
    try {
      let query = db.select().from(requests);

      // Apply filters based on user role
      if (req.user.isAdmin) {
        // Admin sees all requests - no filter needed
      } else if (req.user.isManager) {
        // Managers only see requests assigned to them
        query = query.where(eq(requests.managerId, req.user.id));
      } else {
        // Regular users only see their own requests
        query = query.where(eq(requests.requesterId, req.user.id));
      }

      // Execute the query
      const userRequests = await query;

      // Get additional details for each request
      const requestsWithDetails = await Promise.all(
        userRequests.map(async (request) => {
          // Get requester details
          const [requester] = await db
            .select({
              id: users.id,
              username: users.username,
              fullName: users.fullName,
            })
            .from(users)
            .where(eq(users.id, request.requesterId))
            .limit(1);

          // Get reviewer details if exists
          let reviewer = null;
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

          // Get manager details if exists
          let manager = null;
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
            requester,
            reviewer,
            manager,
          };
        })
      );

      res.json(requestsWithDetails);
    } catch (error) {
      console.error('Error fetching requests:', error);
      res.status(500).json({ message: 'Error fetching requests' });
    }
  });

  // Create a new request (shift swap or leave)
  app.post("/api/requests", requireAuth, async (req: Request, res: Response) => {
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

  // Admin: Assign request to manager
  app.post("/api/admin/requests/:id/assign", requireAdmin, async (req: Request, res: Response) => {
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

  // Manager/Admin: Review request (approve/reject)
  app.put("/api/admin/requests/:id", requireAuth, async (req: Request, res: Response) => {
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

    // Only allow admin or assigned manager to review
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