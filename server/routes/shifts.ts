import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "@db";
import { shifts, users, roles } from "@db/schema";
import { NotificationService } from "../services/notification";

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

    // Get role details
    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, shift.roleId))
      .limit(1);

    // Notify assigned inspector
    await NotificationService.notifyShiftAssignment({
      userId: inspector.id,
      userEmail: inspector.username, // Assuming username is email
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