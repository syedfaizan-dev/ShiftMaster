import { Request, Response, NextFunction } from "express";
import { userService } from "../services/userService";
import { insertUserSchema } from "@db/schema";
import passport from "passport";

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .send("Invalid input: " + result.error.issues.map(i => i.message).join(", "));
      }

      const existingUser = await userService.findByUsername(result.data.username);

      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const newUser = await userService.createUser({
        ...result.data,
        isAdmin: false,
        isManager: false,
        isInspector: false,
      });

      // Only log in if not being created by an admin
      if (!req.user?.isAdmin) {
        req.login(newUser, (err) => {
          if (err) {
            return next(err);
          }
          return res.json({
            message: "Registration successful",
            user: { id: newUser.id, username: newUser.username },
          });
        });
      } else {
        return res.json({
          message: "Employee created successfully",
          user: { id: newUser.id, username: newUser.username },
        });
      }
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    passport.authenticate("local", (err: any, user: Express.User, info: any) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(400).send(info.message ?? "Login failed");
      }

      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }

        return res.json({
          message: "Login successful",
          user: { id: user.id, username: user.username },
        });
      });
    })(req, res, next);
  }

  async logout(req: Request, res: Response) {
    req.logout((err) => {
      if (err) {
        return res.status(500).send("Logout failed");
      }
      res.json({ message: "Logout successful" });
    });
  }

  async getCurrentUser(req: Request, res: Response) {
    if (req.isAuthenticated()) {
      return res.json(req.user);
    }
    res.status(401).send("Not logged in");
  }
}

export const authController = new AuthController();