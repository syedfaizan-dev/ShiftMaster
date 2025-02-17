import { Request, Response } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { db } from "@db";
import { shifts, users, roles, shiftTypes, buildings, shiftInspectors } from "@db/schema";
import { NotificationService } from "server/services/notification";

export async function getShifts(req: Request, res: Response) {
  try {
    const query = db
      .select({
        id: shifts.id,
        roleId: shifts.roleId,
        shiftTypeId: shifts.shiftTypeId,
        buildingId: shifts.buildingId,
        week: shifts.week,
        backupId: shifts.backupId,
        status: shifts.status,
        rejectionReason: shifts.rejectionReason,
        responseAt: shifts.responseAt,
        role: {
          id: roles.id,
          name: roles.name,
        },
        shiftType: {
          id: shiftTypes.id,
          name: shiftTypes.name,
          startTime: shiftTypes.startTime,
          endTime: shiftTypes.endTime,
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
      .leftJoin(shiftTypes, eq(shifts.shiftTypeId, shiftTypes.id))
      .leftJoin(buildings, eq(shifts.buildingId, buildings.id));

    const shiftsData = await query;

    // Get inspectors and backup details
    const shiftsWithDetails = await Promise.all(
      shiftsData.map(async (shift) => {
        // Get assigned inspectors
        const inspectors = await db
          .select({
            id: users.id,
            fullName: users.fullName,
            username: users.username,
            assignedAt: shiftInspectors.assignedAt,
          })
          .from(shiftInspectors)
          .leftJoin(users, eq(shiftInspectors.inspectorId, users.id))
          .where(eq(shiftInspectors.shiftId, shift.id));

        // Get backup inspector if exists
        let backup = null;
        if (shift.backupId) {
          const [backupUser] = await db
            .select({
              id: users.id,
              fullName: users.fullName,
              username: users.username,
            })
            .from(users)
            .where(eq(users.id, shift.backupId))
            .limit(1);
          backup = backupUser;
        }

        return {
          ...shift,
          inspectors,
          backup,
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

    const { inspectorIds, roleId, shiftTypeId, buildingId, week, backupId } = req.body;

    // Validate required fields
    if (!inspectorIds?.length || !roleId || !shiftTypeId || !buildingId || !week) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Verify all inspectors exist
    const inspectors = await db
      .select()
      .from(users)
      .where(inArray(users.id, inspectorIds));

    if (inspectors.length !== inspectorIds.length) {
      return res.status(400).json({ message: "One or more invalid inspector IDs" });
    }

    // Create shift
    const [shift] = await db
      .insert(shifts)
      .values({
        roleId,
        shiftTypeId,
        buildingId,
        week,
        backupId,
        status: 'PENDING',
        createdBy: req.user.id,
      })
      .returning();

    // Assign inspectors
    await db.insert(shiftInspectors).values(
      inspectorIds.map(inspectorId => ({
        shiftId: shift.id,
        inspectorId,
        assignedBy: req.user.id,
      }))
    );

    // Get role details for notification
    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, shift.roleId))
      .limit(1);

    // Notify all assigned inspectors
    await Promise.all(
      inspectors.map(inspector =>
        NotificationService.notifyShiftAssignment({
          userId: inspector.id,
          userEmail: inspector.username,
          shiftId: shift.id,
          role: role.name,
        })
      )
    );

    // If there's a backup inspector, notify them too
    if (shift.backupId) {
      const [backup] = await db
        .select()
        .from(users)
        .where(eq(users.id, shift.backupId))
        .limit(1);

      if (backup) {
        await NotificationService.notifyShiftAssignment({
          userId: backup.id,
          userEmail: backup.username,
          shiftId: shift.id,
          role: `Backup ${role.name}`,
        });
      }
    }

    // Return the created shift with all details
    const createdShift = await getShiftWithDetails(shift.id);
    res.json(createdShift);
  } catch (error) {
    console.error('Error creating shift:', error);
    res.status(500).json({ message: "Error creating shift" });
  }
}

async function getShiftWithDetails(shiftId: number) {
  const [shift] = await db
    .select()
    .from(shifts)
    .where(eq(shifts.id, shiftId))
    .limit(1);

  if (!shift) return null;

  const inspectors = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      username: users.username,
      assignedAt: shiftInspectors.assignedAt,
    })
    .from(shiftInspectors)
    .leftJoin(users, eq(shiftInspectors.inspectorId, users.id))
    .where(eq(shiftInspectors.shiftId, shiftId));

  let backup = null;
  if (shift.backupId) {
    const [backupUser] = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        username: users.username,
      })
      .from(users)
      .where(eq(users.id, shift.backupId))
      .limit(1);
    backup = backupUser;
  }

  return { ...shift, inspectors, backup };
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
          // This condition needs adjustment for multiple inspectors.  Consider if a shift can be rejected by any assigned inspector
          inArray(shifts.inspectorId, (await db.select(shiftInspectors.inspectorId).from(shiftInspectors).where(eq(shiftInspectors.shiftId, parseInt(id)))).map(r=>r.inspectorId))
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
    const { inspectorIds, roleId, shiftTypeId, buildingId, week, backupId } = req.body;

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
        roleId,
        shiftTypeId,
        buildingId,
        week,
        backupId,
      })
      .where(eq(shifts.id, parseInt(id)))
      .returning();

    //Update inspectors.  First delete existing then insert new ones.
    await db.delete(shiftInspectors).where(eq(shiftInspectors.shiftId, parseInt(id)));
    await db.insert(shiftInspectors).values(
      inspectorIds.map(inspectorId => ({
        shiftId: parseInt(id),
        inspectorId,
        assignedBy: req.user.id,
      }))
    );

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
    const week = req.query.week ? parseInt(req.query.week as string) : null;

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
        // Check for existing shifts in the same week
        const existingShifts = await db
          .select()
          .from(shifts)
          .where(
            and(
              inArray(shifts.inspectorId, (await db.select(shiftInspectors.inspectorId).from(shiftInspectors).where(eq(shiftInspectors.inspectorId, inspector.id))).map(r=>r.inspectorId)),
              eq(shifts.week, week),
              eq(shifts.status, 'ACCEPTED')
            )
          );

        // Check if any of the existing shifts are of the same type
        const hasConflictingShift = existingShifts.some(
          shift => shift.shiftTypeId === shiftTypeId
        );

        // If they have a conflicting shift, they're unavailable
        const availability = {
          isAvailable: !hasConflictingShift,
          reason: hasConflictingShift
            ? `Already assigned to ${existingShifts.length} shift(s) in week ${week}`
            : undefined
        };

        return {
          ...inspector,
          availability
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
      .leftJoin(shiftInspectors, eq(shifts.id, shiftInspectors.shiftId))
      .leftJoin(users, eq(shiftInspectors.inspectorId, users.id))
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

// Export all route handlers
export default {
  getShifts,
  createShift,
  handleShiftResponse,
  updateShift,
  getInspectorsByShiftType,
  getInspectorsByShiftTypeForTask,
};