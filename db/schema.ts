import { pgTable, text, serial, integer, boolean, timestamp, jsonb, time } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { type InferSelectModel } from "drizzle-orm";

export const buildings = pgTable("buildings", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  area: text("area").default(''),
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
  inspectorId: integer("inspector_id").references(() => users.id).notNull(),
  roleId: integer("role_id").references(() => roles.id).notNull(),
  shiftTypeId: integer("shift_type_id").references(() => shiftTypes.id).notNull(),
  buildingId: integer("building_id").references(() => buildings.id).notNull(),
  week: text("week").notNull(),
  backupId: integer("backup_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

export const requests = pgTable("requests", {
  id: serial("id").primaryKey(),
  requesterId: integer("requester_id").references(() => users.id).notNull(),
  type: text("type").notNull(),
  status: text("status").default('PENDING').notNull(),
  shiftTypeId: integer("shift_type_id").references(() => shiftTypes.id),
  targetShiftTypeId: integer("target_shift_type_id").references(() => shiftTypes.id),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  reason: text("reason"),
  reviewerId: integer("reviewer_id").references(() => users.id),
  managerId: integer("manager_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  metadata: jsonb("metadata"),
});

export const requestsRelations = relations(requests, ({ one }) => ({
  requester: one(users, {
    fields: [requests.requesterId],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [requests.reviewerId],
    references: [users.id],
  }),
  manager: one(users, {
    fields: [requests.managerId],
    references: [users.id],
  }),
  shiftType: one(shiftTypes, {
    fields: [requests.shiftTypeId],
    references: [shiftTypes.id],
  }),
  targetShiftType: one(shiftTypes, {
    fields: [requests.targetShiftTypeId],
    references: [shiftTypes.id],
  }),
}));

export const buildingsRelations = relations(buildings, ({ many }) => ({
  shifts: many(shifts),
}));

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
  shiftType: one(shiftTypes, {
    fields: [shifts.shiftTypeId],
    references: [shiftTypes.id],
  }),
  building: one(buildings, {
    fields: [shifts.buildingId],
    references: [buildings.id],
  }),
}));

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const insertNotificationSchema = createInsertSchema(notifications);
export const selectNotificationSchema = createSelectSchema(notifications);

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

export type NotificationWithUser = Notification & {
  user?: User;
};


export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertShiftSchema = createInsertSchema(shifts);
export const selectShiftSchema = createSelectSchema(shifts);
export const insertRoleSchema = createInsertSchema(roles);
export const selectRoleSchema = createSelectSchema(roles);
export const insertRequestSchema = createInsertSchema(requests);
export const selectRequestSchema = createSelectSchema(requests);
export const insertBuildingSchema = createInsertSchema(buildings);
export const selectBuildingSchema = createSelectSchema(buildings);


export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Shift = typeof shifts.$inferSelect;
export type InsertShift = typeof shifts.$inferInsert;
export type Role = typeof roles.$inferSelect;
export type InsertRole = typeof roles.$inferInsert;
export type Request = typeof requests.$inferSelect;
export type InsertRequest = typeof requests.$inferInsert;
export type Building = typeof buildings.$inferSelect;
export type InsertBuilding = typeof buildings.$inferInsert;

export type RequestWithRelations = Request & {
  requester?: User;
  reviewer?: User | null;
  manager?: User | null;
  shiftType?: typeof shiftTypes.$inferSelect;
  targetShiftType?: typeof shiftTypes.$inferSelect;
};

export const taskTypes = pgTable("task_types", {
  id: serial("id").primaryKey(),
  name: text("name").unique().notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  inspectorId: integer("inspector_id").references(() => users.id).notNull(),
  shiftTypeId: integer("shift_type_id").references(() => shiftTypes.id).notNull(),
  taskTypeId: integer("task_type_id").references(() => taskTypes.id).notNull(),
  status: text("status").default("PENDING").notNull(),
  date: timestamp("date").notNull(),
  isFollowupNeeded: boolean("is_followup_needed").default(false).notNull(),
  assignedTo: integer("assigned_to").references(() => agencies.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

export const tasksRelations = relations(tasks, ({ one }) => ({
  inspector: one(users, {
    fields: [tasks.inspectorId],
    references: [users.id],
  }),
  assignedAgency: one(agencies, {
    fields: [tasks.assignedTo],
    references: [agencies.id],
  }),
  shiftType: one(shiftTypes, {
    fields: [tasks.shiftTypeId],
    references: [shiftTypes.id],
  }),
  taskType: one(taskTypes, {
    fields: [tasks.taskTypeId],
    references: [taskTypes.id],
  }),
}));

export const taskTypesRelations = relations(taskTypes, ({ one }) => ({
  creator: one(users, {
    fields: [taskTypes.createdBy],
    references: [users.id],
  }),
}));

export const insertTaskTypeSchema = createInsertSchema(taskTypes);
export const selectTaskTypeSchema = createSelectSchema(taskTypes);

export type TaskType = typeof taskTypes.$inferSelect;
export type InsertTaskType = typeof taskTypes.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

export type TaskWithRelations = Task & {
  inspector?: User;
  assignedAgency?: Agency;
  shiftType?: typeof shiftTypes.$inferSelect;
  taskType?: TaskType;
};

// Add agencies table
export const agencies = pgTable("agencies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

// Add agency relations
export const agencyRelations = relations(agencies, ({ one }) => ({
  creator: one(users, {
    fields: [agencies.createdBy],
    references: [users.id],
  }),
}));

// Add agency schemas
export const insertAgencySchema = createInsertSchema(agencies);
export const selectAgencySchema = createSelectSchema(agencies);

// Add agency types
export type Agency = typeof agencies.$inferSelect;
export type InsertAgency = typeof agencies.$inferInsert;

export type AgencyWithRelations = Agency & {
  creator?: User;
};