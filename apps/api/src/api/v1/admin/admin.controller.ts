import type { Request, Response, NextFunction } from "express";
import { AdminService } from "./admin.service";

export class AdminController {
  static async listReports(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Not authenticated", statusCode: 401 });
        return;
      }

      const status =
        typeof req.query.status === "string" ? req.query.status : undefined;
      const reason =
        typeof req.query.reason === "string" ? req.query.reason : undefined;
      const rawPage =
        typeof req.query.page === "string"
          ? parseInt(req.query.page, 10)
          : undefined;
      const rawLimit =
        typeof req.query.limit === "string"
          ? parseInt(req.query.limit, 10)
          : undefined;

      const page =
        rawPage !== undefined && !Number.isNaN(rawPage) ? rawPage : undefined;
      const limit =
        rawLimit !== undefined && !Number.isNaN(rawLimit)
          ? rawLimit
          : undefined;

      const data = await AdminService.listReports({
        status,
        reason,
        page,
        limit,
      });
      res.status(200).json({ data, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }

  static async updateReportStatus(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Not authenticated", statusCode: 401 });
        return;
      }

      const { id } = req.params as { id: string };
      const { status } = req.body as { status: string };

      const report = await AdminService.updateReportStatus(id, status);
      res.status(200).json({ data: { report }, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }

  static async getUserDetails(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Not authenticated", statusCode: 401 });
        return;
      }

      const { id } = req.params as { id: string };

      const user = await AdminService.getUserDetails(id);
      res.status(200).json({ data: { user }, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }

  static async banUser(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Not authenticated", statusCode: 401 });
        return;
      }

      const { id } = req.params as { id: string };

      const data = await AdminService.banUser(id);
      res.status(200).json({ data, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }

  static async unbanUser(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Not authenticated", statusCode: 401 });
        return;
      }

      const { id } = req.params as { id: string };

      const data = await AdminService.unbanUser(id);
      res.status(200).json({ data, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }

  static async addManualStrike(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Not authenticated", statusCode: 401 });
        return;
      }

      const { id } = req.params as { id: string };
      const { reason } = req.body as { reason: string };

      const data = await AdminService.addManualStrike(id, reason);
      res.status(200).json({ data, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }
}
