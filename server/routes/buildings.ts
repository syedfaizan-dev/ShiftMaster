import { Request, Response } from "express";
import { db } from "@db";
import { buildings, shifts, users, shiftTypes, shiftInspectors } from "@db/schema";
import { eq } from "drizzle-orm";

export async function getBuildingsWithShifts(req: Request, res: Response) {
  try {
    // First get all buildings with their supervisors
    const buildingsData = await db
      .select({
        id: buildings.id,
        name: buildings.name,
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
        // Get all shifts for this building
        const shiftsWithTypes = await db
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
          .where(eq(shifts.buildingId, building.id));

        // For each shift, get its inspectors
        const shiftInspectorsData = await Promise.all(
          shiftsWithTypes.map(async (shift) => {
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
              .where(eq(shiftInspectors.shiftId, shift.id));

            return {
              ...shift,
              inspector: inspectors[0]?.inspector, // Maintain backward compatibility
              inspectors: inspectors.map(i => ({ inspector: i.inspector })),
            };
          })
        );

        return {
          ...building,
          shiftInspectors: shiftInspectorsData,
        };
      })
    );

    res.json({ buildings: buildingsWithShifts });
  } catch (error) {
    console.error('Error fetching buildings with shifts:', error);
    res.status(500).json({ message: "Error fetching buildings data" });
  }
}

export default {
  getBuildingsWithShifts,
};