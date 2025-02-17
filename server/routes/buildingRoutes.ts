import { Request, Response } from "express";
import { db } from "@db";
import { buildings, shifts, users, roles, shiftTypes, shiftInspectors, shiftDays } from "@db/schema";
import { eq, and } from "drizzle-orm";

export async function getBuildingsWithShifts(req: Request, res: Response) {
  try {
    // Get buildings for the current user based on their role
    const buildingsQuery = db
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

    // If user is not an admin, only show buildings they supervise
    if (!req.user?.isAdmin) {
      buildingsQuery.where(eq(buildings.supervisorId, req.user!.id));
    }

    const buildingsData = await buildingsQuery;

    // Map through buildings to get shifts and related data
    const buildingsWithShifts = await Promise.all(
      buildingsData.map(async (building) => {
        // Get shifts for this building
        const buildingShifts = await db
          .select({
            id: shifts.id,
            roleId: shifts.roleId,
            week: shifts.week,
            groupName: shifts.groupName,
            status: shifts.status,
            responseAt: shifts.responseAt,
            rejectionReason: shifts.rejectionReason,
          })
          .from(shifts)
          .where(eq(shifts.buildingId, building.id));

        // For each shift, get all inspectors and related data
        const shiftsWithDetails = await Promise.all(
          buildingShifts.map(async (shift) => {
            // Get all inspectors for this shift
            const shiftInspectorsData = await db
              .select({
                inspector: {
                  id: users.id,
                  fullName: users.fullName,
                  username: users.username,
                },
                isPrimary: shiftInspectors.isPrimary,
              })
              .from(shiftInspectors)
              .leftJoin(users, eq(shiftInspectors.inspectorId, users.id))
              .where(eq(shiftInspectors.shiftId, shift.id));

            // Get role details
            const [role] = await db
              .select({
                id: roles.id,
                name: roles.name,
              })
              .from(roles)
              .where(eq(roles.id, shift.roleId))
              .limit(1);

            // Get daily assignments with shift types
            const dayShifts = await db
              .select({
                id: shiftDays.id,
                dayOfWeek: shiftDays.dayOfWeek,
                shiftType: {
                  id: shiftTypes.id,
                  name: shiftTypes.name,
                  startTime: shiftTypes.startTime,
                  endTime: shiftTypes.endTime,
                },
              })
              .from(shiftDays)
              .leftJoin(shiftTypes, eq(shiftDays.shiftTypeId, shiftTypes.id))
              .where(eq(shiftDays.shiftId, shift.id));

            return {
              ...shift,
              shiftInspectors: shiftInspectorsData,
              role,
              days: dayShifts,
              building: {
                id: building.id,
                name: building.name,
                code: building.code,
                area: building.area,
              },
            };
          }),
        );

        return {
          ...building,
          shifts: shiftsWithDetails,
        };
      }),
    );

    res.json({ buildings: buildingsWithShifts });
  } catch (error) {
    console.error("Error fetching buildings with shifts:", error);
    res.status(500).json({ message: "Error fetching buildings data" });
  }
}