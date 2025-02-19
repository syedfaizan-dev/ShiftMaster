import { Request, Response } from "express";
import { eq, and, or } from "drizzle-orm";
import { db } from "@db";
import { 
  shifts, 
  users, 
  roles, 
  shiftTypes, 
  buildings, 
  shiftInspectors,
  shiftDays,
  inspectorGroups 
} from "@db/schema";

export async function getShifts(req: Request, res: Response) {
  try {
    // Get all shifts where the user is assigned as an inspector
    const userShifts = await db
      .select({
        shiftId: inspectorGroups.shiftId,
      })
      .from(shiftInspectors)
      .leftJoin(inspectorGroups, eq(shiftInspectors.inspectorGroupId, inspectorGroups.id))
      .where(eq(shiftInspectors.inspectorId, req.user!.id));

    const shiftIds = [...new Set(userShifts.map(s => s.shiftId))];

    // If no shifts found, return empty array
    if (shiftIds.length === 0 && !req.user?.isAdmin) {
      return res.json([]);
    }

    // Build the base query
    const query = db
      .select({
        id: shifts.id,
        week: shifts.week,
        groupName: shifts.groupName,
        status: shifts.status,
        building: {
          id: buildings.id,
          name: buildings.name,
          code: buildings.code,
          area: buildings.area,
        },
        role: {
          id: roles.id,
          name: roles.name,
        },
      })
      .from(shifts)
      .leftJoin(buildings, eq(shifts.buildingId, buildings.id))
      .leftJoin(roles, eq(shifts.roleId, roles.id));

    // If not admin, only show shifts where the user is an inspector
    if (!req.user?.isAdmin) {
      const shiftIdsList = shiftIds.map(id => eq(shifts.id, id));
      query.where(or(...shiftIdsList));
    }

    const shiftsData = await query;

    // Get inspector groups and details for each shift
    const shiftsWithDetails = await Promise.all(
      shiftsData.map(async (shift) => {
        const inspectorGroupsData = await db
          .select({
            id: inspectorGroups.id,
            name: inspectorGroups.name,
          })
          .from(inspectorGroups)
          .where(eq(inspectorGroups.shiftId, shift.id));

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

            // Get daily assignments
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

    res.json(shiftsWithDetails);
  } catch (error) {
    console.error('Error fetching shifts:', error);
    res.status(500).send((error as Error).message);
  }
}

export async function createShift(req: Request, res: Response) {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).send("Not authorized - Admin access required");
    }

    const { buildingId, week, roleId, groupName, inspectorGroups: groups } = req.body;

    if (!buildingId || !week || !roleId || !groupName || !groups?.length) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Start a transaction
    const result = await db.transaction(async (tx) => {
      // Create shift
      const [shift] = await tx
        .insert(shifts)
        .values({
          buildingId,
          week,
          roleId,
          groupName,
          status: 'PENDING',
          createdBy: req.user!.id,
        })
        .returning();

      // Create inspector groups and related data
      await Promise.all(
        groups.map(async (group: {
          name: string;
          inspectorIds: number[];
          days: Array<{ dayOfWeek: number; shiftTypeId: number }>;
        }) => {
          // Create inspector group
          const [inspectorGroup] = await tx
            .insert(inspectorGroups)
            .values({
              name: group.name,
              shiftId: shift.id,
            })
            .returning();

          // Add inspectors to group
          await Promise.all(
            group.inspectorIds.map(async (inspectorId) => {
              await tx.insert(shiftInspectors).values({
                inspectorGroupId: inspectorGroup.id,
                inspectorId,
                status: 'PENDING',
              });
            })
          );

          // Add daily assignments
          await Promise.all(
            group.days.map(async (day) => {
              await tx.insert(shiftDays).values({
                inspectorGroupId: inspectorGroup.id,
                dayOfWeek: day.dayOfWeek,
                shiftTypeId: day.shiftTypeId,
              });
            })
          );
        })
      );

      return shift;
    });

    // Get complete shift details
    const completeShift = await getShiftDetails(result.id);
    res.json(completeShift);
  } catch (error) {
    console.error('Error creating shift:', error);
    res.status(500).json({ message: "Error creating shift" });
  }
}

async function getShiftDetails(shiftId: number) {
  const [shift] = await db
    .select({
      id: shifts.id,
      week: shifts.week,
      groupName: shifts.groupName,
      status: shifts.status,
      building: {
        id: buildings.id,
        name: buildings.name,
        code: buildings.code,
        area: buildings.area,
      },
      role: {
        id: roles.id,
        name: roles.name,
      },
    })
    .from(shifts)
    .leftJoin(buildings, eq(shifts.buildingId, buildings.id))
    .leftJoin(roles, eq(shifts.roleId, roles.id))
    .where(eq(shifts.id, shiftId));

  if (!shift) return null;

  const inspectorGroupsData = await db
    .select({
      id: inspectorGroups.id,
      name: inspectorGroups.name,
    })
    .from(inspectorGroups)
    .where(eq(inspectorGroups.shiftId, shiftId));

  const inspectorGroupsWithDetails = await Promise.all(
    inspectorGroupsData.map(async (group) => {
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
}

export async function handleShiftInspectorResponse(req: Request, res: Response) {
  try {
    const { shiftId, inspectorId } = req.params;
    const { action, rejectionReason } = req.body;

    if (!['ACCEPT', 'REJECT'].includes(action)) {
      return res.status(400).json({ message: "Invalid action. Must be ACCEPT or REJECT" });
    }

    // Verify the inspector making the request is the same as the one assigned
    if (parseInt(inspectorId) !== req.user?.id) {
      return res.status(403).json({ message: "Not authorized to respond to this shift" });
    }

    // Get the shift inspector record
    const [shiftInspector] = await db
      .select()
      .from(shiftInspectors)
      .leftJoin(inspectorGroups, eq(shiftInspectors.inspectorGroupId, inspectorGroups.id))
      .where(
        and(
          eq(inspectorGroups.shiftId, parseInt(shiftId)),
          eq(shiftInspectors.inspectorId, parseInt(inspectorId))
        )
      )
      .limit(1);

    if (!shiftInspector) {
      return res.status(404).json({ message: "Shift assignment not found" });
    }

    if (shiftInspector.status !== 'PENDING') {
      return res.status(400).json({ message: "Shift has already been processed" });
    }

    if (action === 'REJECT' && !rejectionReason) {
      return res.status(400).json({ message: "Rejection reason is required" });
    }

    // Update the shift inspector status
    const [updatedShiftInspector] = await db
      .update(shiftInspectors)
      .set({
        status: action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED',
        responseAt: new Date(),
        rejectionReason: action === 'REJECT' ? rejectionReason : null,
      })
      .where(eq(shiftInspectors.id, shiftInspector.id))
      .returning();

    res.json(updatedShiftInspector);
  } catch (error) {
    console.error("Error processing shift inspector response:", error);
    res.status(500).json({ message: "Error processing shift inspector response" });
  }
}

export default {
  getShifts,
  createShift,
  handleShiftInspectorResponse,
};