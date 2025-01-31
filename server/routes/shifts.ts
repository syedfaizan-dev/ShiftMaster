import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "@db";
import { shifts, users, shiftTypes } from "@db/schema";
import { sendEmail, sendShiftAssignmentEmail } from "../utils/email";

// Simple test endpoint for email
export async function testEmail(req: Request, res: Response) {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ message: 'Email address is required' });
  }

  try {
    const success = await sendEmail(
      email as string,
      'Test Email',
      '<h1>Test Email</h1><p>This is a test email from your workforce management system.</p>'
    );

    if (success) {
      res.json({ message: 'Test email sent successfully' });
    } else {
      res.status(500).json({ message: 'Failed to send test email' });
    }
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ message: 'Error sending test email' });
  }
}

// When creating a new shift, send email notification
export async function createShift(req: Request, res: Response) {
  try {
    const { inspectorId, roleId, shiftTypeId, week, backupId } = req.body;

    // Get shift type details
    const [shiftType] = await db
      .select()
      .from(shiftTypes)
      .where(eq(shiftTypes.id, shiftTypeId))
      .limit(1);

    if (!shiftType) {
      return res.status(400).json({ message: "Invalid shift type" });
    }

    // Create shift
    const [newShift] = await db
      .insert(shifts)
      .values({
        inspectorId,
        roleId,
        shiftTypeId,
        week,
        backupId,
        createdBy: req.user?.id,
      })
      .returning();

    // Send email to inspector
    const [inspector] = await db
      .select()
      .from(users)
      .where(eq(users.id, inspectorId))
      .limit(1);

    await sendShiftAssignmentEmail(inspector.username, {
      shiftType,
      week,
    });

    // Send email to backup if exists
    if (backupId) {
      const [backup] = await db
        .select()
        .from(users)
        .where(eq(users.id, backupId))
        .limit(1);

      await sendShiftAssignmentEmail(backup.username, {
        shiftType,
        week,
      });
    }

    res.json(newShift);
  } catch (error) {
    console.error('Error creating shift:', error);
    res.status(500).json({ message: 'Error creating shift' });
  }
}

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