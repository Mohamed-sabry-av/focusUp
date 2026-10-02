import type { Request, Response, NextFunction } from "express";
import { BlocksService } from "./blocks.service";

export class BlocksController {
  static async block(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Not authenticated", statusCode: 401 });
        return;
      }

      const blockerId = req.user.id;
      const { blockedId } = req.body as { blockedId: string };

      await BlocksService.blockUser(blockerId, blockedId);

      res.status(201).json({ data: { success: true }, statusCode: 201 });
    } catch (error) {
      next(error);
    }
  }

  static async unblock(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Not authenticated", statusCode: 401 });
        return;
      }

      const blockerId = req.user.id;
      const { blockedId } = req.params as { blockedId: string };

      const result = await BlocksService.unblockUser(blockerId, blockedId);

      res.status(200).json({ data: result, statusCode: 200 });
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

      const blocks = await BlocksService.listBlocks(req.user.id);

      res.status(200).json({ data: { blocks }, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }
}
