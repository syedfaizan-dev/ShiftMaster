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

  // Get all managers
  app.get("/api/admin/managers", requireAdmin, async (req, res) => {
    const managers = await db
      .select()
      .from(users)
      .where(eq(users.isManager, true));
    res.json(managers);
  });

  // Get requests based on user role
  app.get("/api/requests", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

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
      res.status(500).send('Error fetching requests');
    }
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

  // Manager/Admin: Review request (approve/reject)
  app.put("/api/admin/requests/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

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