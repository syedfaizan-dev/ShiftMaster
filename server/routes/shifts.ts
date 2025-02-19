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
  taskAssignments,
  inspectorGroups 
} from "@db/schema";

export async function getShifts(req: Request, res: Response) {
  try {
    // Get all shifts where the user is assigned as an inspector
    const userShifts = await db
      .select({
        shiftId: taskAssignments.shiftId,
      })
      .from(shiftInspectors)
      .leftJoin(inspectorGroups, eq(shiftInspectors.inspectorGroupId, inspectorGroups.id))
      .leftJoin(taskAssignments, eq(taskAssignments.inspectorGroupId, inspectorGroups.id))
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
        building: {
          id: buildings.id,
          name: buildings.name,
          code: buildings.code,
          area: buildings.area,
        },
      })
      .from(shifts)
      .leftJoin(buildings, eq(shifts.buildingId, buildings.id));

    // If not admin, only show shifts where the user is an inspector
    if (!req.user?.isAdmin) {
      const shiftIdsList = shiftIds.map(id => eq(shifts.id, id));
      query.where(or(...shiftIdsList));
    }

    const shiftsData = await query;

    // Get task assignments and details for each shift
    const shiftsWithDetails = await Promise.all(
      shiftsData.map(async (shift) => {
        // Get all task assignments for this shift
        const taskAssignmentsData = await db
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
        const taskAssignmentsWithDetails = await Promise.all(
          taskAssignmentsData.map(async (task) => {
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
          taskAssignments: taskAssignmentsWithDetails,
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

    const { buildingId, week, tasks } = req.body;

    if (!buildingId || !week || !tasks?.length) {
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
          createdBy: req.user!.id,
        })
        .returning();

      // Create task assignments and related data
      await Promise.all(
        tasks.map(async (task: {
          roleId: number;
          inspectorGroup: {
            name: string;
            inspectorIds: number[];
            days: Array<{ dayOfWeek: number; shiftTypeId: number }>;
          };
        }) => {
          // Create inspector group
          const [group] = await tx
            .insert(inspectorGroups)
            .values({
              name: task.inspectorGroup.name,
            })
            .returning();

          // Create task assignment
          await tx.insert(taskAssignments).values({
            shiftId: shift.id,
            roleId: task.roleId,
            inspectorGroupId: group.id,
          });

          // Add inspectors to group
          await Promise.all(
            task.inspectorGroup.inspectorIds.map(async (inspectorId) => {
              await tx.insert(shiftInspectors).values({
                inspectorGroupId: group.id,
                inspectorId,
                status: 'PENDING',
              });
            })
          );

          // Add daily assignments
          await Promise.all(
            task.inspectorGroup.days.map(async (day) => {
              await tx.insert(shiftDays).values({
                inspectorGroupId: group.id,
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
      building: {
        id: buildings.id,
        name: buildings.name,
        code: buildings.code,
        area: buildings.area,
      },
    })
    .from(shifts)
    .leftJoin(buildings, eq(shifts.buildingId, buildings.id))
    .where(eq(shifts.id, shiftId));

  if (!shift) return null;

  const taskAssignmentsData = await db
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
    .where(eq(taskAssignments.shiftId, shiftId));

  const taskAssignmentsWithDetails = await Promise.all(
    taskAssignmentsData.map(async (task) => {
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
    taskAssignments: taskAssignmentsWithDetails,
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
      .leftJoin(taskAssignments, eq(taskAssignments.inspectorGroupId, inspectorGroups.id))
      .where(
        and(
          eq(taskAssignments.shiftId, parseInt(shiftId)),
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