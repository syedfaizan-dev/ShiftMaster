import { Request, Response } from "express";
import { db } from "@db";
import { 
  weeklyShiftAssignments, weeklyInspectorGroups, 
  weeklyGroupInspectors, dailyShiftTypes,
  buildings, users, roles, shiftTypes 
} from "@db/schema";
import { eq } from "drizzle-orm";

export async function createWeeklyShiftAssignment(req: Request, res: Response) {
  try {
    const { buildingId, week, inspectorGroups } = req.body;

    // Start a transaction
    const result = await db.transaction(async (tx) => {
      // Create weekly shift assignment
      const [weeklyAssignment] = await tx
        .insert(weeklyShiftAssignments)
        .values({
          buildingId,
          week,
          status: 'PENDING',
          createdBy: req.user!.id,
        })
        .returning();

      // Create inspector groups with their daily shifts
      for (const group of inspectorGroups) {
        // Create inspector group
        const [inspectorGroup] = await tx
          .insert(weeklyInspectorGroups)
          .values({
            weeklyShiftAssignmentId: weeklyAssignment.id,
            roleId: group.roleId,
          })
          .returning();

        // Add inspectors to group
        await tx.insert(weeklyGroupInspectors).values(
          group.inspectors.map((inspector: any) => ({
            weeklyInspectorGroupId: inspectorGroup.id,
            inspectorId: inspector.id,
            isPrimary: inspector.isPrimary,
          }))
        );

        // Add daily shift types
        await tx.insert(dailyShiftTypes).values(
          group.dailyShifts.map((shift: any) => ({
            weeklyInspectorGroupId: inspectorGroup.id,
            dayOfWeek: shift.dayOfWeek,
            shiftTypeId: shift.shiftTypeId,
          }))
        );
      }

      return weeklyAssignment;
    });

    res.json(result);
  } catch (error) {
    console.error('Error creating weekly shift assignment:', error);
    res.status(500).json({ message: "Error creating weekly shift assignment" });
  }
}

export async function getWeeklyShiftAssignment(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const assignment = await db
      .select()
      .from(weeklyShiftAssignments)
      .where(eq(weeklyShiftAssignments.id, parseInt(id)))
      .limit(1);

    if (!assignment.length) {
      return res.status(404).json({ message: "Weekly shift assignment not found" });
    }

    // Get all related data
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
      .where(eq(weeklyInspectorGroups.weeklyShiftAssignmentId, assignment[0].id));

    // Get inspectors and daily shifts for each group
    const groupsWithDetails = await Promise.all(
      inspectorGroups.map(async (group) => {
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
      })
    );

    res.json({
      ...assignment[0],
      inspectorGroups: groupsWithDetails,
    });
  } catch (error) {
    console.error('Error fetching weekly shift assignment:', error);
    res.status(500).json({ message: "Error fetching weekly shift assignment" });
  }
}

export async function updateWeeklyShiftAssignment(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { inspectorGroups } = req.body;

    await db.transaction(async (tx) => {
      for (const group of inspectorGroups) {
        // Update inspectors
        await tx
          .delete(weeklyGroupInspectors)
          .where(eq(weeklyGroupInspectors.weeklyInspectorGroupId, group.id));

        await tx.insert(weeklyGroupInspectors).values(
          group.inspectors.map((inspector: any) => ({
            weeklyInspectorGroupId: group.id,
            inspectorId: inspector.id,
            isPrimary: inspector.isPrimary,
          }))
        );

        // Update daily shifts
        await tx
          .delete(dailyShiftTypes)
          .where(eq(dailyShiftTypes.weeklyInspectorGroupId, group.id));

        await tx.insert(dailyShiftTypes).values(
          group.dailyShifts.map((shift: any) => ({
            weeklyInspectorGroupId: group.id,
            dayOfWeek: shift.dayOfWeek,
            shiftTypeId: shift.shiftTypeId,
          }))
        );
      }
    });

    res.json({ message: "Weekly shift assignment updated successfully" });
  } catch (error) {
    console.error('Error updating weekly shift assignment:', error);
    res.status(500).json({ message: "Error updating weekly shift assignment" });
  }
}

export async function deleteWeeklyShiftAssignment(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await db.transaction(async (tx) => {
      // Get all inspector groups
      const groups = await tx
        .select()
        .from(weeklyInspectorGroups)
        .where(eq(weeklyInspectorGroups.weeklyShiftAssignmentId, parseInt(id)));

      // Delete all related data
      for (const group of groups) {
        await tx
          .delete(dailyShiftTypes)
          .where(eq(dailyShiftTypes.weeklyInspectorGroupId, group.id));

        await tx
          .delete(weeklyGroupInspectors)
          .where(eq(weeklyGroupInspectors.weeklyInspectorGroupId, group.id));

        await tx
          .delete(weeklyInspectorGroups)
          .where(eq(weeklyInspectorGroups.id, group.id));
      }

      // Delete the weekly assignment
      await tx
        .delete(weeklyShiftAssignments)
        .where(eq(weeklyShiftAssignments.id, parseInt(id)));
    });

    res.json({ message: "Weekly shift assignment deleted successfully" });
  } catch (error) {
    console.error('Error deleting weekly shift assignment:', error);
    res.status(500).json({ message: "Error deleting weekly shift assignment" });
  }
}
