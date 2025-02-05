import { Request, Response } from "express";
import { eq, and, or } from "drizzle-orm";
import { db } from "@db";
import { shifts, users, roles, shiftTypes, buildings } from "@db/schema";
import { NotificationService } from "server/services/notification";

export async function getShifts(req: Request, res: Response) {
  try {
    const query = db
      .select({
        id: shifts.id,
        inspectorId: shifts.inspectorId,
        roleId: shifts.roleId,
        shiftTypeId: shifts.shiftTypeId,
        buildingId: shifts.buildingId,
        week: shifts.week,
        backupId: shifts.backupId,
        status: shifts.status,
        rejectionReason: shifts.rejectionReason,
        responseAt: shifts.responseAt,
        inspector: {
          id: users.id,
          fullName: users.fullName,
          username: users.username,
        },
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
        building: buildings ? {
          id: buildings.id,
          name: buildings.name,
          code: buildings.code,
          area: buildings.area,
        } : null,
      })
      .from(shifts)
      .leftJoin(users, eq(shifts.inspectorId, users.id))
      .leftJoin(roles, eq(shifts.roleId, roles.id))
      .leftJoin(shiftTypes, eq(shifts.shiftTypeId, shiftTypes.id))
      .leftJoin(buildings, eq(shifts.buildingId, buildings.id));

    // If not admin, only show user's shifts
    if (!req.user?.isAdmin) {
      query.where(eq(shifts.inspectorId, req.user!.id));
    }

    const shiftsData = await query;

    // Get backup inspector details in a separate query
    const shiftsWithBackup = await Promise.all(
      shiftsData.map(async (shift) => {
        if (shift.backupId) {
          const [backup] = await db
            .select({
              id: users.id,
              fullName: users.fullName,
              username: users.username,
            })
            .from(users)
            .where(eq(users.id, shift.backupId))
            .limit(1);
          return { ...shift, backup };
        }
        return { ...shift, backup: null };
      })
    );

    res.json(shiftsWithBackup);
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

    const { inspectorId, roleId, shiftTypeId, buildingId, week, backupId } = req.body;

    // Validate required fields
    if (!inspectorId || !roleId || !shiftTypeId || !buildingId || !week) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if inspector exists
    const [inspector] = await db
      .select()
      .from(users)
      .where(eq(users.id, inspectorId))
      .limit(1);

    if (!inspector) {
      return res.status(400).json({ message: "Invalid inspector ID" });
    }

    // Create shift with PENDING status
    const [shift] = await db
      .insert(shifts)
      .values({
        inspectorId,
        roleId,
        shiftTypeId,
        buildingId,
        week,
        backupId,
        status: 'PENDING',
        createdBy: req.user.id,
      })
      .returning();

    // Get role details for notification
    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, shift.roleId))
      .limit(1);

    // Notify assigned inspector
    await NotificationService.notifyShiftAssignment({
      userId: inspector.id,
      userEmail: inspector.username,
      shiftId: shift.id,
      role: role.name,
    });

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

    res.json(shift);
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
        // Check for existing shifts of the same type in the same week
        const existingShifts = await db
          .select()
          .from(shifts)
          .where(
            and(
              eq(shifts.inspectorId, inspector.id),
              eq(shifts.week, week),
              eq(shifts.shiftTypeId, shiftTypeId),
              // Consider both ACCEPTED and PENDING shifts as conflicts
              or(
                eq(shifts.status, 'ACCEPTED'),
                eq(shifts.status, 'PENDING')
              )
            )
          );

        const hasConflictingShift = existingShifts.length > 0;

        // Get shift type details for better error message
        let shiftTypeName = '';
        if (hasConflictingShift) {
          const [shiftType] = await db
            .select()
            .from(shiftTypes)
            .where(eq(shiftTypes.id, shiftTypeId))
            .limit(1);
          shiftTypeName = shiftType?.name || 'Unknown shift type';
        }

        const availability = {
          isAvailable: !hasConflictingShift,
          reason: hasConflictingShift
            ? `Already assigned to ${shiftTypeName} in week ${week}`
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