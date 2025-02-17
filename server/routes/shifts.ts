import { Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@db";
import { 
  shifts, 
  users, 
  roles, 
  shiftTypes, 
  buildings, 
  shiftInspectors,
  shiftDays 
} from "@db/schema";

export async function getShifts(req: Request, res: Response) {
  try {
    const query = db
      .select({
        id: shifts.id,
        roleId: shifts.roleId,
        buildingId: shifts.buildingId,
        week: shifts.week,
        groupName: shifts.groupName,
        status: shifts.status,
        rejectionReason: shifts.rejectionReason,
        responseAt: shifts.responseAt,
        role: {
          id: roles.id,
          name: roles.name,
        },
        building: {
          id: buildings.id,
          name: buildings.name,
          code: buildings.code,
          area: buildings.area,
        },
      })
      .from(shifts)
      .leftJoin(roles, eq(shifts.roleId, roles.id))
      .leftJoin(buildings, eq(shifts.buildingId, buildings.id));

    // If not admin, only show user's shifts
    if (!req.user?.isAdmin) {
      const userShifts = await db
        .select({ shiftId: shiftInspectors.shiftId })
        .from(shiftInspectors)
        .where(eq(shiftInspectors.inspectorId, req.user!.id));

      const shiftIds = userShifts.map(s => s.shiftId);
      if (shiftIds.length > 0) {
        query.where(and(shifts.id.in(shiftIds)));
      } else {
        return res.json([]); // Return empty if user has no shifts
      }
    }

    const shiftsData = await query;

    // Get inspectors and daily assignments for each shift
    const shiftsWithDetails = await Promise.all(
      shiftsData.map(async (shift) => {
        // Get all inspectors for this shift
        const shiftInspectorsData = await db
          .select({
            inspector: {
              id: users.id,
              fullName: users.fullName,
              username: users.username,
            },
            isPrimary: shiftInspectors.isPrimary,
          })
          .from(shiftInspectors)
          .leftJoin(users, eq(shiftInspectors.inspectorId, users.id))
          .where(eq(shiftInspectors.shiftId, shift.id));

        // Get daily assignments
        const dailyAssignments = await db
          .select({
            id: shiftDays.id,
            dayOfWeek: shiftDays.dayOfWeek,
            shiftType: {
              id: shiftTypes.id,
              name: shiftTypes.name,
              startTime: shiftTypes.startTime,
              endTime: shiftTypes.endTime,
            },
          })
          .from(shiftDays)
          .leftJoin(shiftTypes, eq(shiftDays.shiftTypeId, shiftTypes.id))
          .where(eq(shiftDays.shiftId, shift.id));

        return {
          ...shift,
          inspectors: shiftInspectorsData,
          days: dailyAssignments,
        };
      })
    );

    res.json(shiftsWithDetails);
  } catch (error) {
    console.error('Error fetching shifts:', error);
    res.status(500).send((error as Error).message);
  }
}

export async function createShift(req: Request, res: Response) {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).send("Not authorized - Admin access required");
    }

    const { 
      inspectors, 
      roleId, 
      buildingId, 
      week, 
      groupName,
      dailyAssignments 
    } = req.body;

    // Validate required fields
    if (!inspectors?.length || !roleId || !buildingId || !week || !groupName || !dailyAssignments?.length) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Start a transaction
    const result = await db.transaction(async (tx) => {
      // Create shift
      const [shift] = await tx
        .insert(shifts)
        .values({
          roleId,
          buildingId,
          week,
          groupName,
          status: 'PENDING',
          createdBy: req.user!.id,
        })
        .returning();

      // Add inspectors
      await Promise.all(
        inspectors.map(async (inspector: { id: number, isPrimary: boolean }) => {
          await tx.insert(shiftInspectors).values({
            shiftId: shift.id,
            inspectorId: inspector.id,
            isPrimary: inspector.isPrimary,
          });
        })
      );

      // Add daily assignments
      await Promise.all(
        dailyAssignments.map(async (assignment: { dayOfWeek: number, shiftTypeId: number }) => {
          await tx.insert(shiftDays).values({
            shiftId: shift.id,
            dayOfWeek: assignment.dayOfWeek,
            shiftTypeId: assignment.shiftTypeId,
          });
        })
      );

      return shift;
    });

    // Get complete shift details with relationships
    const completeShift = await db.query.shifts.findFirst({
      where: eq(shifts.id, result.id),
      with: {
        inspectors: {
          with: {
            inspector: true,
          },
        },
        days: {
          with: {
            shiftType: true,
          },
        },
        role: true,
        building: true,
      },
    });

    res.json(completeShift);
  } catch (error) {
    console.error('Error creating shift:', error);
    res.status(500).json({ message: "Error creating shift" });
  }
}

export async function handleShiftResponse(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { action, rejectionReason } = req.body;

    if (!['ACCEPT', 'REJECT'].includes(action)) {
      return res.status(400).json({ message: "Invalid action. Must be ACCEPT or REJECT" });
    }

    // Get the shift and verify it exists and belongs to the current inspector
    const [shift] = await db
      .select()
      .from(shifts)
      .where(
        and(
          eq(shifts.id, parseInt(id)),
          eq(shifts.inspectorId, req.user!.id)
        )
      )
      .limit(1);

    if (!shift) {
      return res.status(404).json({ message: "Shift not found or you're not authorized" });
    }

    if (shift.status !== 'PENDING') {
      return res.status(400).json({ message: "Shift has already been processed" });
    }

    if (action === 'REJECT' && !rejectionReason) {
      return res.status(400).json({ message: "Rejection reason is required" });
    }

    // Update the shift status based on the action
    const [updatedShift] = await db
      .update(shifts)
      .set({
        status: action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED',
        responseAt: new Date(),
        rejectionReason: action === 'REJECT' ? rejectionReason : null,
      })
      .where(eq(shifts.id, parseInt(id)))
      .returning();

    res.json(updatedShift);
  } catch (error) {
    console.error("Error processing shift response:", error);
    res.status(500).json({ message: "Error processing shift response" });
  }
}

export async function updateShift(req: Request, res: Response) {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).send("Not authorized - Admin access required");
    }

    const { id } = req.params;
    const { inspectorId, roleId, shiftTypeId, buildingId, week, backupId } = req.body;

    // Validate that the shift exists
    const [existingShift] = await db
      .select()
      .from(shifts)
      .where(eq(shifts.id, parseInt(id)))
      .limit(1);

    if (!existingShift) {
      return res.status(404).send("Shift not found");
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

    // Validate building exists
    const [building] = await db
      .select()
      .from(buildings)
      .where(eq(buildings.id, buildingId))
      .limit(1);

    if (!building) {
      return res.status(400).json({ message: "Invalid building ID" });
    }

    // Update the shift
    const [updatedShift] = await db
      .update(shifts)
      .set({
        inspectorId,
        roleId,
        shiftTypeId,
        buildingId,
        week,
        backupId,
      })
      .where(eq(shifts.id, parseInt(id)))
      .returning();

    res.json(updatedShift);
  } catch (error) {
    console.error('Error updating shift:', error);
    res.status(500).send((error as Error).message);
  }
}

export async function getInspectorsByShiftType(req: Request, res: Response) {
  try {
    // Get the shift type ID and week from query params
    const shiftTypeId = req.query.shiftTypeId ? parseInt(req.query.shiftTypeId as string) : null;
    const week = req.query.week as string;

    if (!shiftTypeId || !week) {
      return res.status(400).json({ message: "Both shift type ID and week are required" });
    }

    // Get all inspectors
    const inspectors = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        username: users.username,
      })
      .from(users)
      .where(eq(users.isInspector, true));

    // For each inspector, check if they have any conflicting shifts in the given week
    const inspectorsWithAvailability = await Promise.all(
      inspectors.map(async (inspector) => {
        // Find shifts for this inspector in the given week
        const existingShifts = await db
          .select({
            shiftId: shifts.id,
            shiftTypeId: shifts.shiftTypeId,
          })
          .from(shifts)
          .innerJoin(shiftInspectors, eq(shifts.id, shiftInspectors.shiftId))
          .where(
            and(
              eq(shiftInspectors.inspectorId, inspector.id),
              eq(shifts.week, week),
              eq(shifts.status, 'ACCEPTED')
            )
          );

        // Check if any of the existing shifts are of the same type
        const hasConflictingShift = existingShifts.some(
          shift => shift.shiftTypeId === shiftTypeId
        );

        return {
          ...inspector,
          availability: {
            isAvailable: !hasConflictingShift,
            reason: hasConflictingShift
              ? `Already assigned to a shift in week ${week}`
              : undefined
          }
        };
      })
    );

    res.json(inspectorsWithAvailability);
  } catch (error) {
    console.error("Error fetching inspectors availability:", error);
    res.status(500).json({ message: "Error fetching inspectors" });
  }
}

export async function getInspectorsByShiftTypeForTask(req: Request, res: Response) {
  try {
    const shiftTypeId = req.query.shiftTypeId ? parseInt(req.query.shiftTypeId as string) : null;

    if (!shiftTypeId) {
      return res.status(400).json({ message: "Shift type ID is required" });
    }

    // Get all inspectors who have shifts of this type and are accepted
    const inspectorsWithShifts = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        username: users.username,
      })
      .from(shifts)
      .leftJoin(users, eq(shifts.inspectorId, users.id))
      .where(
        and(
          eq(shifts.shiftTypeId, shiftTypeId),
          eq(shifts.status, 'ACCEPTED')
        )
      )
      .groupBy(users.id, users.fullName, users.username);

    res.json(inspectorsWithShifts);
  } catch (error) {
    console.error("Error fetching inspectors by shift type:", error);
    res.status(500).json({ message: "Error fetching inspectors" });
  }
}

export async function updateShiftInspectors(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { inspectors } = req.body;

    if (!Array.isArray(inspectors)) {
      return res.status(400).json({ message: "Inspectors must be an array" });
    }

    // Start a transaction
    const result = await db.transaction(async (tx) => {
      // First, delete existing inspector assignments for this shift
      await tx
        .delete(shiftInspectors)
        .where(eq(shiftInspectors.shiftId, parseInt(id)));

      // Then, insert new inspector assignments
      await Promise.all(
        inspectors.map(async (inspector: { id: number; isPrimary: boolean }) => {
          await tx
            .insert(shiftInspectors)
            .values({
              shiftId: parseInt(id),
              inspectorId: inspector.id,
              isPrimary: inspector.isPrimary,
            });
        })
      );

      // Return the updated shift with its inspectors
      const updatedShift = await tx
        .select({
          id: shifts.id,
          inspectors: {
            inspector: {
              id: users.id,
              fullName: users.fullName,
              username: users.username,
            },
            isPrimary: shiftInspectors.isPrimary,
          },
        })
        .from(shifts)
        .leftJoin(shiftInspectors, eq(shifts.id, shiftInspectors.shiftId))
        .leftJoin(users, eq(shiftInspectors.inspectorId, users.id))
        .where(eq(shifts.id, parseInt(id)));

      return updatedShift;
    });

    res.json(result);
  } catch (error) {
    console.error("Error updating shift inspectors:", error);
    res.status(500).json({ 
      message: "Error updating shift inspectors",
      error: error instanceof Error ? error.message : "Unknown error" 
    });
  }
}

export async function updateShiftDay(req: Request, res: Response) {
  try {
    const { id, dayOfWeek } = req.params;
    const { shiftTypeId } = req.body;

    // Validate parameters
    if (!id || dayOfWeek === undefined || !shiftTypeId) {
      return res.status(400).json({ 
        message: "Missing required parameters",
        error: "Shift ID, day of week, and shift type ID are required" 
      });
    }

    // Start a transaction
    const result = await db.transaction(async (tx) => {
      // Delete existing day assignment if any
      await tx
        .delete(shiftDays)
        .where(
          and(
            eq(shiftDays.shiftId, parseInt(id)),
            eq(shiftDays.dayOfWeek, parseInt(dayOfWeek))
          )
        );

      // Insert new day assignment
      const [newDay] = await tx
        .insert(shiftDays)
        .values({
          shiftId: parseInt(id),
          dayOfWeek: parseInt(dayOfWeek),
          shiftTypeId: parseInt(shiftTypeId),
        })
        .returning();

      return newDay;
    });

    res.json(result);
  } catch (error) {
    console.error("Error updating shift day:", error);
    res.status(500).json({ 
      message: "Error updating shift day",
      error: error instanceof Error ? error.message : "Unknown error" 
    });
  }
}

export default {
  getShifts,
  createShift,
  handleShiftResponse,
  updateShift,
  getInspectorsByShiftType,
  getInspectorsByShiftTypeForTask,
  updateShiftInspectors,
  updateShiftDay,
};