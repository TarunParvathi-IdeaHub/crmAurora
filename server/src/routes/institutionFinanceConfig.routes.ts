import { Router } from "express";
import {
  createFinanceConfig,
  getAllFinanceConfigs,
  getFinanceConfigByInstitution,
  editFinanceConfig,
} from "../controllers/institutionFinanceConfig/institutionFinanceConfig.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// POST   /api/institution-finance-config/create
router.post("/create", authenticate, createFinanceConfig);

// GET    /api/institution-finance-config/getall
// NOTE: /getall must be declared before /:institutionId so Express does not
// treat the literal string "getall" as an :institutionId parameter.
router.get("/getall", authenticate, getAllFinanceConfigs);

// GET    /api/institution-finance-config/:institutionId
router.get("/:institutionId", authenticate, getFinanceConfigByInstitution);

// PUT    /api/institution-finance-config/edit/:configId
router.put("/edit/:configId", authenticate, editFinanceConfig);

export default router;
