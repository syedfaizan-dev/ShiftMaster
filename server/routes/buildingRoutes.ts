import { Request, Response } from "express";
import { db } from "@db";
import { 
  buildings, shifts, users, roles, shiftTypes, weeklyShiftAssignments,
  weeklyInspectorGroups, weeklyGroupInspectors, dailyShiftTypes 
} from "@db/schema";
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

    // Map through buildings to get weekly shift assignments and related data
    const buildingsWithShifts = await Promise.all(
      buildingsData.map(async (building) => {
        // Get weekly shift assignments for this building
        const weeklyAssignments = await db
          .select()
          .from(weeklyShiftAssignments)
          .where(eq(weeklyShiftAssignments.buildingId, building.id));

        // For each weekly assignment, get all inspector groups and their shifts
        const assignmentsWithDetails = await Promise.all(
          weeklyAssignments.map(async (assignment) => {
            // Get all inspector groups for this weekly assignment
            const inspectorGroups = await db
              .select({
                id: weeklyInspectorGroups.id,
                role: {
                  id: roles.id,
                  name: roles.name,
                },
              })
              .from(weeklyInspectorGroups)
              .leftJoin(roles, eq(weeklyInspectorGroups.roleId, roles.id))
              .where(eq(weeklyInspectorGroups.weeklyShiftAssignmentId, assignment.id));

            // For each group, get inspectors and daily shifts
            const groupsWithDetails = await Promise.all(
              inspectorGroups.map(async (group) => {
                // Get inspectors in this group
                const inspectors = await db
                  .select({
                    inspector: {
                      id: users.id,
                      fullName: users.fullName,
                      username: users.username,
                    },
                    isPrimary: weeklyGroupInspectors.isPrimary,
                  })
                  .from(weeklyGroupInspectors)
                  .leftJoin(users, eq(weeklyGroupInspectors.inspectorId, users.id))
                  .where(eq(weeklyGroupInspectors.weeklyInspectorGroupId, group.id));

                // Get daily shift types for this group
                const dailyShifts = await db
                  .select({
                    dayOfWeek: dailyShiftTypes.dayOfWeek,
                    shiftType: {
                      id: shiftTypes.id,
                      name: shiftTypes.name,
                      startTime: shiftTypes.startTime,
                      endTime: shiftTypes.endTime,
                    },
                  })
                  .from(dailyShiftTypes)
                  .leftJoin(shiftTypes, eq(dailyShiftTypes.shiftTypeId, shiftTypes.id))
                  .where(eq(dailyShiftTypes.weeklyInspectorGroupId, group.id));

                return {
                  ...group,
                  inspectors,
                  dailyShifts,
                };
              }),
            );

            return {
              ...assignment,
              inspectorGroups: groupsWithDetails,
            };
          }),
        );

        return {
          ...building,
          weeklyAssignments: assignmentsWithDetails,
        };
      }),
    );

    res.json({ buildings: buildingsWithShifts });
  } catch (error) {
    console.error("Error fetching buildings with shifts:", error);
    res.status(500).json({ message: "Error fetching buildings data" });
  }
}