import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../../../utils/errors';
import { FavoritesService } from './favorites.service';

export class FavoritesController {
  static async add(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      const { favoriteId } = req.body as { favoriteId: string };
      await FavoritesService.addFavorite(req.user.id, favoriteId);
      res.status(201).json({ data: { success: true }, statusCode: 201 });
    } catch (error) {
      next(error);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      await FavoritesService.removeFavorite(req.user.id, String(req.params.favoriteId));
      res.status(200).json({ data: { success: true }, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      const favorites = await FavoritesService.listFavorites(req.user.id);
      res.status(200).json({ data: { favorites }, statusCode: 200 });
    } catch (error) {
      next(error);
    }
  }
}
