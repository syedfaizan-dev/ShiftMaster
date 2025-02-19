import { Request, Response } from "express";
import { db } from "@db";
import { buildings, shifts, users, roles, shiftTypes, shiftInspectors, shiftDays, inspectorGroups, taskAssignments } from "@db/schema";
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
        // Get shifts for this building with task assignments
        const buildingShifts = await db
          .select({
            id: shifts.id,
            week: shifts.week,
            buildingId: shifts.buildingId,
          })
          .from(shifts)
          .where(eq(shifts.buildingId, building.id));

        // For each shift, get task assignments with their related data
        const shiftsWithDetails = await Promise.all(
          buildingShifts.map(async (shift) => {
            // Get all task assignments for this shift
            const tasks = await db
              .select({
                id: taskAssignments.id,
                role: {
                  id: roles.id,
                  name: roles.name,
                },
                inspectorGroup: {
                  id: inspectorGroups.id,
                  name: inspectorGroups.name,
                },
              })
              .from(taskAssignments)
              .leftJoin(roles, eq(taskAssignments.roleId, roles.id))
              .leftJoin(inspectorGroups, eq(taskAssignments.inspectorGroupId, inspectorGroups.id))
              .where(eq(taskAssignments.shiftId, shift.id));

            // For each task assignment, get inspectors and daily assignments
            const tasksWithDetails = await Promise.all(
              tasks.map(async (task) => {
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
                  .where(eq(shiftInspectors.inspectorGroupId, task.inspectorGroup.id));

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
                  .where(eq(shiftDays.inspectorGroupId, task.inspectorGroup.id));

                return {
                  ...task,
                  inspectorGroup: {
                    ...task.inspectorGroup,
                    inspectors,
                    days,
                  },
                };
              })
            );

            return {
              ...shift,
              taskAssignments: tasksWithDetails,
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