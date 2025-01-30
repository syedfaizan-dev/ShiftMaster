import { Request, Response } from "express";
import { eq, or, and, desc } from "drizzle-orm";
import { db } from "@db";
import { notifications, shifts } from "@db/schema";

export async function getNotifications(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    // First get notifications that don't have shift metadata (system notifications)
    const systemNotifications = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, req.user.id),
          or(
            eq(notifications.type, 'SYSTEM'),
            eq(notifications.metadata, null)
          )
        )
      );

    // Then get shift-related notifications
    const shiftNotifications = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, req.user.id),
          notifications.metadata.notNull()
        )
      );

    // Filter shift notifications based on user's shifts
    const filteredShiftNotifications = await Promise.all(
      shiftNotifications.map(async (notification) => {
        const metadata = notification.metadata as any;
        if (!metadata?.shiftId) return notification;

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

        return shift ? notification : null;
      })
    );

    // Combine and sort notifications
    const allNotifications = [
      ...systemNotifications,
      ...filteredShiftNotifications.filter(Boolean)
    ].sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    res.json(allNotifications);
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