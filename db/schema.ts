import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  fullName: text("full_name").notNull(),
});

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").unique().notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  inspectorId: integer("inspector_id").references(() => users.id).notNull(),
  roleId: integer("role_id").references(() => roles.id).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  week: text("week").notNull(),
  backupId: integer("backup_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

// New tables for request management
export const requests = pgTable("requests", {
  id: serial("id").primaryKey(),
  requesterId: integer("requester_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // 'SHIFT_SWAP', 'LEAVE'
  status: text("status").default('PENDING').notNull(), // 'PENDING', 'APPROVED', 'REJECTED'
  shiftId: integer("shift_id").references(() => shifts.id),
  targetShiftId: integer("target_shift_id").references(() => shifts.id), // For shift swaps
  startDate: timestamp("start_date"), // For leave requests
  endDate: timestamp("end_date"), // For leave requests
  reason: text("reason"),
  reviewerId: integer("reviewer_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  metadata: jsonb("metadata"), // Additional data specific to request type
});

// Define relationships
export const shiftsRelations = relations(shifts, ({ one }) => ({
  inspector: one(users, {
    fields: [shifts.inspectorId],
    references: [users.id],
  }),
  backup: one(users, {
    fields: [shifts.backupId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [shifts.roleId],
    references: [roles.id],
  }),
}));

export const requestsRelations = relations(requests, ({ one }) => ({
  requester: one(users, {
    fields: [requests.requesterId],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [requests.reviewerId],
    references: [users.id],
  }),
  shift: one(shifts, {
    fields: [requests.shiftId],
    references: [shifts.id],
  }),
  targetShift: one(shifts, {
    fields: [requests.targetShiftId],
    references: [shifts.id],
  }),
}));

// Schema exports
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertShiftSchema = createInsertSchema(shifts);
export const selectShiftSchema = createSelectSchema(shifts);
export const insertRoleSchema = createInsertSchema(roles);
export const selectRoleSchema = createSelectSchema(roles);
export const insertRequestSchema = createInsertSchema(requests);
export const selectRequestSchema = createSelectSchema(requests);

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Shift = typeof shifts.$inferSelect;
export type InsertShift = typeof shifts.$inferInsert;
export type Role = typeof roles.$inferSelect;
export type InsertRole = typeof roles.$inferInsert;
export type Request = typeof requests.$inferSelect;
export type InsertRequest = typeof requests.$inferInsert;