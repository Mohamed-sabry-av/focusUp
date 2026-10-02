import type { Request, Response, NextFunction } from "express";
import { ReportsService } from "./reports.service";
import type { CreateReportInput } from "@focusUp/shared-types";

export class ReportsController {
  static async create(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Not authenticated", statusCode: 401 });
        return;
      }

      const data = req.body as CreateReportInput;
      const report = await ReportsService.createReport(req.user.id, data);

      res.status(201).json({ data: { report }, statusCode: 201 });
    } catch (error) {
      next(error);
    }
  }

  static async list(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Not authenticated", statusCode: 401 });
        return;
      }

      const reports = await ReportsService.listMyReports(req.user.id);

      res.status(200).json({ data: { reports }, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }
}
