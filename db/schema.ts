import { pgTable, text, serial, integer, boolean, timestamp, jsonb, time, date } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { type InferSelectModel } from "drizzle-orm";

export const buildings = pgTable("buildings", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  area: text("area").default(''),
  supervisorId: integer("supervisor_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ShiftType = typeof shiftTypes.$inferSelect;
export type InsertShiftType = typeof shiftTypes.$inferInsert;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isManager: boolean("is_manager").default(false).notNull(),
  isInspector: boolean("is_inspector").default(false).notNull(),
  fullName: text("full_name").notNull(),
});

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").unique().notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

export const shiftTypes = pgTable("shift_types", {
  id: serial("id").primaryKey(),
  name: text("name").unique().notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  buildingId: integer("building_id").references(() => buildings.id).notNull(),
  week: text("week").notNull(), // Format: YYYY-WW
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

export const taskAssignments = pgTable("task_assignments", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id").references(() => shifts.id).notNull(),
  roleId: integer("role_id").references(() => roles.id).notNull(),
  inspectorGroupId: integer("inspector_group_id").references(() => inspectorGroups.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const inspectorGroups = pgTable("inspector_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const shiftInspectors = pgTable("shift_inspectors", {
  id: serial("id").primaryKey(),
  inspectorGroupId: integer("inspector_group_id").references(() => inspectorGroups.id).notNull(),
  inspectorId: integer("inspector_id").references(() => users.id).notNull(),
  status: text("status").default('PENDING').notNull(), // PENDING, ACCEPTED, REJECTED
  responseAt: timestamp("response_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const shiftDays = pgTable("shift_days", {
  id: serial("id").primaryKey(),
  inspectorGroupId: integer("inspector_group_id").references(() => inspectorGroups.id).notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 1 = Monday, etc.
  shiftTypeId: integer("shift_type_id").references(() => shiftTypes.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const buildingsRelations = relations(buildings, ({ one, many }) => ({
  shifts: many(shifts),
  supervisor: one(users, {
    fields: [buildings.supervisorId],
    references: [users.id],
  }),
}));

export const shiftsRelations = relations(shifts, ({ one, many }) => ({
  building: one(buildings, {
    fields: [shifts.buildingId],
    references: [buildings.id],
  }),
  taskAssignments: many(taskAssignments),
}));

export const shiftInspectorsRelations = relations(shiftInspectors, ({ one }) => ({
  inspectorGroup: one(inspectorGroups, {
    fields: [shiftInspectors.inspectorGroupId],
    references: [inspectorGroups.id],
  }),
  inspector: one(users, {
    fields: [shiftInspectors.inspectorId],
    references: [users.id],
  }),
}));

export const shiftDaysRelations = relations(shiftDays, ({ one }) => ({
  inspectorGroup: one(inspectorGroups, {
    fields: [shiftDays.inspectorGroupId],
    references: [inspectorGroups.id],
  }),
  shiftType: one(shiftTypes, {
    fields: [shiftDays.shiftTypeId],
    references: [shiftTypes.id],
  }),
}));

export const inspectorGroupsRelations = relations(inspectorGroups, ({ many }) => ({
  taskAssignments: many(taskAssignments),
  inspectors: many(shiftInspectors),
  days: many(shiftDays),
}));

export const taskAssignmentsRelations = relations(taskAssignments, ({ one }) => ({
  shift: one(shifts, {
    fields: [taskAssignments.shiftId],
    references: [shifts.id],
  }),
  role: one(roles, {
    fields: [taskAssignments.roleId],
    references: [roles.id],
  }),
  inspectorGroup: one(inspectorGroups, {
    fields: [taskAssignments.inspectorGroupId],
    references: [inspectorGroups.id],
  }),
}));

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Shift = typeof shifts.$inferSelect;
export type InsertShift = typeof shifts.$inferInsert;
export type Role = typeof roles.$inferSelect;
export type InsertRole = typeof roles.$inferInsert;
export type Building = typeof buildings.$inferSelect;
export type InsertBuilding = typeof buildings.$inferInsert;
export type TaskAssignment = typeof taskAssignments.$inferSelect;
export type InsertTaskAssignment = typeof taskAssignments.$inferInsert;
export type InspectorGroup = typeof inspectorGroups.$inferSelect;
export type InsertInspectorGroup = typeof inspectorGroups.$inferInsert;
export type ShiftDay = typeof shiftDays.$inferSelect;
export type InsertShiftDay = typeof shiftDays.$inferInsert;
export type ShiftInspector = typeof shiftInspectors.$inferSelect;
export type InsertShiftInspector = typeof shiftInspectors.$inferInsert;

// Schemas
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertShiftSchema = createInsertSchema(shifts);
export const selectShiftSchema = createSelectSchema(shifts);
export const insertRoleSchema = createInsertSchema(roles);
export const selectRoleSchema = createSelectSchema(roles);
export const insertBuildingSchema = createInsertSchema(buildings);
export const selectBuildingSchema = createSelectSchema(buildings);
export const insertInspectorGroupSchema = createInsertSchema(inspectorGroups);
export const selectInspectorGroupSchema = createSelectSchema(inspectorGroups);
export const insertShiftInspectorSchema = createInsertSchema(shiftInspectors);
export const selectShiftInspectorSchema = createSelectSchema(shiftInspectors);

// Types with relations
export type ShiftWithRelations = Shift & {
  building?: Building;
  taskAssignments?: Array<TaskAssignment & {
    role?: Role;
    inspectorGroup?: InspectorGroupWithRelations;
  }>;
};

export type InspectorGroupWithRelations = InspectorGroup & {
  inspectors?: Array<{
    inspector: User;
    status: string;
    rejectionReason?: string | null;
  }>;
  days?: Array<ShiftDay & {
    shiftType?: ShiftType;
  }>;
};
