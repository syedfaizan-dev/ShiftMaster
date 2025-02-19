import { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth, requireAuth, requireAdmin } from "./auth";
import { db } from "@db";
import {
  shifts,
  users,
  roles,
  shiftTypes,
  buildings,
  shiftInspectors,
  inspectorGroups,
  shiftDays,
} from "@db/schema";
import { eq, and, or, isNull } from "drizzle-orm";
import {
  getShifts,
  createShift,
  handleShiftInspectorResponse,
} from "./routes/shifts";
import { getBuildingsWithShifts } from "./routes/buildingRoutes";
import { getInspectors } from "./routes/inspectors";

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

  // Get basic user info for authenticated users
  app.get("/api/users", requireAuth, async (req: Request, res: Response) => {
    try {
      const allUsers = await db
        .select({
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          isAdmin: users.isAdmin,
          isManager: users.isManager,
          isInspector: users.isInspector,
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
    getInspectors
  );

  // Shifts routes
  app.get("/api/shifts", requireAuth, getShifts);
  app.get("/api/admin/shifts", requireAdmin, getShifts);
  app.post("/api/admin/shifts", requireAdmin, createShift);
  app.post("/api/shifts/:shiftId/inspector/:inspectorId/respond", requireAuth, handleShiftInspectorResponse);

  // Buildings routes
  app.get("/api/buildings/with-shifts", requireAuth, getBuildingsWithShifts);

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
            createdBy: req.user?.id,
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

  const server = createServer(app);
  return server;
}