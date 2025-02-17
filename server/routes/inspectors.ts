import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "@db";
import { users } from "@db/schema";

export async function getInspectors(req: Request, res: Response) {
  try {
    const inspectors = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        username: users.username,
      })
      .from(users)
      .where(eq(users.isInspector, true));

    res.json(inspectors);
  } catch (error) {
    console.error("Error fetching inspectors:", error);
    res.status(500).json({ message: "Error fetching inspectors" });
  }
}

export default {
  getInspectors,
};
