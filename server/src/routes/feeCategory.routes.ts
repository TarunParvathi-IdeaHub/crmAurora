import { Router } from "express";
import {
  createFeeCategory,
  updateFeeCategory,
  deleteFeeCategory,
  getAllFeeCategories,
  getFeeCategoriesByInstitution,
} from "../controllers/feeCategory/feeCategory.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// POST   /api/feecategory/create
router.post("/create", authenticate, createFeeCategory);

// PUT    /api/feecategory/update
router.put("/update", authenticate, updateFeeCategory);

// DELETE /api/feecategory/delete/:id
// NOTE: /delete/:id must be declared before /:institutionId so Express does not
// treat "delete" as an :institutionId parameter.
router.delete("/delete/:id", authenticate, deleteFeeCategory);

// GET    /api/feecategory/getall
// NOTE: /getall must be declared before /:institutionId so Express does not
// treat the literal string "getall" as an :institutionId parameter.
router.get("/getall", authenticate, getAllFeeCategories);

// GET    /api/feecategory/:institutionId
router.get("/:institutionId", authenticate, getFeeCategoriesByInstitution);

export default router;
