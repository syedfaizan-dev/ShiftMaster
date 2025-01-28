import { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { shifts, users, roles, requests } from "@db/schema";
import { eq, and, or, isNull } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Create initial supervisor and managers
  app.post("/api/setup-roles", async (_req: Request, res: Response) => {
    try {
      // Delete existing data
      await db.delete(requests);
      await db.delete(shifts);
      await db.delete(roles);
      await db.delete(users);

      // Hash password for all users
      const salt = randomBytes(16).toString("hex");
      const passwordBuf = (await scryptAsync("password123", salt, 64)) as Buffer;
      const hashedPassword = `${passwordBuf.toString("hex")}.${salt}`;

      // Create supervisor
      const [supervisor] = await db.insert(users)
        .values({
          username: "supervisor@company.com",
          password: hashedPassword,
          fullName: "John Supervisor",
          isSupervisor: true,
          isManager: false,
          isAdmin: false,
        })
        .returning();

      // Create managers
      const managers = await db.insert(users)
        .values([
          {
            username: "manager1@company.com",
            password: hashedPassword,
            fullName: "Alice Manager",
            isManager: true,
            isSupervisor: false,
            isAdmin: false,
          },
          {
            username: "manager2@company.com",
            password: hashedPassword,
            fullName: "Bob Manager",
            isManager: true,
            isSupervisor: false,
            isAdmin: false,
          },
          {
            username: "manager3@company.com",
            password: hashedPassword,
            fullName: "Carol Manager",
            isManager: true,
            isSupervisor: false,
            isAdmin: false,
          },
        ])
        .returning();

      res.json({ 
        message: "Roles setup completed successfully",
        credentials: {
          supervisor: {
            email: "supervisor@company.com",
            password: "password123"
          },
          managers: [
            {
              email: "manager1@company.com",
              password: "password123"
            },
            {
              email: "manager2@company.com",
              password: "password123"
            },
            {
              email: "manager3@company.com",
              password: "password123"
            }
          ]
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to setup roles";
      res.status(500).json({ message });
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

  // Middleware to check if user is supervisor or manager
  const requireSupervisorOrManager = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (req.user?.isSupervisor || req.user?.isManager || req.user?.isAdmin) {
      return next();
    }

    return res.status(403).json({ message: "Not authorized" });
  };

  // Get all shifts for a user
  app.get("/api/shifts", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userShifts = await db.select()
      .from(shifts)
      .where(eq(shifts.inspectorId, req.user!.id));

    res.json(userShifts);
  });

  // Admin: Get all shifts
  app.get("/api/admin/shifts", requireAdmin, async (_req: Request, res: Response) => {
    const allShifts = await db.select().from(shifts);
    res.json(allShifts);
  });

  // Admin: Create shift
  app.post("/api/admin/shifts", requireAdmin, async (req: Request, res: Response) => {
    const { inspectorId, roleId, startTime, endTime, week, backupId } = req.body;

    const [newShift] = await db.insert(shifts)
      .values({
        inspectorId,
        roleId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        week,
        backupId,
        createdBy: req.user!.id,
      })
      .returning();

    res.json(newShift);
  });

  // Admin: Get all users
  app.get("/api/admin/users", requireAdmin, async (_req: Request, res: Response) => {
    const allUsers = await db.select().from(users);
    res.json(allUsers);
  });

  // Admin: Update user
  app.put("/api/admin/users/:id", requireAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { username, fullName } = req.body;

    // Check if email already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existingUser && existingUser.id !== parseInt(id)) {
      return res.status(400).json({ message: "Email already exists" });
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
  app.get("/api/admin/roles", requireAdmin, async (_req: Request, res: Response) => {
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
        createdBy: req.user!.id,
      })
      .returning();

    res.json(newRole);
  });

  // Admin: Update role
  app.put("/api/admin/roles/:id", requireAdmin, async (req: Request, res: Response) => {
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

  // Get all managers (for reassignment)
  app.get("/api/admin/managers", requireSupervisorOrManager, async (_req: Request, res: Response) => {
    const managers = await db.select({
      id: users.id,
      fullName: users.fullName,
    })
      .from(users)
      .where(eq(users.isManager, true));

    res.json(managers);
  });

  // Create a new request
  app.post("/api/requests", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { startDate, endDate, ...otherData } = req.body;

      // Parse dates if they exist
      const parsedStartDate = startDate ? new Date(startDate) : undefined;
      const parsedEndDate = endDate ? new Date(endDate) : undefined;

      // Validate dates
      if ((parsedStartDate && isNaN(parsedStartDate.getTime())) ||
        (parsedEndDate && isNaN(parsedEndDate.getTime()))) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      const autoEscalateAt = addDays(new Date(), 2); // Auto-escalate after 2 days

      const [newRequest] = await db.insert(requests)
        .values({
          ...otherData,
          startDate: parsedStartDate,
          endDate: parsedEndDate,
          requesterId: req.user!.id,
          status: 'pending',
          autoEscalateAt,
        })
        .returning();

      res.json(newRequest);
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(400).json({ message });
    }
  });

  // Get requests for the current user
  app.get("/api/requests", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userRequests = await db.select({
      id: requests.id,
      type: requests.type,
      status: requests.status,
      reason: requests.reason,
      startDate: requests.startDate,
      endDate: requests.endDate,
      createdAt: requests.createdAt,
      reviewedBy: requests.reviewedBy,
      reviewedAt: requests.reviewedAt,
      reviewer: {
        id: users.id,
        fullName: users.fullName,
      },
    })
      .from(requests)
      .leftJoin(users, eq(requests.reviewedBy, users.id))
      .where(eq(requests.requesterId, req.user!.id));

    res.json(userRequests);
  });

  // Get requests to review (for supervisors and managers)
  app.get("/api/requests/review", requireSupervisorOrManager, async (req: Request, res: Response) => {
    const pendingRequests = await db.select({
      id: requests.id,
      type: requests.type,
      status: requests.status,
      reason: requests.reason,
      startDate: requests.startDate,
      endTime: requests.endTime,
      createdAt: requests.createdAt,
      escalatedTo: requests.escalatedTo,
      requester: {
        id: users.id,
        username: users.username,
        fullName: users.fullName,
      },
    })
      .from(requests)
      .leftJoin(users, eq(requests.requesterId, users.id))
      .where(
        and(
          eq(requests.status, 'pending'),
          or(
            // For supervisors: show non-escalated requests
            and(
              isNull(requests.escalatedTo),
              Boolean(req.user?.isSupervisor)
            ),
            // For managers: show requests escalated to them
            and(
              eq(requests.escalatedTo, req.user?.id ?? 0),
              Boolean(req.user?.isManager)
            ),
            // For admins: show all
            Boolean(req.user?.isAdmin)
          )
        )
      );

    res.json(pendingRequests);
  });

  // Update request status
  app.put("/api/requests/:id", requireSupervisorOrManager, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, notes, escalatedTo } = req.body;

    try {
      const [updatedRequest] = await db.update(requests)
        .set({
          status,
          notes,
          reviewedBy: req.user!.id,
          reviewedAt: new Date(),
          ...(escalatedTo ? {
            escalatedTo,
            escalatedAt: new Date(),
          } : {}),
        })
        .where(eq(requests.id, parseInt(id)))
        .returning();

      res.json(updatedRequest);
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(400).json({ message });
    }
  });

  // Auto-escalation check endpoint (to be called by a scheduled task)
  app.post("/api/requests/check-escalations", requireAdmin, async (_req: Request, res: Response) => {
    const now = new Date();

    try {
      // First, find a manager to escalate to
      const [manager] = await db
        .select()
        .from(users)
        .where(eq(users.isManager, true))
        .limit(1);

      if (!manager) {
        return res.status(400).json({ message: "No manager found for escalation" });
      }

      const [escalatedRequests] = await db.update(requests)
        .set({
          status: 'escalated',
          escalatedAt: now,
          escalatedTo: manager.id,
        })
        .where(
          and(
            eq(requests.status, 'pending'),
            // lt(requests.autoEscalateAt, now)
          )
        )
        .returning();

      res.json(escalatedRequests);
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(400).json({ message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function addDays(date: Date, days: number): Date {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
}