import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "@db";
import { shifts, users, roles, shiftTypes } from "@db/schema";
import { sendShiftAssignmentEmail } from "../utils/email";

export async function getShifts(req: Request, res: Response) {
  try {
    const query = db
      .select({
        id: shifts.id,
        inspectorId: shifts.inspectorId,
        roleId: shifts.roleId,
        shiftTypeId: shifts.shiftTypeId,
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
      })
      .from(shifts)
      .leftJoin(users, eq(shifts.inspectorId, users.id))
      .leftJoin(roles, eq(shifts.roleId, roles.id))
      .leftJoin(shiftTypes, eq(shifts.shiftTypeId, shiftTypes.id));

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

    const { startTime, endTime, ...rest } = req.body;

    // Ensure dates are properly parsed
    const parsedStartTime = new Date(startTime);
    const parsedEndTime = new Date(endTime);

    // Validate dates
    if (isNaN(parsedStartTime.getTime()) || isNaN(parsedEndTime.getTime())) {
      return res.status(400).send("Invalid date format");
    }

    const [shift] = await db
      .insert(shifts)
      .values({
        ...rest,
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

    // Get shift type details for the email
    const [shiftType] = await db
      .select()
      .from(shiftTypes)
      .where(eq(shiftTypes.id, shift.shiftTypeId))
      .limit(1);

    // Send email notification to the assigned inspector
    await sendShiftAssignmentEmail(inspector.username, {
      shiftType,
      week: shift.week,
    });

    // If there's a backup inspector, notify them too
    if (shift.backupId) {
      const [backup] = await db
        .select()
        .from(users)
        .where(eq(users.id, shift.backupId))
        .limit(1);

      await sendShiftAssignmentEmail(backup.username, {
        shiftType,
        week: shift.week,
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
    const { inspectorId, roleId, shiftTypeId, week, backupId } = req.body;

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

    // Update the shift
    const [updatedShift] = await db
      .update(shifts)
      .set({
        inspectorId,
        roleId,
        shiftTypeId,
        week,
        backupId,
      })
      .where(eq(shifts.id, parseInt(id)))
      .returning();

    // If inspector was changed, send notification to new inspector
    if (inspectorId !== existingShift.inspectorId) {
      const [newInspector] = await db
        .select()
        .from(users)
        .where(eq(users.id, inspectorId))
        .limit(1);

      await sendShiftAssignmentEmail(newInspector.username, {
        shiftType,
        week: updatedShift.week,
      });
    }

    // If backup was changed, send notification to new backup
    if (backupId && backupId !== existingShift.backupId) {
      const [newBackup] = await db
        .select()
        .from(users)
        .where(eq(users.id, backupId))
        .limit(1);

      await sendShiftAssignmentEmail(newBackup.username, {
        shiftType,
        week: updatedShift.week,
      });
    }

    res.json(updatedShift);
  } catch (error) {
    console.error('Error updating shift:', error);
    res.status(500).send((error as Error).message);
  }
}