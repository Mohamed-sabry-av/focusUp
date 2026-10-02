import express from "express";
import { AdminController } from "./admin.controller";
import { requireAdmin } from "../../../middleware/require-admin";
import { validate } from "../../../middleware/validate";
import { z } from "zod";

const router = express.Router();

// All admin routes require admin role
router.use(requireAdmin);

const UpdateReportStatusInput = z.object({ status: z.string() });
const ManualStrikeInput = z.object({ reason: z.string().min(1) });

router.get("/reports", AdminController.listReports);
router.patch("/reports/:id", validate(UpdateReportStatusInput), AdminController.updateReportStatus);
router.get("/users/:id", AdminController.getUserDetails);
router.patch("/users/:id/ban", AdminController.banUser);
router.patch("/users/:id/unban", AdminController.unbanUser);
router.patch("/users/:id/strike", validate(ManualStrikeInput), AdminController.addManualStrike);

export default router;
