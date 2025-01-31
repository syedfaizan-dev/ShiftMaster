import { Request, Response } from "express";
import { db } from "@db";
import { buildings, buildingCoordinators } from "@db/schema/buildings";
import { eq, and } from "drizzle-orm";
import { users } from "@db/schema";

// Get all buildings with their supervisors and coordinators
export const getBuildings = async (req: Request, res: Response) => {
  try {
    const result = await db.select({
      buildings,
      supervisor: users,
      coordinators: buildingCoordinators
    })
    .from(buildings)
    .leftJoin(users, eq(buildings.supervisorId, users.id))
    .leftJoin(buildingCoordinators, eq(buildings.id, buildingCoordinators.buildingId));

    // Format the response
    const formattedBuildings = result.reduce((acc: any[], curr) => {
      const existingBuilding = acc.find(b => b.id === curr.buildings.id);
      if (existingBuilding) {
        if (curr.coordinators) {
          existingBuilding.coordinators.push(curr.coordinators);
        }
      } else {
        acc.push({
          ...curr.buildings,
          supervisor: curr.supervisor,
          coordinators: curr.coordinators ? [curr.coordinators] : []
        });
      }
      return acc;
    }, []);

    res.json(formattedBuildings);
  } catch (error) {
    console.error("Error fetching buildings:", error);
    res.status(500).json({ message: "Error fetching buildings" });
  }
};

// Create a new building
export const createBuilding = async (req: Request, res: Response) => {
  try {
    const { name, code, supervisorId, area, coordinators } = req.body;

    // Create building first
    const [building] = await db.insert(buildings)
      .values({
        name,
        code,
        area,
        supervisorId: parseInt(supervisorId),
      })
      .returning();

    // Then create coordinator assignments
    if (coordinators && coordinators.length > 0) {
      await Promise.all(
        coordinators.map((coord: { coordinatorId: string; shiftType: string }) =>
          db.insert(buildingCoordinators).values({
            buildingId: building.id,
            coordinatorId: parseInt(coord.coordinatorId),
            shiftType: coord.shiftType,
          })
        )
      );
    }

    // Fetch the created building with its relationships
    const result = await db.select({
      buildings,
      supervisor: users,
      coordinators: buildingCoordinators
    })
    .from(buildings)
    .where(eq(buildings.id, building.id))
    .leftJoin(users, eq(buildings.supervisorId, users.id))
    .leftJoin(buildingCoordinators, eq(buildings.id, buildingCoordinators.buildingId));

    // Format the response
    const createdBuilding = {
      ...result[0].buildings,
      supervisor: result[0].supervisor,
      coordinators: result[0].coordinators ? [result[0].coordinators] : []
    };

    res.status(201).json(createdBuilding);
  } catch (error) {
    console.error("Error creating building:", error);
    res.status(500).json({ message: "Error creating building" });
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
    res.status(500).json({ message: "Error updating building" });
  }
};

// Update building coordinator
export const updateBuildingCoordinator = async (req: Request, res: Response) => {
  try {
    const { buildingId } = req.params;
    const { coordinatorId, shiftType } = req.body;

    // Check if there's already a coordinator for this shift
    const [existing] = await db.select()
      .from(buildingCoordinators)
      .where(
        and(
          eq(buildingCoordinators.buildingId, parseInt(buildingId)),
          eq(buildingCoordinators.shiftType, shiftType)
        )
      );

    if (existing) {
      // Update existing coordinator
      await db.update(buildingCoordinators)
        .set({ coordinatorId: parseInt(coordinatorId) })
        .where(eq(buildingCoordinators.id, existing.id));
    } else {
      // Add new coordinator
      await db.insert(buildingCoordinators)
        .values({
          buildingId: parseInt(buildingId),
          coordinatorId: parseInt(coordinatorId),
          shiftType,
        });
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Error updating building coordinator:", error);
    res.status(500).json({ message: "Error updating building coordinator" });
  }
};