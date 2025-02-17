import { Request, Response } from "express";
import { db } from "@db";
import { buildings, shifts, users, roles, shiftTypes } from "@db/schema";
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
      })
      .from(buildings);

    // If user is not an admin, only show buildings they supervise
    if (!req.user?.isAdmin) {
      buildingsQuery.where(eq(buildings.supervisorId, req.user!.id));
    }

    const buildingsData = await buildingsQuery;

    // Map through buildings to get shifts and related data
    const buildingsWithShifts = await Promise.all(
      buildingsData.map(async (building) => {
        // Get shifts for this building with all related data
        const buildingShifts = await db
          .select({
            id: shifts.id,
            inspectorId: shifts.inspectorId,
            roleId: shifts.roleId,
            shiftTypeId: shifts.shiftTypeId,
            week: shifts.week,
            backupId: shifts.backupId,
            status: shifts.status,
            responseAt: shifts.responseAt,
            rejectionReason: shifts.rejectionReason,
          })
          .from(shifts)
          .where(eq(shifts.buildingId, building.id));

        // Get related data for each shift
        const shiftsWithRelations = await Promise.all(
          buildingShifts.map(async (shift) => {
            // Get inspector details
            const [inspector] = await db
              .select({
                id: users.id,
                fullName: users.fullName,
                username: users.username,
              })
              .from(users)
              .where(eq(users.id, shift.inspectorId))
              .limit(1);

            // Get backup inspector details if exists
            let backup = null;
            if (shift.backupId) {
              const [backupData] = await db
                .select({
                  id: users.id,
                  fullName: users.fullName,
                  username: users.username,
                })
                .from(users)
                .where(eq(users.id, shift.backupId))
                .limit(1);
              backup = backupData;
            }

            // Get role details
            const [role] = await db
              .select({
                id: roles.id,
                name: roles.name,
              })
              .from(roles)
              .where(eq(roles.id, shift.roleId))
              .limit(1);

            // Get shift type details
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
              ...shift,
              inspector,
              role,
              shiftType,
              backup,
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
          shifts: shiftsWithRelations,
        };
      }),
    );

    res.json({ buildings: buildingsWithShifts });
  } catch (error) {
    console.error("Error fetching buildings with shifts:", error);
    res.status(500).json({ message: "Error fetching buildings data" });
  }
}