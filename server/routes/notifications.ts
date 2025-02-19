import { Request, Response } from "express";
import { eq, or, and, desc, isNull } from "drizzle-orm";
import { db } from "@db";
import { notifications, shifts } from "@db/schema";

export async function getNotifications(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    // Get all notifications for the user
    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, req.user.id))
      .orderBy(desc(notifications.createdAt));

    // Filter notifications based on shift assignments
    const filteredNotifications = await Promise.all(
      userNotifications.map(async (notification) => {
        const metadata = notification.metadata as any;

        // If no metadata or no shiftId, include the notification (system notifications)
        if (!metadata || !metadata.shiftId) {
          return notification;
        }

        // Check if user is assigned to this shift
        const [shift] = await db
          .select()
          .from(shifts)
          .where(
            and(
              eq(shifts.id, metadata.shiftId),
              or(
                eq(shifts.inspectorId, req.user!.id),
                eq(shifts.backupId, req.user!.id)
              )
            )
          )
          .limit(1);

        // Only include notification if user is assigned to the shift
        return shift ? notification : null;
      })
    );

    // Remove null values and send response
    const finalNotifications = filteredNotifications.filter(Boolean);
    res.json(finalNotifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).send((error as Error).message);
  }
}

export async function markNotificationAsRead(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    const { id } = req.params;

    // Verify the notification belongs to the user before marking as read
    const [notification] = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.id, parseInt(id)),
          eq(notifications.userId, req.user.id)
        )
      )
      .limit(1);

    if (!notification) {
      return res.status(404).send("Notification not found");
    }

    const [updatedNotification] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, parseInt(id)))
      .returning();

    res.json(updatedNotification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).send((error as Error).message);
  }
}