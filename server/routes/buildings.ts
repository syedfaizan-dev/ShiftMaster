import { Request, Response } from "express";
import { db } from "@db";
import { buildings, buildingAreas, buildingCoordinators } from "@db/schema/buildings";
import { eq, and } from "drizzle-orm";

// Get all buildings with their supervisors and coordinators
export const getBuildings = async (req: Request, res: Response) => {
  try {
    const allBuildings = await db.query.buildings.findMany({
      with: {
        supervisor: true,
        areas: true,
        coordinators: {
          with: {
            coordinator: true,
          },
        },
      },
    });
    res.json(allBuildings);
  } catch (error) {
    console.error("Error fetching buildings:", error);
    res.status(500).json({ message: "Error fetching buildings" });
  }
};

// Create a new building
export const createBuilding = async (req: Request, res: Response) => {
  try {
    const { name, code, supervisorId, areas } = req.body;
    
    const [building] = await db.insert(buildings)
      .values({ name, code, supervisorId })
      .returning();

    if (areas && areas.length > 0) {
      await db.insert(buildingAreas)
        .values(areas.map((area: { name: string; isCentralArea: boolean }) => ({
          name: area.name,
          buildingId: building.id,
          isCentralArea: area.isCentralArea,
        })));
    }

    res.status(201).json(building);
  } catch (error) {
    console.error("Error creating building:", error);
    res.status(500).json({ message: "Error creating building" });
  }
};

// Assign coordinator to a building
export const assignCoordinator = async (req: Request, res: Response) => {
  try {
    const { buildingId, coordinatorId, shiftType } = req.body;

    // Check if there's already a coordinator for this shift
    const existingCoordinator = await db.query.buildingCoordinators.findFirst({
      where: and(
        eq(buildingCoordinators.buildingId, buildingId),
        eq(buildingCoordinators.shiftType, shiftType)
      ),
    });

    if (existingCoordinator) {
      return res.status(400).json({
        message: `A coordinator for ${shiftType} shift is already assigned to this building`,
      });
    }

    const [assignment] = await db.insert(buildingCoordinators)
      .values({ buildingId, coordinatorId, shiftType })
      .returning();

    res.status(201).json(assignment);
  } catch (error) {
    console.error("Error assigning coordinator:", error);
    res.status(500).json({ message: "Error assigning coordinator" });
  }
};

// Update building supervisor
export const updateBuildingSupervisor = async (req: Request, res: Response) => {
  try {
    const { buildingId } = req.params;
    const { supervisorId } = req.body;

    const [updated] = await db.update(buildings)
      .set({ supervisorId })
      .where(eq(buildings.id, parseInt(buildingId)))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Error updating building supervisor:", error);
    res.status(500).json({ message: "Error updating building supervisor" });
  }
};
