import { Request, Response } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@db";
import { shifts, users, roles, shiftTypes, buildings } from "@db/schema";
import express from "express";

// Create a router instead of using app directly
const router = express.Router();

// Type for the shift table row
type ShiftTableRow = {
  building: {
    name: string;
    area: string;
  };
  supervisor: {
    name: string;
  };
  supervisorShiftTime: string;
  coordinator1: {
    name: string;
    shiftTime: string;
  };
  coordinator2: {
    name: string;
    shiftTime: string;
  };
};

export async function getShifts(req: Request, res: Response) {
  try {
    const allShifts = await db
      .select({
        id: shifts.id,
        inspectorId: shifts.inspectorId,
        roleId: shifts.roleId,
        shiftTypeId: shifts.shiftTypeId,
        buildingId: shifts.buildingId,
        week: shifts.week,
        backupId: shifts.backupId,
        inspector: {
          id: users.id,
          fullName: users.fullName,
          username: users.username,
        },
        role: {
          id: roles.id,
          name: roles.name,
        },
        shiftType: {
          id: shiftTypes.id,
          name: shiftTypes.name,
          startTime: shiftTypes.startTime,
          endTime: shiftTypes.endTime,
        },
        building: {
          id: buildings.id,
          name: buildings.name,
          code: buildings.code,
          area: buildings.area,
        },
      })
      .from(shifts)
      .leftJoin(users, eq(shifts.inspectorId, users.id))
      .leftJoin(roles, eq(shifts.roleId, roles.id))
      .leftJoin(shiftTypes, eq(shifts.shiftTypeId, shiftTypes.id))
      .leftJoin(buildings, eq(shifts.buildingId, buildings.id));

    // If not admin, only show user's shifts
    if (!req.user?.isAdmin) {
      allShifts.where(eq(shifts.inspectorId, req.user!.id));
    }

    res.json(allShifts);
  } catch (error) {
    console.error("Error fetching shifts:", error);
    res.status(500).json({ message: "Error fetching shifts" });
  }
}

async function getShiftTable(req: Request, res: Response) {
  try {
    const shiftsData = await db
      .select({
        building: {
          name: buildings.name,
          area: buildings.area,
        },
        supervisor: {
          name: users.fullName,
        },
        shiftType: {
          startTime: shiftTypes.startTime,
          endTime: shiftTypes.endTime,
        },
      })
      .from(shifts)
      .leftJoin(buildings, eq(shifts.buildingId, buildings.id))
      .leftJoin(users, eq(shifts.inspectorId, users.id))
      .leftJoin(shiftTypes, eq(shifts.shiftTypeId, shiftTypes.id))
      .where(
        and(
          eq(users.isInspector, true),
          sql`DATE(${shifts.week}) = CURRENT_DATE`
        )
      );

    // Transform the data to match the table structure
    const transformedData: ShiftTableRow[] = shiftsData.reduce((acc: ShiftTableRow[], shift) => {
      if (!shift.building?.name) return acc;

      const existingBuilding = acc.find(
        (row) => row.building.name === shift.building.name
      );

      if (!existingBuilding) {
        acc.push({
          building: {
            name: shift.building.name,
            area: shift.building.area || "",
          },
          supervisor: {
            name: shift.supervisor?.name || "Unassigned",
          },
          supervisorShiftTime: shift.shiftType ? 
            `${shift.shiftType.startTime || "N/A"} - ${shift.shiftType.endTime || "N/A"}` : 
            "N/A",
          coordinator1: {
            name: "Coordinator A",
            shiftTime: "6 AM - 2 PM",
          },
          coordinator2: {
            name: "Coordinator F",
            shiftTime: "2 PM - 10 PM",
          },
        });
      }

      return acc;
    }, []);

    res.json(transformedData);
  } catch (error) {
    console.error("Error fetching shift table:", error);
    res.status(500).json({ message: "Error fetching shift table" });
  }
}

// Register routes
router.get("/", getShifts);
router.get("/table", getShiftTable);

export default router;