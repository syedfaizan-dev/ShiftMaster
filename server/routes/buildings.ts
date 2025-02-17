import { Request, Response } from "express";
import { db } from "@db";
import { buildings, shifts, users, shiftTypes, shiftInspectors } from "@db/schema";
import { eq, and } from "drizzle-orm";

export async function getBuildingsWithShifts(req: Request, res: Response) {
  try {
    // First get all buildings with their supervisors
    const buildingsData = await db
      .select({
        building: {
          id: buildings.id,
          name: buildings.name,
          code: buildings.code,
          area: buildings.area,
        },
        supervisor: {
          id: users.id,
          fullName: users.fullName,
          username: users.username,
        },
      })
      .from(buildings)
      .leftJoin(users, eq(buildings.supervisorId, users.id));

    if (!buildingsData) {
      console.error('No buildings data found');
      return res.status(404).json({ message: "No buildings found" });
    }

    // For each building, get its shifts and inspectors
    const buildingsWithShifts = await Promise.all(
      buildingsData.map(async (buildingData) => {
        try {
          const { building, supervisor } = buildingData;

          // Get all active shifts for this building with their types
          const currentShifts = await db
            .select({
              shift: {
                id: shifts.id,
                week: shifts.week,
              },
              shiftType: {
                id: shiftTypes.id,
                name: shiftTypes.name,
                startTime: shiftTypes.startTime,
                endTime: shiftTypes.endTime,
              },
            })
            .from(shifts)
            .leftJoin(shiftTypes, eq(shifts.shiftTypeId, shiftTypes.id))
            .where(and(
              eq(shifts.buildingId, building.id),
              eq(shifts.status, 'ACCEPTED')
            ));

          // For each shift, get its inspectors
          const shiftInspectorDetails = await Promise.all(
            currentShifts.map(async (shiftData) => {
              try {
                const inspectors = await db
                  .select({
                    inspector: {
                      id: users.id,
                      fullName: users.fullName,
                      username: users.username,
                    },
                  })
                  .from(shiftInspectors)
                  .leftJoin(users, eq(shiftInspectors.inspectorId, users.id))
                  .where(eq(shiftInspectors.shiftId, shiftData.shift.id));

                return {
                  ...shiftData.shift,
                  shiftType: shiftData.shiftType,
                  inspector: inspectors[0]?.inspector || null,
                  inspectors: inspectors.map(i => ({ inspector: i.inspector })),
                };
              } catch (error) {
                console.error(`Error fetching inspectors for shift ${shiftData.shift.id}:`, error);
                throw error;
              }
            })
          );

          return {
            ...building,
            supervisor,
            shiftInspectors: shiftInspectorDetails,
          };
        } catch (error) {
          console.error(`Error processing building ${buildingData.building.id}:`, error);
          throw error;
        }
      })
    );

    res.json({ buildings: buildingsWithShifts });
  } catch (error) {
    console.error('Error fetching buildings with shifts:', error);
    res.status(500).json({ 
      message: "Error fetching buildings data",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

export default {
  getBuildingsWithShifts,
};