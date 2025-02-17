import { Request, Response } from "express";
import { db } from "@db";
import { buildings, shifts, users, shiftTypes, shiftInspectors } from "@db/schema";
import { eq, and } from "drizzle-orm";

export async function getBuildingsWithShifts(req: Request, res: Response) {
  try {
    // First get all buildings with their supervisors
    const buildingsData = await db
      .select({
        id: buildings.id,
        name: buildings.name,
        code: buildings.code,
        area: buildings.area,
        supervisor: {
          id: users.id,
          fullName: users.fullName,
          username: users.username,
        },
      })
      .from(buildings)
      .leftJoin(users, eq(buildings.supervisorId, users.id));

    // For each building, get its shifts and inspectors
    const buildingsWithShifts = await Promise.all(
      buildingsData.map(async (building) => {
        try {
          // Get all active shifts for this building with their types
          const currentShifts = await db
            .select({
              id: shifts.id,
              week: shifts.week,
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
            currentShifts.map(async (shift) => {
              // Get all inspectors for this shift
              const inspectors = await db
                .select({
                  id: users.id,
                  fullName: users.fullName,
                  username: users.username,
                })
                .from(shiftInspectors)
                .leftJoin(users, eq(shiftInspectors.inspectorId, users.id))
                .where(eq(shiftInspectors.shiftId, shift.id));

              return {
                ...shift,
                inspectors: inspectors.map(inspector => ({
                  id: inspector.id,
                  fullName: inspector.fullName,
                  username: inspector.username,
                })),
              };
            })
          );

          return {
            ...building,
            shiftInspectors: shiftInspectorDetails,
          };
        } catch (error) {
          console.error(`Error processing building ${building.id}:`, error);
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