import express from "express";
import rateLimit from "express-rate-limit";
import { UsersController } from "./users.controller";
import { validate } from "../../../middleware/validate";
import {
  OnboardingInput,
  UpdateProfileInput,
  UpdatePreferencesInput,
} from "@focusUp/shared-types";
import { requireAuth } from "../../../middleware/auth";

const router = express.Router();

const dataExportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === "test" ? 100 : 1,
  message: {
    error: "Data export is limited to once per hour.",
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// /api/v1/users/me
router.get("/me", requireAuth, UsersController.getMe);

// /api/v1/users/me (update profile)
router.patch(
  "/me",
  requireAuth,
  validate(UpdateProfileInput),
  UsersController.updateProfile,
);

// /api/v1/users/me/stats
router.get("/me/stats", requireAuth, UsersController.getStats);

// /api/v1/users/me/data-export
router.get(
  "/me/data-export",
  requireAuth,
  dataExportLimiter,
  UsersController.exportData,
);

// /api/v1/users/me/partners
router.get("/me/partners", requireAuth, UsersController.getPartners);

// /api/v1/users/me/preferences
router.get("/me/preferences", requireAuth, UsersController.getPreferences);
router.patch(
  "/me/preferences",
  requireAuth,
  validate(UpdatePreferencesInput),
  UsersController.updatePreferences,
);

// /api/v1/users/me/onboarding
router.patch(
  "/me/onboarding",
  requireAuth,
  validate(OnboardingInput),
  UsersController.updateOnboarding,
);

export default router;
