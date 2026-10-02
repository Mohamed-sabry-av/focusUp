import express from 'express';

import { CreateFavoriteInput } from '@focusUp/shared-types';

import { validate } from '../../../middleware/validate';
import { FavoritesController } from './favorites.controller';

const router = express.Router();

// POST /api/v1/favorites — add a favorite
router.post('/', validate(CreateFavoriteInput), FavoritesController.add);

// DELETE /api/v1/favorites/:favoriteId — remove a favorite
router.delete('/:favoriteId', FavoritesController.remove);

// GET /api/v1/favorites — list my favorites
router.get('/', FavoritesController.list);

export default router;
