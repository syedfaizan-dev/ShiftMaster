import nodemailer from "nodemailer";
import { db } from "@db";
import { notifications, type InsertNotification, shifts } from "@db/schema";
import { eq } from "drizzle-orm";

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export class NotificationService {
  static async createNotification(data: InsertNotification) {
    const [notification] = await db
      .insert(notifications)
      .values(data)
      .returning();
    return notification;
  }

  static async sendEmail({
    to,
    subject,
    html,
  }: {
    to: string;
    subject: string;
    html: string;
  }) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Workforce Manager" <no-reply@example.com>',
        to,
        subject,
        html,
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      // Don't throw, we don't want to break the flow if email fails
    }
  }

  static async notifyShiftAssignment({
    userId,
    userEmail,
    shiftId,
    startTime,
    endTime,
    role,
  }: {
    userId: number;
    userEmail: string;
    shiftId: number;
    startTime: Date;
    endTime: Date;
    role: string;
  }) {
    // Create in-app notification with detailed metadata
    await this.createNotification({
      userId,
      type: 'SHIFT_ASSIGNED',
      title: 'New Shift Assignment',
      message: `You have been assigned to a new shift as ${role}`,
      metadata: {
        shiftId,
        type: 'shift_assignment',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        role
      },
    });

    // Send email notification
    const emailHtml = `
      <h2>New Shift Assignment</h2>
      <p>You have been assigned to a new shift:</p>
      <ul>
        <li>Role: ${role}</li>
        <li>Start: ${startTime.toLocaleString()}</li>
        <li>End: ${endTime.toLocaleString()}</li>
      </ul>
      <p>Please log in to the system to view more details.</p>
    `;

    await this.sendEmail({
      to: userEmail,
      subject: 'New Shift Assignment',
      html: emailHtml,
    });
  }

  static async notifyShiftChange({
    userId,
    userEmail,
    shiftId,
    type,
    details,
  }: {
    userId: number;
    userEmail: string;
    shiftId: number;
    type: 'update' | 'delete';
    details: Record<string, any>;
  }) {
    // First verify if the user is assigned to this shift
    const [userShift] = await db
      .select()
      .from(shifts)
      .where(eq(shifts.id, shiftId))
      .limit(1);

    if (!userShift || (userShift.inspectorId !== userId && userShift.backupId !== userId)) {
      console.log(`User ${userId} not associated with shift ${shiftId}, skipping notification`);
      return;
    }

    // Create in-app notification
    await this.createNotification({
      userId,
      type: `SHIFT_${type.toUpperCase()}`,
      title: `Shift ${type === 'update' ? 'Updated' : 'Deleted'}`,
      message: `Your shift has been ${type === 'update' ? 'modified' : 'removed'}`,
      metadata: {
        shiftId,
        type: `shift_${type}`,
        ...details
      },
    });

    // Send email notification
    const emailHtml = `
      <h2>Shift ${type === 'update' ? 'Update' : 'Cancellation'}</h2>
      <p>Your shift has been ${type === 'update' ? 'modified' : 'cancelled'}.</p>
      ${Object.entries(details).map(([key, value]) => `<p>${key}: ${value}</p>`).join('')}
      <p>Please log in to the system to view more details.</p>
    `;

    await this.sendEmail({
      to: userEmail,
      subject: `Shift ${type === 'update' ? 'Update' : 'Cancellation'}`,
      html: emailHtml,
    });
  }
}