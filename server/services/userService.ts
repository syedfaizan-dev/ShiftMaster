import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { userRepository } from "../repositories/userRepository";
import type { User } from "@db/schema";

const scryptAsync = promisify(scrypt);

class UserService {
  async findByUsername(username: string): Promise<User | null> {
    return userRepository.findByUsername(username);
  }

  async findById(id: number): Promise<User | null> {
    return userRepository.findById(id);
  }

  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  }

  async verifyPassword(suppliedPassword: string, storedPassword: string): Promise<boolean> {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  }

  async createUser(userData: Omit<User, "id">): Promise<User> {
    const hashedPassword = await this.hashPassword(userData.password);
    return userRepository.create({
      ...userData,
      password: hashedPassword,
    });
  }

  async getAdmins(): Promise<Omit<User, "password">[]> {
    return userRepository.findAdmins();
  }

  async getManagers(): Promise<Omit<User, "password">[]> {
    return userRepository.findManagers();
  }

  async getInspectors(): Promise<Omit<User, "password">[]> {
    return userRepository.findInspectors();
  }

  async getEmployees(): Promise<Omit<User, "password">[]> {
    return userRepository.findEmployees();
  }
}

export const userService = new UserService();