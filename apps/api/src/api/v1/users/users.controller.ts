import type { Request, Response, NextFunction } from "express";
import { UsersService } from "./users.service";
import type { OnboardingInput } from "@focusUp/shared-types";

export class UsersController {
  static async getMe(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Not authenticated", statusCode: 401 });
        return;
      }

      const user = await UsersService.getCurrentUser(req.user.id);
      res.status(200).json({ data: { user }, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }

  static async getStats(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Not authenticated", statusCode: 401 });
        return;
      }

      const stats = await UsersService.getUserStats(req.user.id);
      res.status(200).json({ data: stats, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }

  static async updateOnboarding(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Not authenticated", statusCode: 401 });
        return;
      }

      const data = req.body as OnboardingInput;
      const user = await UsersService.updateOnboarding(req.user.id, data);

      res.status(200).json({ data: { user }, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }

  static async exportData(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Not authenticated", statusCode: 401 });
        return;
      }
      const data = await UsersService.getDataExport(req.user.id);
      const filename = `focusup-data-export-${new Date().toISOString().split("T")[0]}.json`;
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }

  static async getPartners(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Not authenticated", statusCode: 401 });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await UsersService.getPreviousPartners(
        req.user.id,
        page,
        limit,
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Not authenticated", statusCode: 401 });
        return;
      }
      const user = await UsersService.updateProfile(req.user.id, req.body);
      res.status(200).json({ data: { user }, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }

  static async getPreferences(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Not authenticated", statusCode: 401 });
        return;
      }
      const prefs = await UsersService.getPreferences(req.user.id);
      res.status(200).json({ data: { preferences: prefs }, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }

  static async updatePreferences(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Not authenticated", statusCode: 401 });
        return;
      }
      const prefs = await UsersService.updatePreferences(req.user.id, req.body);
      res.status(200).json({ data: { preferences: prefs }, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }
}
