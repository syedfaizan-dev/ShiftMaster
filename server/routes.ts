import { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { shifts, users, roles, requests, shiftTypes, tasks, taskTypes } from "@db/schema";
import { eq, and, or, isNull } from "drizzle-orm";
import { getNotifications, markNotificationAsRead } from "./routes/notifications";
import { getShifts } from "./routes/shifts";

export const createShift = async (req: Request, res: Response) => {
  try {
    const { inspectorId, roleId, shiftTypeId, week, backupId } = req.body;

    // Validate that the shift type exists
    const [shiftType] = await db
      .select()
      .from(shiftTypes)
      .where(eq(shiftTypes.id, shiftTypeId))
      .limit(1);

    if (!shiftType) {
      return res.status(400).json({ message: "Invalid shift type" });
    }

    const [newShift] = await db.insert(shifts)
      .values({
        inspectorId,
        roleId,
        shiftTypeId,
        week,
        backupId,
        createdBy: req.user.id,
      })
      .returning();

    res.json(newShift);
  } catch (error) {
    console.error('Error creating shift:', error);
    res.status(500).json({ message: 'Error creating shift' });
  }
};

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

  // Get all shift types
  app.get("/api/shift-types", requireAuth, async (req: Request, res: Response) => {
    try {
      const allShiftTypes = await db.select().from(shiftTypes);
      res.json(allShiftTypes);
    } catch (error) {
      console.error('Error fetching shift types:', error);
      res.status(500).json({ message: 'Error fetching shift types' });
    }
  });

  // Admin: Create shift type
  app.post("/api/admin/shift-types", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { name, startTime, endTime, description } = req.body;

      const [existingType] = await db
        .select()
        .from(shiftTypes)
        .where(eq(shiftTypes.name, name))
        .limit(1);

      if (existingType) {
        return res.status(400).json({ message: "Shift type with this name already exists" });
      }

      const [newShiftType] = await db.insert(shiftTypes)
        .values({
          name,
          startTime,
          endTime,
          description,
          createdBy: req.user.id,
        })
        .returning();

      res.json(newShiftType);
    } catch (error) {
      console.error('Error creating shift type:', error);
      res.status(500).json({ message: 'Error creating shift type' });
    }
  });

  // Admin: Update shift type
  app.put("/api/admin/shift-types/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, startTime, endTime, description } = req.body;

      const [updatedShiftType] = await db
        .update(shiftTypes)
        .set({
          name,
          startTime,
          endTime,
          description,
        })
        .where(eq(shiftTypes.id, parseInt(id)))
        .returning();

      res.json(updatedShiftType);
    } catch (error) {
      console.error('Error updating shift type:', error);
      res.status(500).json({ message: 'Error updating shift type' });
    }
  });

  // Get all tasks (admin only)
  app.get("/api/admin/tasks", requireAdmin, async (req: Request, res: Response) => {
    try {
      const result = await db.query.tasks.findMany({
        with: {
          inspector: true,
          assignedEmployee: true,
          shiftType: true
        }
      });

      res.json(result || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      res.status(500).json({ message: 'Error fetching tasks' });
    }
  });

  // Create task (admin only)
  app.post("/api/admin/tasks", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { inspectorId, shiftTypeId, taskType, description, status, date, isFollowupNeeded, assignedTo } = req.body;

      // Verify that the assigned user is an employee (not admin, manager, or inspector)
      const [assignedUser] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.id, assignedTo),
            eq(users.isAdmin, false),
            eq(users.isManager, false),
            eq(users.isInspector, false)
          )
        )
        .limit(1);

      if (!assignedUser) {
        return res.status(400).json({ message: "Invalid assigned user. Must be an employee." });
      }

      const [newTask] = await db
        .insert(tasks)
        .values({
          inspectorId,
          shiftTypeId,
          taskType,
          description,
          status,
          date: new Date(date),
          isFollowupNeeded,
          assignedTo,
          createdBy: req.user.id,
        })
        .returning();

      res.json(newTask);
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({ message: 'Error creating task' });
    }
  });

  // Get employees (users who are not admin, manager, or inspector)
  app.get("/api/admin/employees", requireAdmin, async (req: Request, res: Response) => {
    try {
      const employees = await db
        .select({
          id: users.id,
          username: users.username,
          fullName: users.fullName,
        })
        .from(users)
        .where(
          and(
            eq(users.isAdmin, false),
            eq(users.isManager, false),
            eq(users.isInspector, false)
          )
        );

      res.json(employees);
    } catch (error) {
      console.error('Error fetching employees:', error);
      res.status(500).json({ message: 'Error fetching employees' });
    }
  });

  // Get inspectors by shift type
  app.get("/api/admin/shifts/inspectors/:shiftTypeId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { shiftTypeId } = req.params;

      // Get all inspectors assigned to this shift type
      const inspectorsInShift = await db
        .select({
          id: users.id,
          fullName: users.fullName,
          username: users.username,
        })
        .from(users)
        .innerJoin(shifts, eq(shifts.inspectorId, users.id))
        .where(
          and(
            eq(shifts.shiftTypeId, parseInt(shiftTypeId)),
            eq(users.isInspector, true)
          )
        )
        .groupBy(users.id, users.fullName, users.username);

      res.json(inspectorsInShift);
    } catch (error) {
      console.error('Error fetching inspectors by shift type:', error);
      res.status(500).json({ message: 'Error fetching inspectors' });
    }
  });

  // Get all task types
  app.get("/api/task-types", requireAuth, async (req: Request, res: Response) => {
    try {
      const allTaskTypes = await db.select().from(taskTypes);
      res.json(allTaskTypes);
    } catch (error) {
      console.error('Error fetching task types:', error);
      res.status(500).json({ message: 'Error fetching task types' });
    }
  });

  // Admin: Create task type
  app.post("/api/admin/task-types", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { name, description } = req.body;

      // Check if task type already exists
      const [existingType] = await db
        .select()
        .from(taskTypes)
        .where(eq(taskTypes.name, name))
        .limit(1);

      if (existingType) {
        return res.status(400).json({ message: "Task type with this name already exists" });
      }

      const [newTaskType] = await db.insert(taskTypes)
        .values({
          name,
          description,
          createdBy: req.user?.id,
        })
        .returning();

      res.json(newTaskType);
    } catch (error) {
      console.error('Error creating task type:', error);
      res.status(500).json({ message: 'Error creating task type' });
    }
  });

  // Admin: Update task type
  app.put("/api/admin/task-types/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      const [updatedTaskType] = await db
        .update(taskTypes)
        .set({
          name,
          description,
        })
        .where(eq(taskTypes.id, parseInt(id)))
        .returning();

      res.json(updatedTaskType);
    } catch (error) {
      console.error('Error updating task type:', error);
      res.status(500).json({ message: 'Error updating task type' });
    }
  });

  // Admin: Delete task type
  app.delete("/api/admin/task-types/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      await db
        .delete(taskTypes)
        .where(eq(taskTypes.id, parseInt(id)));

      res.json({ message: "Task type deleted successfully" });
    } catch (error) {
      console.error('Error deleting task type:', error);
      res.status(500).json({ message: 'Error deleting task type' });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}