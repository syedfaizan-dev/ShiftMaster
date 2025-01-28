import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  isSupervisor: boolean("is_supervisor").default(false),
  isManager: boolean("is_manager").default(false),
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

export const requestStatusEnum = pgEnum('request_status', ['pending', 'approved', 'rejected', 'escalated']);
export const requestTypeEnum = pgEnum('request_type', ['shift_swap', 'leave']);

export const requests = pgTable("requests", {
  id: serial("id").primaryKey(),
  type: requestTypeEnum("type").notNull(),
  status: requestStatusEnum("status").default('pending').notNull(),
  requesterId: integer("requester_id").references(() => users.id).notNull(),
  shiftId: integer("shift_id").references(() => shifts.id),
  targetShiftId: integer("target_shift_id").references(() => shifts.id),
  reason: text("reason").notNull(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  escalatedTo: integer("escalated_to").references(() => users.id),
  escalatedAt: timestamp("escalated_at"),
  autoEscalateAt: timestamp("auto_escalate_at"),
  notes: text("notes"),
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
  shift: one(shifts, {
    fields: [requests.shiftId],
    references: [shifts.id],
  }),
  targetShift: one(shifts, {
    fields: [requests.targetShiftId],
    references: [shifts.id],
  }),
  reviewer: one(users, {
    fields: [requests.reviewedBy],
    references: [users.id],
  }),
  escalatedToUser: one(users, {
    fields: [requests.escalatedTo],
    references: [users.id],
  }),
}));

// Schemas for validation and type inference
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type SelectUser = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const insertShiftSchema = createInsertSchema(shifts);
export const selectShiftSchema = createSelectSchema(shifts);
export type Shift = typeof shifts.$inferSelect;
export type InsertShift = typeof shifts.$inferInsert;

export const insertRoleSchema = createInsertSchema(roles);
export const selectRoleSchema = createSelectSchema(roles);
export type Role = typeof roles.$inferSelect;
export type InsertRole = typeof roles.$inferInsert;

export const insertRequestSchema = createInsertSchema(requests);
export const selectRequestSchema = createSelectSchema(requests);
export type Request = typeof requests.$inferSelect;
export type InsertRequest = typeof requests.$inferInsert;