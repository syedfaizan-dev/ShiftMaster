import { Request, Response } from "express";
import { db } from "@db";
import { buildings, shifts, users, roles, shiftTypes, shiftInspectors, shiftDays, inspectorGroups } from "@db/schema";
import { eq, and, isNull, or } from "drizzle-orm";

export async function getBuildingsWithShifts(req: Request, res: Response) {
  try {
    console.log("Fetching buildings for user:", req.user);

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
      .leftJoin(users, eq(buildings.supervisorId, users.id));

    console.log("Found buildings:", buildingsData);

    // Map through buildings to get shifts and related data
    const buildingsWithShifts = await Promise.all(
      buildingsData.map(async (building) => {
        try {
          console.log(`Fetching shifts for building ${building.id}`);

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

          console.log(`Found shifts for building ${building.id}:`, buildingShifts);

          // For each shift, get inspector groups and role
          const shiftsWithDetails = await Promise.all(
            buildingShifts.map(async (shift) => {
              try {
                // Get role details first
                const roleResult = await db
                  .select({
                    id: roles.id,
                    name: roles.name,
                  })
                  .from(roles)
                  .where(eq(roles.id, shift.roleId));

                const role = roleResult[0] || { id: 0, name: 'Unknown Role' };

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
                    try {
                      // Get all inspectors for this group
                      const inspectorsResult = await db
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
                      const daysResult = await db
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
                        inspectors: inspectorsResult.map(inspector => ({
                          inspector: inspector.inspector || {
                            id: 0,
                            fullName: 'Unknown Inspector',
                            username: 'unknown'
                          },
                          status: inspector.status || "PENDING",
                          isPrimary: inspector.isPrimary || false,
                          responseAt: inspector.responseAt || null,
                          rejectionReason: inspector.rejectionReason || null,
                        })),
                        days: daysResult.map(day => ({
                          id: day.id || 0,
                          dayOfWeek: day.dayOfWeek || 0,
                          shiftType: day.shiftType?.id ? day.shiftType : null,
                        })),
                      };
                    } catch (groupError) {
                      console.error(`Error processing group ${group.id}:`, groupError);
                      return {
                        ...group,
                        inspectors: [],
                        days: [],
                      };
                    }
                  })
                );

                return {
                  id: shift.id,
                  week: shift.week,
                  role,
                  buildingId: shift.buildingId,
                  groupName: shift.groupName,
                  inspectorGroups: groupsWithDetails,
                };
              } catch (shiftError) {
                console.error(`Error processing shift ${shift.id}:`, shiftError);
                return {
                  id: shift.id,
                  week: shift.week,
                  role: { id: 0, name: 'Unknown Role' },
                  buildingId: shift.buildingId,
                  groupName: shift.groupName,
                  inspectorGroups: [],
                };
              }
            })
          );

          return {
            id: building.id,
            name: building.name,
            code: building.code,
            area: building.area,
            supervisor: building.supervisor || null,
            shifts: shiftsWithDetails,
          };
        } catch (buildingError) {
          console.error(`Error processing building ${building.id}:`, buildingError);
          return {
            id: building.id,
            name: building.name,
            code: building.code,
            area: building.area,
            supervisor: null,
            shifts: [],
          };
        }
      })
    );

    res.json({ buildings: buildingsWithShifts });
  } catch (error) {
    console.error("Error fetching buildings with shifts:", error);
    res.status(500).json({ 
      message: "Error fetching buildings data",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}