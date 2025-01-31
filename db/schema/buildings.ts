import { integer, pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "../schema";

export const buildings = pgTable("buildings", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  supervisorId: integer("supervisor_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const buildingAreas = pgTable("building_areas", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  buildingId: integer("building_id")
    .notNull()
    .references(() => buildings.id),
  isCentralArea: boolean("is_central_area").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const buildingCoordinators = pgTable("building_coordinators", {
  id: serial("id").primaryKey(),
  buildingId: integer("building_id")
    .notNull()
    .references(() => buildings.id),
  coordinatorId: integer("coordinator_id")
    .notNull()
    .references(() => users.id),
  shiftType: text("shift_type").notNull(), // 'MORNING' or 'EVENING'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Add relations
export const buildingsRelations = relations(buildings, ({ one, many }) => ({
  supervisor: one(users, {
    fields: [buildings.supervisorId],
    references: [users.id],
  }),
  areas: many(buildingAreas),
  coordinators: many(buildingCoordinators),
}));

export const buildingAreasRelations = relations(buildingAreas, ({ one }) => ({
  building: one(buildings, {
    fields: [buildingAreas.buildingId],
    references: [buildings.id],
  }),
}));

export const buildingCoordinatorsRelations = relations(buildingCoordinators, ({ one }) => ({
  building: one(buildings, {
    fields: [buildingCoordinators.buildingId],
    references: [buildings.id],
  }),
  coordinator: one(users, {
    fields: [buildingCoordinators.coordinatorId],
    references: [users.id],
  }),
}));