import nodemailer from "nodemailer";
import { db } from "@db";
import { notifications, type InsertNotification } from "@db/schema";

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
    // Create in-app notification
    await this.createNotification({
      userId,
      type: 'SHIFT_ASSIGNED',
      title: 'New Shift Assignment',
      message: `You have been assigned to a new shift as ${role}`,
      metadata: { shiftId },
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
}
