import { Request, Response } from "express";
import { userService } from "../services/userService";

export class UserController {
  async getAdmins(req: Request, res: Response) {
    try {
      const admins = await userService.getAdmins();
      res.json(admins);
    } catch (error) {
      console.error("Error fetching admins:", error);
      res.status(500).json({ message: "Error fetching admins" });
    }
  }

  async getManagers(req: Request, res: Response) {
    try {
      const managers = await userService.getManagers();
      res.json(managers);
    } catch (error) {
      console.error("Error fetching managers:", error);
      res.status(500).json({ message: "Error fetching managers" });
    }
  }

  async getInspectors(req: Request, res: Response) {
    try {
      const inspectors = await userService.getInspectors();
      res.json(inspectors);
    } catch (error) {
      console.error("Error fetching inspectors:", error);
      res.status(500).json({ message: "Error fetching inspectors" });
    }
  }

  async getEmployees(req: Request, res: Response) {
    try {
      const employees = await userService.getEmployees();
      res.json(employees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ message: "Error fetching employees" });
    }
  }
}

export const userController = new UserController();
