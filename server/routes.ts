import { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import {
  shifts,
  users,
  roles,
  requests,
  shiftTypes,
  tasks,
  taskTypes,
  buildings,
  agencies, // Added import for agencies table
} from "@db/schema";
import { eq, and, or, isNull } from "drizzle-orm";
import {
  getNotifications,
  markNotificationAsRead,
} from "./routes/notifications";
import {
  getShifts,
  createShift,
  handleShiftResponse,
  updateShift,
  getInspectorsByShiftType, // Add this import
} from "./routes/shifts";
import { sql } from "drizzle-orm";


const updateShift = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { inspectorId, roleId, shiftTypeId, week, backupId } = req.body;

    const [existingShift] = await db
      .select()
      .from(shifts)
      .where(eq(shifts.id, parseInt(id)))
      .limit(1);

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

    const [updatedShift] = await db
      .update(shifts)
      .set({
        inspectorId,
        roleId,
        shiftTypeId,
        week,
        backupId,
        updatedBy: req.user!.id,
      })
      .where(eq(shifts.id, parseInt(id)))
      .returning();

    res.json(updatedShift);
  } catch (error) {
    console.error("Error updating shift:", error);
    res.status(500).json({ message: "Error updating shift" });
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
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Error fetching users" });
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
      console.error("Error fetching roles:", error);
      res.status(500).json({ message: "Error fetching roles" });
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
  app.get(
    "/api/admin/managers",
    requireAdmin,
    async (req: Request, res: Response) => {
      const managers = await db
        .select()
        .from(users)
        .where(eq(users.isManager, true));
      res.json(managers);
    },
  );

  // Get all inspectors
  app.get(
    "/api/admin/inspectors",
    requireAdmin,
    async (req: Request, res: Response) => {
      try {
        const inspectors = await db
          .select({
            id: users.id,
            username: users.username,
            fullName: users.fullName,
          })
          .from(users)
          .where(eq(users.isInspector, true));
        res.json(inspectors);
      } catch (error) {
        console.error("Error fetching inspectors:", error);
        res.status(500).json({ message: "Error fetching inspectors" });
      }
    },
  );

  // Admin: Get all users
  app.get(
    "/api/admin/users",
    requireAdmin,
    async (req: Request, res: Response) => {
      const allUsers = await db.select().from(users);
      res.json(allUsers);
    },
  );

  // Admin: Create user
  app.post(
    "/api/admin/users",
    requireAdmin,
    async (req: Request, res: Response) => {
      try {
        const { username, fullName, password, isInspector, isManager, isAdmin } = req.body;

        // Check for required fields
        if (!username || !fullName || !password) {
          return res.status(400).json({
            message: "Missing required fields",
            error: "Username, full name, and password are required"
          });
        }

        // Check if username already exists
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (existingUser) {
          return res.status(400).json({
            message: "Username already exists",
            error: "This email is already registered. Please use a different email."
          });
        }

        // Create the user with specified role flags
        const [newUser] = await db
          .insert(users)
          .values({
            username,
            fullName,
            password, // Note: In a real app, this should be hashed
            isAdmin: isAdmin === true,
            isManager: isManager === true,
            isInspector: isInspector === true,
          })
          .returning();

        console.log("Created new user:", newUser);

        // Return the user without the password
        const { password: _, ...userWithoutPassword } = newUser;
        res.status(201).json(userWithoutPassword);
      } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({
          message: "Error creating user",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    },
  );

  // Admin: Update user
  app.put(
    "/api/admin/users/:id",
    requireAdmin,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const { username, fullName, isAdmin, isManager, isInspector } =
          req.body;

        console.log("Update user request:", {
          id,
          username,
          fullName,
          isAdmin,
          isManager,
          isInspector,
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

        console.log("Updated user:", updatedUser);

        res.json(updatedUser);
      } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ message: "Error updating user" });
      }
    },
  );

  // Admin: Delete user with related shifts check
  app.delete(
    "/api/admin/users/:id",
    requireAdmin,
    async (req: Request, res: Response) => {
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
          return res
            .status(400)
            .json({ message: "Cannot delete your own account" });
        }

        // Check if user has any associated shifts
        const [userShift] = await db
          .select()
          .from(shifts)
          .where(eq(shifts.inspectorId, parseInt(id)))
          .limit(1);

        if (userShift) {
          return res.status(400).json({
            message:
              "Cannot delete inspector with assigned shifts. Please remove their shifts first.",
          });
        }

        // Delete the user
        await db.delete(users).where(eq(users.id, parseInt(id)));

        res.json({ message: "User deleted successfully" });
      } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({
          message: "Error deleting user",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    },
  );

  // Get all shifts for a user (now using the getShifts handler)
  app.get("/api/shifts", requireAuth, getShifts);

  // Admin: Get all shifts (also using the same getShifts handler)
  app.get("/api/admin/shifts", requireAdmin, getShifts);

  // Admin: Create shift
  app.post("/api/admin/shifts", requireAdmin, createShift);

  // Admin: Update shift
  app.put("/api/admin/shifts/:id", requireAdmin, updateShift);

  // Admin: Delete shift
  app.delete(
    "/api/admin/shifts/:id",
    requireAdmin,
    async (req: Request, res: Response) => {
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

        await db.delete(shifts).where(eq(shifts.id, parseInt(id)));

        res.json({ message: "Shift deleted successfully" });
      } catch (error) {
        console.error("Error deleting shift:", error);
        res.status(500).json({ message: "Error deleting shift" });
      }
    },
  );

  // Handle shift response (accept/reject)
  app.post("/api/shifts/:id/respond", requireAuth, handleShiftResponse);


  // Admin: Get all roles
  app.get(
    "/api/admin/roles",
    requireAdmin,
    async (req: Request, res: Response) => {
      const allRoles = await db.select().from(roles);
      res.json(allRoles);
    },
  );

  // Admin: Create role
  app.post(
    "/api/admin/roles",
    requireAdmin,
    async (req: Request, res: Response) => {
      const { name, description } = req.body;

      const [newRole] = await db
        .insert(roles)
        .values({
          name,
          description,
          createdBy: req.user!.id,
        })
        .returning();

      res.json(newRole);
    },
  );

  // Admin: Update role
  app.put(
    "/api/admin/roles/:id",
    requireAdmin,
    async (req: Request, res: Response) => {
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
        console.error("Error updating role:", error);
        res.status(500).json({ message: "Error updating role" });
      }
    },
  );

  // Admin: Delete role
  app.delete(
    "/api/admin/roles/:id",
    requireAdmin,
    async (req: Request, res: Response) => {
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
        await db.delete(roles).where(eq(roles.id, parseInt(id)));

        res.json({ message: "Role deleted successfully" });
      } catch (error) {
        console.error("Error deleting role:", error);
        res.status(500).json({ message: "Error deleting role" });
      }
    },
  );

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
            targetShiftType,
          };
        }),
      );

      // Sort requests: PENDING first, then by createdAt date in descending order
      const sortedRequests = requestsWithDetails.sort((a, b) => {
        // First sort by status (PENDING first)
        if (a.status === "PENDING" && b.status !== "PENDING") return -1;
        if (a.status !== "PENDING" && b.status === "PENDING") return 1;

        // Then sort by createdAt date in descending order (most recent first)
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });

      res.json(sortedRequests);
    } catch (error) {
      console.error("Error fetching requests:", error);
      res.status(500).json({ message: "Error fetching requests" });
    }
  });

  // Create a new request (shift swap or leave)
  app.post(
    "/api/requests",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const {
          type,
          shiftTypeId,
          targetShiftTypeId,
          startDate,
          endDate,
          reason,
        } = req.body;

        if (type === "SHIFT_SWAP" && (!shiftTypeId || !targetShiftTypeId)) {
          return res
            .status(400)
            .json({
              message: "Shift type IDs are required for shift swap requests",
            });
        }

        if (type === "SHIFT_SWAP") {
          // Verify both shift types exist
          const [currentShiftType, targetShiftType] = await Promise.all([
            db
              .select()
              .from(shiftTypes)
              .where(eq(shiftTypes.id, shiftTypeId))
              .limit(1),
            db
              .select()
              .from(shiftTypes)
              .where(eq(shiftTypes.id, targetShiftTypeId))
              .limit(1),
          ]);

          if (!currentShiftType[0] || !targetShiftType[0]) {
            return res.status(400).json({ message: "Invalid shift type" });
          }
        }

        const [newRequest] = await db
          .insert(requests)
          .values({
            requesterId: req.user!.id,
            type,
            shiftTypeId: type === "SHIFT_SWAP" ? shiftTypeId : null,
            targetShiftTypeId: type === "SHIFT_SWAP" ? targetShiftTypeId : null,
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            reason,
            status: "PENDING",
          })
          .returning();

        // Include the related shift types in the response
        const requestWithDetails = await db.query.requests.findFirst({
          where: eq(requests.id, newRequest.id),
          with: {
            requester: true,
            shiftType: true,
            targetShiftType: true,
          },
        });

        res.json(requestWithDetails);
      } catch (error) {
        console.error("Error creating request:", error);
        res.status(500).json({ message: "Error creating request" });
      }
    },
  );

  // Admin: Assign request to manager
  app.post(
    "/api/admin/requests/:id/assign",
    requireAdmin,
    async (req: Request, res: Response) => {
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
    },
  );

  // Manager/Admin: Review request (approve/reject)
  app.put(
    "/api/admin/requests/:id",
    requireAuth,
    async (req: Request, res: Response) => {
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
    },
  );

  // Get all shift types
  app.get(
    "/api/shift-types",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const allShiftTypes = await db.select().from(shiftTypes);
        res.json(allShiftTypes);
      } catch (error) {
        console.error("Error fetching shift types:", error);
        res.status(500).json({ message: "Error fetching shift types" });
      }
    },
  );

  // Admin: Create shift type
  app.post(
    "/api/admin/shift-types",
    requireAdmin,
    async (req: Request, res: Response) => {
      try {
        const { name, startTime, endTime, description } = req.body;

        const [existingType] = await db
          .select()
          .from(shiftTypes)
          .where(eq(shiftTypes.name, name))
          .limit(1);

        if (existingType) {
          return res
            .status(400)
            .json({ message: "Shift type with this name already exists" });
        }

        const [newShiftType] = await db
          .insert(shiftTypes)
          .values({
            name,
            startTime,
            endTime,
            description,
            createdBy: req.user!.id,
          })
          .returning();

        res.json(newShiftType);
      } catch (error) {
        console.error("Error creating shift type:", error);
        res.status(500).json({ message: "Error creating shift type" });
      }
    },
  );

  // Admin: Update shift type
  app.put(
    "/api/admin/shift-types/:id",
    requireAdmin,
    async (req: Request, res: Response) => {
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
        console.error("Error updating shift type:", error);
        res.status(500).json({ message: "Error updating shift type" });
      }
    },
  );

  // Admin: Delete shift type
  app.delete(
    "/api/admin/shift-types/:id",
    requireAdmin,
    async (req: Request, res: Response) => {
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

        await db.delete(shiftTypes).where(eq(shiftTypes.id, parseInt(id)));

        res.json({ message: "Shift type deleted successfully" });
      } catch (error) {
        console.error("Error deleting shift type:", error);
        res.status(500).json({ message: "Error deleting shift type" });
      }
    },
  );

  // Get all tasks (admin only)
  app.get(
    "/api/admin/tasks",
    requireAdmin,
    async (req: Request, res: Response) => {
      try {
        const result = await db.query.tasks.findMany({
          with: {
            inspector: true,
            assignedAgency: true,
            shiftType: true,
            taskType: true,
          },
        });

        res.json(result || []);
      } catch (error) {
        console.error("Error fetching tasks:", error);
        if (error instanceof Error) {
          console.error("Error details:", {
            message: error.message,
            stack: error.stack,
            name: error.name,
          });
        }
        res.status(500).json({ message: "Error fetching tasks" });
      }
    },
  );

  // Create task (admin only)
  app.post(
    "/api/admin/tasks",
    requireAdmin,
    async (req: Request, res: Response) => {
      try {
        const {
          inspectorId,
          shiftTypeId,
          taskTypeId,
          status,
          date,
          isFollowupNeeded,
          assignedTo,
        } = req.body;

        // Verify that the assigned agency exists
        const [agency] = await db
          .select()
          .from(agencies)
          .where(eq(agencies.id, assignedTo))
          .limit(1);

        if (!agency) {
          return res
            .status(400)
            .json({ message: "Invalid agency assignment." });
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
            createdBy: req.user!.id,
          })
          .returning();

        res.json(newTask);
      } catch (error) {
        console.error("Error creating task:", error);
        res.status(500).json({ message: "Error creating task" });
      }
    },
  );

  // Admin: Update task
  app.put(
    "/api/admin/tasks/:id",
    requireAdmin,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const {
          inspectorId,
          shiftTypeId,
          taskTypeId,
          status,
          date,
          isFollowupNeeded,
          assignedTo,
        } = req.body;

        // Verify that the task exists
        const [existingTask] = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, parseInt(id)))
          .limit(1);

        if (!existingTask) {
          return res.status(404).json({ message: "Task not found" });
        }

        // Verify that the assigned agency exists
        const [agency] = await db
          .select()
          .from(agencies)
          .where(eq(agencies.id, assignedTo))
          .limit(1);

        if (!agency) {
          return res
            .status(400)
            .json({ message: "Invalid agency assignment." });
        }

        const [updatedTask] = await db
          .update(tasks)
          .set({
            inspectorId,
            shiftTypeId,
            taskTypeId,
            status,
            date: new Date(date),
            isFollowupNeeded,
            assignedTo,
          })
          .where(eq(tasks.id, parseInt(id)))
          .returning();

        res.json(updatedTask);
      } catch (error) {
        console.error("Error updating task:", error);
        res.status(500).json({ message: "Error updating task" });
      }
    },
  );

  // Admin: Delete task
  app.delete(
    "/api/admin/tasks/:id",
    requireAdmin,
    async (req: Request, res: Response) => {
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

        await db.delete(tasks).where(eq(tasks.id, parseInt(id)));

        res.json({ message: "Task deleted successfully" });
      } catch (error) {
        console.error("Error deleting task:", error);
        res.status(500).json({ message: "Error deleting task" });
      }
    },
  );

  // Get employees (users who are not admin, manager, or inspector)
  app.get(
    "/api/admin/employees",
    requireAdmin,
    async (req: Request, res: Response) => {
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
              eq(users.isInspector, false),
            ),
          );

        res.json(employees);
      } catch (error) {
        console.error("Error fetching employees:", error);
        res.status(500).json({ message: "Error fetching employees" });
      }
    },
  );

  // Get all admin users
  app.get(
    "/api/admin/admins",
    requireAdmin,
    async (req: Request, res: Response) => {
      try {
        const admins = await db
          .select({
            id: users.id,
            username: users.username,            fullName: users.fullName,
          })
          .from(users)
          .where(eq(users.isAdmin, true));

        res.json(admins);
      } catch (error) {
        console.error("Error fetching admin users:", error);
        res.status(500).json({ message: "Error fetching admin users" });
      }
    },
  );
  app.get("/api/admin-users", requireAuth, async (req: Request, res: Response) => {
    try {
      const adminUsers = await db
        .select({
          id: users.id,
          username: users.username,
          fullName: users.fullName,
        })
        .from(users)
        .where(eq(users.isAdmin, true));

      res.json(adminUsers);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({ 
        message: "Error fetching admin users",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/admin/buildings", requireAuth, async (req: Request, res: Response) => {
    try {
      const buildingList = await db
        .select({
          id: buildings.id,
          name: buildings.name,
          code: buildings.code,
          area: buildings.area,
          supervisorId: buildings.supervisorId,
          createdAt: buildings.createdAt,
          updatedAt: buildings.updatedAt,
          supervisor: {
            id: users.id,
            username: users.username,
            fullName: users.fullName,
          },
        })
        .from(buildings)
        .leftJoin(users, eq(buildings.supervisorId, users.id));

      console.log("Retrieved buildings data:", buildingList); // Debug log
      res.json(buildingList);
    } catch (error) {
      console.error("Error fetching buildings:", error);
      res.status(500).json({ 
        message: "Error fetching buildings", 
        error: error instanceof Error ? error.message : "Unknown error",
        details: error instanceof Error ? error.stack : "No stack trace available"
      });
    }
  });

  // Get inspectorsby shift type
  app.get(
    "/api/admin/shifts/inspectors/:shiftTypeId",
    requireAdmin,
    async (req: Request, res: Response) => {
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
              eq(users.isInspector, true),
            ),
          )
          .groupBy(users.id, users.fullName, users.username);

        res.json(inspectorsInShift);
      } catch (error) {
        console.error("Error fetching inspectors by shift type:", error);
        res.status(500).json({ message: "Error fetching inspectors" });
      }
    },
  );

  // Get all task types
  app.get(
    "/api/task-types",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const allTaskTypes = await db.select().from(taskTypes);
        res.json(allTaskTypes);
      } catch (error) {
        console.error("Error fetching task types:", error);
        res.status(500).json({ message: "Error fetching task types" });
      }
    },
  );

  // Admin: Create task type
  app.post(
    "/api/admin/task-types",
    requireAdmin,
    async (req: Request, res: Response) => {
      try {
        const { name, description } = req.body;

        // Check if task type already exists
        const [existingType] = await db
          .select()
          .from(taskTypes)
          .where(eq(taskTypes.name, name))
          .limit(1);

        if (existingType) {
          return res
            .status(400)
            .json({ message: "Task type with this name already exists" });
        }

        const [newTaskType] = await db
          .insert(taskTypes)
          .values({
            name,
            description,
            createdBy: req.user?.id,
          })
          .returning();

        res.json(newTaskType);
      } catch (error) {
        console.error("Error creating task type:", error);
        res.status(500).json({ message: "Error creating task type" });
      }
    },
  );

  // Admin: Update task type
  app.put(
    "/api/admin/task-types/:id",
    requireAdmin,
    async (req: Request, res: Response) => {
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
        console.error("Error updating task type:", error);
        res.status(500).json({ message: "Error updating task type" });
      }
    },
  );

  // Admin: Delete task type
  app.delete(
    "/api/admin/task-types/:id",
    requireAdmin,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;

        await db.delete(taskTypes).where(eq(taskTypes.id, parseInt(id)));

        res.json({ message: "Task type deleted successfully" });
      } catch (error) {
        console.error("Error deleting task type:", error);
        res.status(500).json({ message: "Error deleting task type" });
      }
    },
  );

  // Get task statistics grouped by shift type
  app.get(
    "/api/admin/tasks/stats",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const stats = await db.execute(sql`
        WITH task_counts AS (
          SELECT 
            t.shift_type_id AS "shiftTypeId",
            st.name AS "shiftTypeName",
            COUNT(*) AS total,
            COUNT(CASE WHEN t.status = 'PENDING' THEN 1 END) AS pending,
            COUNT(CASE WHEN t.status = 'IN_PROGRESS' THEN 1 END) AS "inProgress",
            COUNT(CASE WHEN t.status = 'COMPLETED' THEN 1 END) AS completed
          FROM tasks t
          JOIN shift_types st ON t.shift_type_id = st.id
          GROUP BY t.shift_type_id, st.name
        )
        SELECT 
          "shiftTypeId",
          "shiftTypeName",
          total,
          pending,
          "inProgress",
          completed
        FROM task_counts
        ORDER BY "shiftTypeName"
      `);

        res.json(stats.rows);
      } catch (error) {
        console.error("Error fetching task statistics:", error);
        if (error instanceof Error) {
          console.error("Error details:", {
            message: error.message,
            stack: error.stack,
            name: error.name,
          });
        }
        res.status(500).json({ message: "Error fetching task statistics" });
      }
    },
  );


  app.get("/api/admin/buildings", requireAuth, async (req: Request, res: Response) => {
    try {
      const buildingsData = await db
        .select({
          id: buildings.id,
          name: buildings.name,
          code: buildings.code,
          area: buildings.area,
          supervisorId: buildings.supervisorId,
          createdAt: buildings.createdAt,
          updatedAt: buildings.updatedAt,
          supervisor: {
            id: users.id,
            username: users.username,
            fullName: users.fullName,
          },
        })
        .from(buildings)
        .leftJoin(users, eq(buildings.supervisorId, users.id));

      console.log("Retrieved buildings:", buildingsData); // Add logging
      res.json(buildingsData);
    } catch (error) {
      console.error("Error fetching buildings:", error);
      res.status(500).json({ 
        message: "Error fetching buildings", 
        error: error instanceof Error ? error.message : "Unknown error",
        details: JSON.stringify(error)
      });
    }
  });

  // Create building
  app.post("/api/admin/buildings", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { name, code, area, supervisorId } = req.body;

      if (!supervisorId) {
        return res.status(400).json({
          message: "Supervisor is required",
          error: "Please select a supervisor for this building"
        });
      }

      // Check if building code already exists
      const [existingBuilding] = await db
        .select()
        .from(buildings)
        .where(eq(buildings.code, code))
        .limit(1);

      if (existingBuilding) {
        return res.status(400).json({
          message: "Building code already exists",
          error: `A building with code "${code}" already exists. Please use a different code.`
        });
      }

      // Verify that the supervisor exists and is an admin
      const [supervisor] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, supervisorId), eq(users.isAdmin, true)))
        .limit(1);

      if (!supervisor) {
        return res.status(400).json({
          message: "Invalid supervisor",
          error: "The selected supervisor must be an admin user"
        });
      }

      const [newBuilding] = await db
        .insert(buildings)
        .values({
          name,
          code,
          area: area || '',
          supervisorId,
        })
        .returning();

      // Return the building with supervisor details
      const buildingWithSupervisor = {
        ...newBuilding,
        supervisor: {
          id: supervisor.id,
          username: supervisor.username,
          fullName: supervisor.fullName,
        },
      };

      res.status(201).json(buildingWithSupervisor);
    } catch (error) {
      console.error("Error creating building:", error);
      res.status(500).json({
        message: "Error creating building",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  // Admin: Update building
  app.put("/api/admin/buildings/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, code, area, supervisorId } = req.body;

      if (!supervisorId) {
        return res.status(400).json({
          message: "Supervisor is required",
          error: "Please select a supervisor for this building"
        });
      }

      // Check if building exists
      const [existingBuilding] = await db
        .select()
        .from(buildings)
        .where(eq(buildings.id, parseInt(id)))
        .limit(1);

      if (!existingBuilding) {
        return res.status(404).json({ 
          message: "Building not found",
          error: "The requested building does not exist"
        });
      }

      // Verify that the new supervisor exists and is an admin
      const [supervisor] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, supervisorId), eq(users.isAdmin, true)))
        .limit(1);

      if (!supervisor) {
        return res.status(400).json({
          message: "Invalid supervisor",
          error: "The selected supervisor must be an admin user"
        });
      }

      // Check if code is being changed and if new code already exists
      if (code !== existingBuilding.code) {
        const [buildingWithCode] = await db
          .select()
          .from(buildings)
          .where(eq(buildings.code, code))
          .limit(1);

        if (buildingWithCode) {
          return res.status(400).json({
            message: "Building code already exists",
            error: `A building with code "${code}" already exists. Please use a different code.`
          });
        }
      }

      // Update the building
      const [updatedBuilding] = await db
        .update(buildings)
        .set({
          name,
          code,
          area: area || '',
          supervisorId,
          updatedAt: new Date(),
        })
        .where(eq(buildings.id, parseInt(id)))
        .returning();

      // Return the building with supervisor details
      const buildingWithSupervisor = {
        ...updatedBuilding,
        supervisor: {
          id: supervisor.id,
          username: supervisor.username,
          fullName: supervisor.fullName,
        },
      };

      res.json(buildingWithSupervisor);
    } catch (error) {
      console.error("Error updating building:", error);
      res.status(500).json({
        message: "Error updating building",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Admin: Delete building
  app.delete("/api/admin/buildings/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Check if building exists
      const [existingBuilding] = await db
        .select()
        .from(buildings)
        .where(eq(buildings.id, parseInt(id)))
        .limit(1);

      if (!existingBuilding) {
        return res.status(404).json({
          message: "Building not found",
          error: "The requested building does not exist"
        });
      }

      // Check if building has any associated shifts
      const [shiftWithBuilding] = await db
        .select()
        .from(shifts)
        .where(eq(shifts.buildingId, parseInt(id)))
        .limit(1);

      if (shiftWithBuilding) {
        return res.status(400).json({
          message: "Cannot delete building",
          error: "This building has associated shifts. Please reassign or delete the shifts first."
        });
      }

      // Delete the building
      await db.delete(buildings).where(eq(buildings.id, parseInt(id)));

      res.json({ message: "Building deleted successfully" });
    } catch (error) {
      console.error("Error deleting building:", error);
      res.status(500).json({
        message: "Error deleting building",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  // Add agency routes within the registerRoutes function
  // Admin: Get all agencies
  app.get(
    "/api/admin/agencies",
    requireAdmin,
    async (req: Request, res: Response) => {
      try {
        const allAgencies = await db.select().from(agencies);
        res.json(allAgencies);
      } catch (error) {
        console.error("Error fetching agencies:", error);
        res.status(500).json({ message: "Error fetching agencies" });
      }
    },
  );

  // Admin: Create agency
  app.post(
    "/api/admin/agencies",
    requireAdmin,
    async (req: Request, res: Response) => {
      try {
        const { name, description } = req.body;

        const [existingAgency] = await db
          .select()
          .from(agencies)
          .where(eq(agencies.name, name))
          .limit(1);

        if (existingAgency) {
          return res.status(400).json({ message: "Agency with this name already exists" });
        }

        const [newAgency] = await db
          .insert(agencies)
          .values({
            name,
            description,
            createdBy: req.user!.id,
          })
          .returning();

        res.json(newAgency);
      } catch (error) {
        console.error("Error creating agency:", error);
        res.status(500).json({ message: "Error creating agency" });
      }
    },
  );

  // Admin: Update agency
  app.put(
    "/api/admin/agencies/:id",
    requireAdmin,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const { name, description } = req.body;

        const [existingAgency] = await db
          .select()
          .from(agencies)
          .where(eq(agencies.id, parseInt(id)))
          .limit(1);

        if (!existingAgency) {
          return res.status(404).json({ message: "Agency not found" });
        }

        const [updatedAgency] = await db
          .update(agencies)
          .set({
            name,
            description,
          })
          .where(eq(agencies.id, parseInt(id)))
          .returning();

        res.json(updatedAgency);
      } catch (error) {
        console.error("Error updating agency:", error);
        res.status(500).json({ message: "Error updating agency" });
      }
    },
  );

  // Admin: Delete agency
  app.delete(
    "/api/admin/agencies/:id",
    requireAdmin,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;

        const [existingAgency] = await db
          .select()
          .from(agencies)
          .where(eq(agencies.id, parseInt(id)))
          .limit(1);

        if (!existingAgency) {
          return res.status(404).json({ message: "Agency not found" });
        }

        await db.delete(agencies).where(eq(agencies.id, parseInt(id)));

        res.json({ message: "Agency deleted successfully" });
      } catch (error) {
        console.error("Error deleting agency:", error);
        res.status(500).json({ message: "Error deleting agency" });
      }
    },
  );

  // Get all shifts with status filter
  app.get("/api/shifts", requireAuth, async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      let query = db.select().from(shifts);

      // Filter by status if provided
      if (status) {
        query = query.where(eq(shifts.status, status as string));
      }

      // For non-admin users, only show their own shifts
      if (!req.user?.isAdmin) {
        query = query.where(eq(shifts.inspectorId, req.user!.id));
      }

      const result = await query.orderBy(shifts.createdAt);
      res.json(result);
    } catch (error) {
      console.error("Error fetching shifts:", error);
      res.status(500).json({ message: "Error fetching shifts" });
    }
  });

  // Accept or reject a shift
  app.post(
    "/api/shifts/:id/respond",
    requireAuth,
    handleShiftResponse
  );

  // Get inspectors by shift type
  app.get(
    "/api/admin/shifts/inspectors",
    requireAdmin,
    getInspectorsByShiftType
  );

  const server = createServer(app);
  return server;
}