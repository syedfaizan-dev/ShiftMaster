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

export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").references(() => roles.id).notNull(),
  buildingId: integer("building_id").references(() => buildings.id).notNull(),
  week: text("week").notNull(), // Format: YYYY-WW
  groupName: text("group_name").notNull(), // New field for inspector groups
  status: text("status").default('PENDING').notNull(),
  responseAt: timestamp("response_at"),
  rejectionReason: text("rejection_reason"),
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

export const shiftDays = pgTable("shift_days", {
  id: serial("id").primaryKey(),
  inspectorGroupId: integer("inspector_group_id").references(() => inspectorGroups.id).notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 1 = Monday, etc.
  shiftTypeId: integer("shift_type_id").references(() => shiftTypes.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

export const buildingsRelations = relations(buildings, ({ one, many }) => ({
  shifts: many(shifts),
  supervisor: one(users, {
    fields: [buildings.supervisorId],
    references: [users.id],
  }),
}));

export const shiftsRelations = relations(shifts, ({ one, many }) => ({
  inspectorGroups: many(inspectorGroups),
  days: many(shiftDays),
  role: one(roles, {
    fields: [shifts.roleId],
    references: [roles.id],
  }),
  building: one(buildings, {
    fields: [shifts.buildingId],
    references: [buildings.id],
  }),
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
  assignedTo: integer("assigned_to").references(() => utilities.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

export const tasksRelations = relations(tasks, ({ one }) => ({
  inspector: one(users, {
    fields: [tasks.inspectorId],
    references: [users.id],
  }),
  assignedUtility: one(utilities, {
    fields: [tasks.assignedTo],
    references: [utilities.id],
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
  assignedUtility?: Utility;
  shiftType?: typeof shiftTypes.$inferSelect;
  taskType?: TaskType;
};

export const utilities = pgTable("utilities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

export const utilityRelations = relations(utilities, ({ one }) => ({
  creator: one(users, {
    fields: [utilities.createdBy],
    references: [users.id],
  }),
}));

export const insertUtilitySchema = createInsertSchema(utilities);
export const selectUtilitySchema = createSelectSchema(utilities);

export type Utility = typeof utilities.$inferSelect;
export type InsertUtility = typeof utilities.$inferInsert;

export type UtilityWithRelations = Utility & {
  creator?: User;
};

export type ShiftWithRelations = Shift & {
  inspectorGroups?: InspectorGroupWithRelations[];
  role?: Role;
  building?: Building;
};

export const insertShiftInspectorSchema = createInsertSchema(shiftInspectors);
export const selectShiftInspectorSchema = createSelectSchema(shiftInspectors);

export type ShiftInspector = typeof shiftInspectors.$inferSelect;
export type InsertShiftInspector = typeof shiftInspectors.$inferInsert;

export type ShiftInspectorWithRelations = ShiftInspector & {
  inspector: User;
  inspectorGroup: InspectorGroup;
};

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

export type ShiftDay = typeof shiftDays.$inferSelect;
export type InsertShiftDay = typeof shiftDays.$inferInsert;

export type ShiftWithDays = Shift & {
  days?: ShiftDay[];
  inspectorGroups?: InspectorGroupWithRelations[];
  role?: Role;
  building?: Building;
};

export const inspectorGroups = pgTable("inspector_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  shiftId: integer("shift_id").references(() => shifts.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const inspectorGroupsRelations = relations(inspectorGroups, ({ one, many }) => ({
  shift: one(shifts, {
    fields: [inspectorGroups.shiftId],
    references: [shifts.id],
  }),
  inspectors: many(shiftInspectors),
  days: many(shiftDays),
}));

export type InspectorGroup = typeof inspectorGroups.$inferSelect;
export type InsertInspectorGroup = typeof inspectorGroups.$inferInsert;

export type InspectorGroupWithRelations = InspectorGroup & {
  inspectors?: Array<{
    inspector: User;
    status: string;
    rejectionReason?: string | null;
  }>;
  days?: ShiftDay[];
  shift?: Shift;
};

export const insertInspectorGroupSchema = createInsertSchema(inspectorGroups);
export const selectInspectorGroupSchema = createSelectSchema(inspectorGroups);