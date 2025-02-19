import { Request, Response } from "express";
import { db } from "@db";
import { buildings, shifts, users, roles, shiftTypes, shiftInspectors, shiftDays, inspectorGroups } from "@db/schema";
import { eq, and } from "drizzle-orm";

export async function getBuildingsWithShifts(req: Request, res: Response) {
  try {
    // Get buildings for the current user based on their role
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
      .leftJoin(users, eq(buildings.supervisorId, users.id))
      .where(req.user?.isAdmin ? undefined : eq(buildings.supervisorId, req.user!.id));

    // Map through buildings to get shifts and related data
    const buildingsWithShifts = await Promise.all(
      buildingsData.map(async (building) => {
        // Get shifts for this building
        const buildingShifts = await db
          .select({
            id: shifts.id,
            week: shifts.week,
            buildingId: shifts.buildingId,
            role: {
              id: roles.id,
              name: roles.name,
            },
            groupName: shifts.groupName,
            status: shifts.status,
          })
          .from(shifts)
          .leftJoin(roles, eq(shifts.roleId, roles.id))
          .where(eq(shifts.buildingId, building.id));

        // For each shift, get inspector groups and their details
        const shiftsWithDetails = await Promise.all(
          buildingShifts.map(async (shift) => {
            // Get all inspector groups for this shift
            const inspectorGroupsData = await db
              .select({
                id: inspectorGroups.id,
                name: inspectorGroups.name,
              })
              .from(inspectorGroups)
              .where(eq(inspectorGroups.shiftId, shift.id));

            // For each inspector group, get inspectors and daily assignments
            const inspectorGroupsWithDetails = await Promise.all(
              inspectorGroupsData.map(async (group) => {
                // Get all inspectors for this group
                const inspectors = await db
                  .select({
                    inspector: {
                      id: users.id,
                      fullName: users.fullName,
                      username: users.username,
                    },
                    status: shiftInspectors.status,
                    rejectionReason: shiftInspectors.rejectionReason,
                  })
                  .from(shiftInspectors)
                  .leftJoin(users, eq(shiftInspectors.inspectorId, users.id))
                  .where(eq(shiftInspectors.inspectorGroupId, group.id));

                // Get daily assignments for this group
                const days = await db
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
                  .where(eq(shiftDays.inspectorGroupId, group.id));

                return {
                  ...group,
                  inspectors,
                  days,
                };
              })
            );

            return {
              ...shift,
              inspectorGroups: inspectorGroupsWithDetails,
            };
          })
        );

        return {
          ...building,
          shifts: shiftsWithDetails,
        };
      })
    );

    // Send the complete response
    res.json({ buildings: buildingsWithShifts });
  } catch (error) {
    console.error("Error fetching buildings with shifts:", error);
    res.status(500).json({ 
      message: "Error fetching buildings data",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}