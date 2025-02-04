import { Request, Response } from "express";
import { db } from "@db";
import { buildings, shifts, users, shiftTypes } from "@db/schema";
import { eq } from "drizzle-orm";

export async function getBuildingsWithShifts(req: Request, res: Response) {
  try {
    // First get all buildings
    const buildingsData = await db
      .select({
        id: buildings.id,
        name: buildings.name,
        area: buildings.area,
        supervisorId: buildings.supervisorId,
      })
      .from(buildings);

    // Map through buildings to get supervisor and shift data
    const buildingsWithShifts = await Promise.all(
      buildingsData.map(async (building) => {
        // Get supervisor data
        const [supervisor] = building.supervisorId
          ? await db
              .select({
                id: users.id,
                fullName: users.fullName,
                username: users.username,
              })
              .from(users)
              .where(eq(users.id, building.supervisorId))
              .limit(1)
          : [null];

        // Get shifts for this building
        const buildingShifts = await db
          .select({
            id: shifts.id,
            week: shifts.week,
            inspectorId: shifts.inspectorId,
            shiftTypeId: shifts.shiftTypeId,
            status: shifts.status,
          })
          .from(shifts)
          .where(eq(shifts.buildingId, building.id));

        // Get inspector and shift type data for each shift
        const shiftInspectors = await Promise.all(
          buildingShifts.map(async (shift) => {
            const [inspector] = await db
              .select({
                id: users.id,
                fullName: users.fullName,
                username: users.username,
              })
              .from(users)
              .where(eq(users.id, shift.inspectorId))
              .limit(1);

            const [shiftType] = await db
              .select({
                id: shiftTypes.id,
                name: shiftTypes.name,
                startTime: shiftTypes.startTime,
                endTime: shiftTypes.endTime,
              })
              .from(shiftTypes)
              .where(eq(shiftTypes.id, shift.shiftTypeId))
              .limit(1);

            return {
              inspector,
              shift: {
                id: shift.id,
                week: shift.week,
                status: shift.status,
                shiftType,
              },
            };
          }),
        );

        return {
          id: building.id,
          name: building.name,
          area: building.area,
          supervisor,
          shiftInspectors,
        };
      }),
    );

    res.json({ buildings: buildingsWithShifts });
  } catch (error) {
    console.error("Error fetching buildings with shifts:", error);
    res.status(500).json({ message: "Error fetching buildings data" });
  }
}