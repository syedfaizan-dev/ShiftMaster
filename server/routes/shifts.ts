import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "@db";
import { shifts, users, roles, shiftTypes } from "@db/schema";
import { sendShiftAssignmentEmail, sendEmail } from "../utils/email";

// Test route for email functionality
export async function testEmail(req: Request, res: Response) {
  try {
    console.log('Testing email functionality...');

    const result = await sendEmail({
      to: req.query.email as string || process.env.SMTP_USER,
      subject: 'Test Email from Workforce Management System',
      text: 'This is a test email to verify the email sending functionality.',
      html: '<h1>Test Email</h1><p>This is a test email to verify the email sending functionality.</p>'
    });

    if (result) {
      console.log('Test email sent successfully');
      res.json({ success: true, message: 'Test email sent successfully' });
    } else {
      console.log('Failed to send test email');
      res.status(500).json({ success: false, message: 'Failed to send test email' });
    }
  } catch (error) {
    console.error('Error in test email route:', error);
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Unknown error' });
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

    console.log('Creating new shift with data:', {
      ...rest,
      startTime: parsedStartTime,
      endTime: parsedEndTime,
      createdBy: req.user.id,
    });

    const [shift] = await db
      .insert(shifts)
      .values({
        ...rest,
        startTime: parsedStartTime,
        endTime: parsedEndTime,
        createdBy: req.user.id,
      })
      .returning();

    console.log('Shift created successfully:', shift);

    // Get inspector details for notification
    const [inspector] = await db
      .select()
      .from(users)
      .where(eq(users.id, shift.inspectorId))
      .limit(1);

    console.log('Found inspector:', inspector);

    // Get shift type details for the email
    const [shiftType] = await db
      .select()
      .from(shiftTypes)
      .where(eq(shiftTypes.id, shift.shiftTypeId))
      .limit(1);

    console.log('Found shift type:', shiftType);

    // Send email notification to the assigned inspector
    const emailSent = await sendShiftAssignmentEmail(inspector.username, {
      shiftType,
      week: shift.week,
    });

    console.log('Email notification result:', { sent: emailSent, to: inspector.username });

    // If there's a backup inspector, notify them too
    if (shift.backupId) {
      const [backup] = await db
        .select()
        .from(users)
        .where(eq(users.id, shift.backupId))
        .limit(1);

      const backupEmailSent = await sendShiftAssignmentEmail(backup.username, {
        shiftType,
        week: shift.week,
      });

      console.log('Backup email notification result:', { sent: backupEmailSent, to: backup.username });
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