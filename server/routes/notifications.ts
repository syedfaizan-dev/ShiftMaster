import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "@db";
import { notifications } from "@db/schema";

export async function getNotifications(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, req.user.id))
      .orderBy(notifications.createdAt);

    res.json(userNotifications);
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
