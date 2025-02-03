import { Request, Response } from "express";
import { eq } from "drizzle-orm";
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
        building: {
          id: buildings.id,
          name: buildings.name,
          code: buildings.code,
          area: buildings.area,
        },
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

    const { startTime, endTime, buildingId, ...rest } = req.body;

    // Ensure dates are properly parsed
    const parsedStartTime = new Date(startTime);
    const parsedEndTime = new Date(endTime);

    // Validate dates
    if (isNaN(parsedStartTime.getTime()) || isNaN(parsedEndTime.getTime())) {
      return res.status(400).send("Invalid date format");
    }

    // Validate building exists
    const [building] = await db
      .select()
      .from(buildings)
      .where(eq(buildings.id, buildingId))
      .limit(1);

    if (!building) {
      return res.status(400).send("Invalid building ID");
    }

    const [shift] = await db
      .insert(shifts)
      .values({
        ...rest,
        buildingId,
        startTime: parsedStartTime,
        endTime: parsedEndTime,
        createdBy: req.user.id,
      })
      .returning();

    // Get inspector details for notification
    const [inspector] = await db
      .select()
      .from(users)
      .where(eq(users.id, shift.inspectorId))
      .limit(1);

    // Get role details
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
      startTime: parsedStartTime,
      endTime: parsedEndTime,
      role: role.name,
    });

    // If there's a backup inspector, notify them too
    if (shift.backupId) {
      const [backup] = await db
        .select()
        .from(users)
        .where(eq(users.id, shift.backupId))
        .limit(1);

      await NotificationService.notifyShiftAssignment({
        userId: backup.id,
        userEmail: backup.username,
        shiftId: shift.id,
        startTime: parsedStartTime,
        endTime: parsedEndTime,
        role: `Backup ${role.name}`,
      });
    }

    res.json(shift);
  } catch (error) {
    console.error('Error creating shift:', error);
    res.status(500).send((error as Error).message);
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