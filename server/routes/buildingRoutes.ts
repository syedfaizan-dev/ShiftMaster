import { Request, Response } from "express";
import { db } from "@db";
import { buildings, shifts, users, roles, shiftTypes, shiftInspectors, shiftDays, inspectorGroups } from "@db/schema";
import { eq, and, isNull, or } from "drizzle-orm";

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
      .where(
        req.user?.isAdmin 
          ? undefined 
          : or(eq(buildings.supervisorId, req.user?.id || 0), isNull(buildings.supervisorId))
      );

    // Map through buildings to get shifts and related data
    const buildingsWithShifts = await Promise.all(
      buildingsData.map(async (building) => {
        // Get shifts for this building with basic info
        const buildingShifts = await db
          .select({
            id: shifts.id,
            week: shifts.week,
            roleId: shifts.roleId,
            buildingId: shifts.buildingId,
            groupName: shifts.groupName,
          })
          .from(shifts)
          .where(eq(shifts.buildingId, building.id));

        // For each shift, get inspector groups, role, and daily assignments
        const shiftsWithDetails = await Promise.all(
          buildingShifts.map(async (shift) => {
            // Get all inspector groups for this shift
            const groups = await db
              .select({
                id: inspectorGroups.id,
                name: inspectorGroups.name,
              })
              .from(inspectorGroups)
              .where(eq(inspectorGroups.shiftId, shift.id));

            // For each group, get inspectors and daily assignments
            const groupsWithDetails = await Promise.all(
              groups.map(async (group) => {
                // Get all inspectors for this group
                const inspectors = await db
                  .select({
                    inspector: {
                      id: users.id,
                      fullName: users.fullName,
                      username: users.username,
                    },
                    status: shiftInspectors.status,
                    isPrimary: shiftInspectors.isPrimary,
                    responseAt: shiftInspectors.responseAt,
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
                  inspectors: inspectors.map(inspector => ({
                    inspector: inspector.inspector,
                    status: inspector.status || "PENDING",
                    isPrimary: inspector.isPrimary || false,
                    responseAt: inspector.responseAt,
                    rejectionReason: inspector.rejectionReason,
                  })),
                  days: days.map(day => ({
                    id: day.id,
                    dayOfWeek: day.dayOfWeek,
                    shiftType: day.shiftType?.id ? day.shiftType : null,
                  })),
                };
              })
            );

            // Get role details
            const [role] = await db
              .select({
                id: roles.id,
                name: roles.name,
              })
              .from(roles)
              .where(eq(roles.id, shift.roleId));

            return {
              ...shift,
              role,
              inspectorGroups: groupsWithDetails,
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