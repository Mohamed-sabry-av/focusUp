import express from "express";
import { BlocksController } from "./blocks.controller";
import { validate } from "../../../middleware/validate";
import { CreateBlockInput } from "@focusUp/shared-types";

const router = express.Router();

router.post("/", validate(CreateBlockInput), BlocksController.block);
router.delete("/:blockedId", BlocksController.unblock);
router.get("/", BlocksController.list);

export default router;
