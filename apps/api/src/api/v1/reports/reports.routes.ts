import express from "express";
import { ReportsController } from "./reports.controller";
import { validate } from "../../../middleware/validate";
import { CreateReportInput } from "@focusUp/shared-types";

const router = express.Router();

// POST /api/v1/reports — submit a new report against another user
router.post("/", validate(CreateReportInput), ReportsController.create);

// GET /api/v1/reports — list all reports submitted by the authenticated user
router.get("/", ReportsController.list);

export default router;
