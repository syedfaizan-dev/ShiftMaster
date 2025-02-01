import { Request, Response } from "express";
import { db } from "@db";
import { buildings, buildingCoordinators } from "@db/schema/buildings";
import { eq } from "drizzle-orm";
import { users, shiftTypes } from "@db/schema";

// Get all buildings with their supervisors and coordinators
export const getBuildings = async (req: Request, res: Response) => {
  try {
    // First get all buildings
    const buildingsData = await db.select().from(buildings);

    // Get coordinator data separately to avoid JOIN complexity
    const formattedBuildings = await Promise.all(
      buildingsData.map(async (building) => {
        // Get supervisor data
        const [supervisor] = await db
          .select()
          .from(users)
          .where(eq(users.id, building.supervisorId!));

        // Get coordinators data with shift type information
        const coordinatorsData = await db
          .select({
            coordinator: users,
            shiftType: shiftTypes,
            id: buildingCoordinators.id
          })
          .from(buildingCoordinators)
          .where(eq(buildingCoordinators.buildingId, building.id))
          .leftJoin(users, eq(buildingCoordinators.coordinatorId, users.id))
          .leftJoin(shiftTypes, eq(buildingCoordinators.shiftTypeId, shiftTypes.id));

        return {
          ...building,
          supervisor,
          coordinators: coordinatorsData.map(c => ({
            id: c.id,
            coordinator: c.coordinator,
            shiftType: c.shiftType
          }))
        };
      })
    );

    res.json(formattedBuildings);
  } catch (error) {
    console.error("Error fetching buildings:", error);
    res.status(500).json({ message: "Error fetching buildings", error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Create a new building
export const createBuilding = async (req: Request, res: Response) => {
  try {
    const { name, code, supervisorId, area, coordinators } = req.body;

    // Check if building code already exists
    const [existingBuilding] = await db
      .select()
      .from(buildings)
      .where(eq(buildings.code, code))
      .limit(1);

    if (existingBuilding) {
      return res.status(400).json({ 
        message: "Building code already exists",
        error: `A building with code "${code}" already exists. Please use a different code.`
      });
    }

    console.log("Creating building with data:", { name, code, supervisorId, area, coordinators });

    // Create building first
    const [building] = await db.insert(buildings)
      .values({
        name,
        code,
        area,
        supervisorId: parseInt(supervisorId),
      })
      .returning();

    console.log("Building created:", building);

    // Then create coordinator assignments
    if (coordinators && coordinators.length > 0) {
      const coordinatorPromises = coordinators.map((coord: { coordinatorId: string; shiftTypeId: string }) =>
        db.insert(buildingCoordinators)
          .values({
            buildingId: building.id,
            coordinatorId: parseInt(coord.coordinatorId),
            shiftTypeId: parseInt(coord.shiftTypeId),
          })
          .returning()
      );

      await Promise.all(coordinatorPromises);
    }

    // Fetch the complete building data with relationships
    const [supervisor] = await db
      .select()
      .from(users)
      .where(eq(users.id, building.supervisorId!));

    const coordinatorsData = await db
      .select({
        coordinator: users,
        shiftTypeId: buildingCoordinators.shiftTypeId,
        id: buildingCoordinators.id
      })
      .from(buildingCoordinators)
      .where(eq(buildingCoordinators.buildingId, building.id))
      .leftJoin(users, eq(buildingCoordinators.coordinatorId, users.id));

    const createdBuilding = {
      ...building,
      supervisor,
      coordinators: coordinatorsData.map(c => ({
        id: c.id,
        coordinator: c.coordinator,
        shiftTypeId: c.shiftTypeId
      }))
    };

    res.status(201).json(createdBuilding);
  } catch (error) {
    console.error("Error creating building:", error);
    res.status(500).json({ 
      message: "Error creating building", 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// Update building details
export const updateBuilding = async (req: Request, res: Response) => {
  try {
    const { buildingId } = req.params;
    const { name, code, supervisorId, area } = req.body;

    const [updated] = await db.update(buildings)
      .set({
        name,
        code,
        area,
        supervisorId: parseInt(supervisorId),
      })
      .where(eq(buildings.id, parseInt(buildingId)))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Error updating building:", error);
    res.status(500).json({ 
      message: "Error updating building",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update building coordinator
export const updateBuildingCoordinator = async (req: Request, res: Response) => {
  try {
    const { buildingId } = req.params;
    const { coordinatorId, shiftTypeId } = req.body;

    // Check if there's already a coordinator for this shift
    const [existing] = await db.select()
      .from(buildingCoordinators)
      .where(
        eq(buildingCoordinators.buildingId, parseInt(buildingId))
      );

    if (existing) {
      // Update existing coordinator
      await db.update(buildingCoordinators)
        .set({ 
          coordinatorId: parseInt(coordinatorId),
          shiftTypeId: parseInt(shiftTypeId)
        })
        .where(eq(buildingCoordinators.id, existing.id));
    } else {
      // Add new coordinator
      await db.insert(buildingCoordinators)
        .values({
          buildingId: parseInt(buildingId),
          coordinatorId: parseInt(coordinatorId),
          shiftTypeId: parseInt(shiftTypeId)
        });
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Error updating building coordinator:", error);
    res.status(500).json({ message: "Error updating building coordinator", error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Delete building and its coordinators
export const deleteBuilding = async (req: Request, res: Response) => {
  try {
    const { buildingId } = req.params;

    // First delete all coordinators associated with this building
    await db.delete(buildingCoordinators)
      .where(eq(buildingCoordinators.buildingId, parseInt(buildingId)));

    // Then delete the building
    const [deleted] = await db.delete(buildings)
      .where(eq(buildings.id, parseInt(buildingId)))
      .returning();

    if (!deleted) {
      return res.status(404).json({ message: "Building not found" });
    }

    res.json(deleted);
  } catch (error) {
    console.error("Error deleting building:", error);
    res.status(500).json({ 
      message: "Error deleting building", 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};