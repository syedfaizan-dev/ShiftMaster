import { db } from "../config/database";
import { users } from "@db/schema";
import { eq, and, not } from "drizzle-orm";
import type { User } from "@db/schema";

class UserRepository {
  async findByUsername(username: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return user || null;
  }

  async findById(id: number): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user || null;
  }

  async create(userData: Omit<User, "id">): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async findAdmins(): Promise<Omit<User, "password">[]> {
    return db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        isAdmin: users.isAdmin,
        isManager: users.isManager,
        isInspector: users.isInspector,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .where(eq(users.isAdmin, true));
  }

  async findManagers(): Promise<Omit<User, "password">[]> {
    return db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        isAdmin: users.isAdmin,
        isManager: users.isManager,
        isInspector: users.isInspector,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .where(eq(users.isManager, true));
  }

  async findInspectors(): Promise<Omit<User, "password">[]> {
    return db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        isAdmin: users.isAdmin,
        isManager: users.isManager,
        isInspector: users.isInspector,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .where(eq(users.isInspector, true));
  }

  async findEmployees(): Promise<Omit<User, "password">[]> {
    return db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        isAdmin: users.isAdmin,
        isManager: users.isManager,
        isInspector: users.isInspector,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .where(
        and(
          eq(users.isAdmin, false),
          eq(users.isManager, false),
          eq(users.isInspector, false)
        )
      );
  }
}

export const userRepository = new UserRepository();