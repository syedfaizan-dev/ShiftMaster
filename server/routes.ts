import { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { shifts, users, roles, requests, shiftTypes, tasks, taskTypes } from "@db/schema";
import { eq, and, or, isNull } from "drizzle-orm";
import { getNotifications, markNotificationAsRead } from "./routes/notifications";
import { getShifts } from "./routes/shifts";
import { sql } from "drizzle-orm";

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

const updateShift = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { inspectorId, roleId, shiftTypeId, week, backupId } = req.body;

        const [existingShift] = await db.select().from(shifts).where(eq(shifts.id, parseInt(id))).limit(1);

        if (!existingShift) {
            return res.status(404).json({ message: "Shift not found" });
        }

        // Validate that the shift type exists
        const [shiftType] = await db
            .select()
            .from(shiftTypes)
            .where(eq(shiftTypes.id, shiftTypeId))
            .limit(1);

        if (!shiftType) {
            return res.status(400).json({ message: "Invalid shift type" });
        }


        const [updatedShift] = await db.update(shifts)
            .set({
                inspectorId,
                roleId,
                shiftTypeId,
                week,
                backupId,
                updatedBy: req.user.id, // Assuming you have updatedBy field
            })
            .where(eq(shifts.id, parseInt(id)))
            .returning();

        res.json(updatedShift);
    } catch (error) {
        console.error('Error updating shift:', error);
        res.status(500).json({ message: 'Error updating shift' });
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
    try {
      const { id } = req.params;
      const { username, fullName, isAdmin, isManager, isInspector } = req.body;

      console.log('Update user request:', {
        id,
        username,
        fullName,
        isAdmin,
        isManager,
        isInspector
      });

      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(id)))
        .limit(1);

      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check for username conflicts
      const [userWithSameUsername] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (userWithSameUsername && userWithSameUsername.id !== parseInt(id)) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Update the user with role information
      const [updatedUser] = await db
        .update(users)
        .set({
          username,
          fullName,
          isAdmin: isAdmin === true,
          isManager: isManager === true,
          isInspector: isInspector === true,
        })
        .where(eq(users.id, parseInt(id)))
        .returning();

      console.log('Updated user:', updatedUser);

      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: 'Error updating user' });
    }
  });

  // Admin: Delete user
  app.delete("/api/admin/users/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Check if user exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(id)))
        .limit(1);

      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Don't allow deleting your own account
      if (existingUser.id === req.user?.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      // Delete the user
      await db
        .delete(users)
        .where(eq(users.id, parseInt(id)));

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: 'Error deleting user' });
    }
  });

  // Get all shifts for a user (now using the getShifts handler)
  app.get("/api/shifts", requireAuth, getShifts);

  // Admin: Get all shifts (also using the same getShifts handler)
  app.get("/api/admin/shifts", requireAdmin, getShifts);

  // Admin: Create shift
  app.post("/api/admin/shifts", requireAdmin, createShift);

  // Admin: Update shift
  app.put("/api/admin/shifts/:id", requireAdmin, updateShift);

  // Admin: Delete shift
  app.delete("/api/admin/shifts/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Check if shift exists
      const [existingShift] = await db
        .select()
        .from(shifts)
        .where(eq(shifts.id, parseInt(id)))
        .limit(1);

      if (!existingShift) {
        return res.status(404).json({ message: "Shift not found" });
      }

      await db
        .delete(shifts)
        .where(eq(shifts.id, parseInt(id)));

      res.json({ message: "Shift deleted successfully" });
    } catch (error) {
      console.error('Error deleting shift:', error);
      res.status(500).json({ message: 'Error deleting shift' });
    }
  });

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

  // Admin: Update role
  app.put("/api/admin/roles/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      // Verify role exists
      const [existingRole] = await db
        .select()
        .from(roles)
        .where(eq(roles.id, parseInt(id)))
        .limit(1);

      if (!existingRole) {
        return res.status(404).json({ message: "Role not found" });
      }

      // Update the role
      const [updatedRole] = await db
        .update(roles)
        .set({
          name,
          description,
        })
        .where(eq(roles.id, parseInt(id)))
        .returning();

      res.json(updatedRole);
    } catch (error) {
      console.error('Error updating role:', error);
      res.status(500).json({ message: 'Error updating role' });
    }
  });

  // Admin: Delete role
  app.delete("/api/admin/roles/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Check if role exists
      const [existingRole] = await db
        .select()
        .from(roles)
        .where(eq(roles.id, parseInt(id)))
        .limit(1);

      if (!existingRole) {
        return res.status(404).json({ message: "Role not found" });
      }

      // Delete the role
      await db
        .delete(roles)
        .where(eq(roles.id, parseInt(id)));

      res.json({ message: "Role deleted successfully" });
    } catch (error) {
      console.error('Error deleting role:', error);
      res.status(500).json({ message: 'Error deleting role' });
    }
  });


  // Get requests based on user role
  app.get("/api/requests", requireAuth, async (req: Request, res: Response) => {
    try {
      let query = db.select().from(requests);

      // Apply filters based on user role
      if (req.user?.isAdmin) {
        // Admin sees all requests - no filter needed
      } else if (req.user?.isManager) {
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

          // Get shift type details if exists
          let shiftType = null;
          if (request.shiftTypeId) {
            const [shiftTypeData] = await db
              .select()
              .from(shiftTypes)
              .where(eq(shiftTypes.id, request.shiftTypeId))
              .limit(1);
            shiftType = shiftTypeData;
          }

          // Get target shift type details if exists
          let targetShiftType = null;
          if (request.targetShiftTypeId) {
            const [targetShiftTypeData] = await db
              .select()
              .from(shiftTypes)
              .where(eq(shiftTypes.id, request.targetShiftTypeId))
              .limit(1);
            targetShiftType = targetShiftTypeData;
          }

          return {
            ...request,
            requester,
            reviewer,
            manager,
            shiftType,
            targetShiftType
          };
        })
      );

      // Sort requests: PENDING first, then by createdAt date in descending order
      const sortedRequests = requestsWithDetails.sort((a, b) => {
        // First sort by status (PENDING first)
        if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
        if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;

        // Then sort by createdAt date in descending order (most recent first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      res.json(sortedRequests);
    } catch (error) {
      console.error('Error fetching requests:', error);
      res.status(500).json({ message: 'Error fetching requests' });
    }
  });

  // Create a new request (shift swap or leave)
  app.post("/api/requests", requireAuth, async (req: Request, res: Response) => {
    try {
      const { type, shiftTypeId, targetShiftTypeId, startDate, endDate, reason } = req.body;

      if (type === "SHIFT_SWAP" && (!shiftTypeId || !targetShiftTypeId)) {
        return res.status(400).json({ message: "Shift type IDs are required for shift swap requests" });
      }

      if (type === "SHIFT_SWAP") {
        // Verify both shift types exist
        const [currentShiftType, targetShiftType] = await Promise.all([
          db.select().from(shiftTypes).where(eq(shiftTypes.id, shiftTypeId)).limit(1),
          db.select().from(shiftTypes).where(eq(shiftTypes.id, targetShiftTypeId)).limit(1)
        ]);

        if (!currentShiftType[0] || !targetShiftType[0]) {
          return res.status(400).json({ message: "Invalid shift type" });
        }
      }

      const [newRequest] = await db.insert(requests)
        .values({
          requesterId: req.user!.id,
          type,
          shiftTypeId: type === "SHIFT_SWAP" ? shiftTypeId : null,
          targetShiftTypeId: type === "SHIFT_SWAP" ? targetShiftTypeId : null,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          reason,
          status: "PENDING"
        })
        .returning();

      // Include the related shift types in the response
      const requestWithDetails = await db.query.requests.findFirst({
        where: eq(requests.id, newRequest.id),
        with: {
          requester: true,
          shiftType: true,
          targetShiftType: true,
        }
      });

      res.json(requestWithDetails);
    } catch (error) {
      console.error('Error creating request:', error);
      res.status(500).json({ message: 'Error creating request' });
    }
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

  // Admin: Delete shift type
  app.delete("/api/admin/shift-types/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Check if shift type exists
      const [existingShiftType] = await db
        .select()
        .from(shiftTypes)
        .where(eq(shiftTypes.id, parseInt(id)))
        .limit(1);

      if (!existingShiftType) {
        return res.status(404).json({ message: "Shift type not found" });
      }

      await db
        .delete(shiftTypes)
        .where(eq(shiftTypes.id, parseInt(id)));

      res.json({ message: "Shift type deleted successfully" });
    } catch (error) {
      console.error('Error deleting shift type:', error);
      res.status(500).json({ message: 'Error deleting shift type' });
    }
  });

  // Get all tasks (admin only)
  app.get("/api/admin/tasks", requireAdmin, async (req: Request, res: Response) => {
    try {
      const result = await db.query.tasks.findMany({
        with: {
          inspector: true,
          assignedEmployee: true,
          shiftType: true,
          taskType: true
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
      const { inspectorId, shiftTypeId, taskTypeId, status, date, isFollowupNeeded, assignedTo } = req.body;

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

      // Verify that the task type exists
      const [taskType] = await db
        .select()
        .from(taskTypes)
        .where(eq(taskTypes.id, taskTypeId))
        .limit(1);

      if (!taskType) {
        return res.status(400).json({ message: "Invalid task type" });
      }

      const [newTask] = await db
        .insert(tasks)
        .values({
          inspectorId,
          shiftTypeId,
          taskTypeId,
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

  // Admin: Update task
  app.put("/api/admin/tasks/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { inspectorId, shiftTypeId, taskTypeId, status, date, isFollowupNeeded, assignedTo } = req.body;

      // Verify that the task exists
      const [existingTask] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, parseInt(id)))
        .limit(1);

      if (!existingTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Update the task
      const [updatedTask] = await db
        .update(tasks)
        .set({
          inspectorId: parseInt(inspectorId),
          shiftTypeId: parseInt(shiftTypeId),
          taskTypeId: parseInt(taskTypeId),
          status,
          date: new Date(date),
          isFollowupNeeded,
          assignedTo: parseInt(assignedTo),
        })
        .where(eq(tasks.id, parseInt(id)))
        .returning();

      res.json(updatedTask);
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ message: 'Error updating task' });
    }
  });

  // Admin: Delete task
  app.delete("/api/admin/tasks/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Check if task exists
      const [existingTask] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, parseInt(id)))
        .limit(1);

      if (!existingTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      await db
        .delete(tasks)
        .where(eq(tasks.id, parseInt(id)));

      res.json({ message: "Task deleted successfully" });
    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({ message: 'Error deleting task' });
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

  // Get task statistics grouped by shift type
  app.get("/api/admin/tasks/stats", requireAuth, async (req: Request, res: Response) => {
    try {
      const stats = await db.execute(sql`
        WITH task_counts AS (
          SELECT 
            t.shiftTypeId,
            st.name as shiftTypeName,
            COUNT(*) as total,
            COUNT(CASE WHEN t.status = 'PENDING' THEN 1 END) as pending,
            COUNT(CASE WHEN t.status = 'IN_PROGRESS' THEN 1 END) as inProgress,
            COUNT(CASE WHEN t.status ='COMPLETED' THEN 1 END) as completed
          FROM tasks t
          JOIN shiftTypes st ON t.shiftTypeId = st.id
          GROUP BY t.shiftTypeId, st.name
        )
        SELECT 
          shiftTypeId,
          shiftTypeName,
          total,
          pending,
          inProgress,
          completed
        FROM task_counts
        ORDER BY shiftTypeName
      `);

      res.json(stats.rows);
    } catch (error) {
      console.error('Error fetching task statistics:', error);
      res.status(500).json({ message: 'Error fetching task statistics' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}