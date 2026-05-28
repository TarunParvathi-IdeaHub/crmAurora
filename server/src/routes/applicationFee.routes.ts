import { Router } from "express";
import {
  initiatePayment,
  paymentSuccess,
  paymentFailure,
  getPaymentStatus,
} from "../controllers/applicationFee/applicationFee.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// POST /api/application-fee/initiate-payment
// Called by the authenticated frontend to begin the payment flow.
router.post("/initiate-payment", authenticate, initiatePayment);

// POST /api/application-fee/payment-success
// EaseBuzz server-to-server callback on successful payment.
// No JWT authentication — called directly by EaseBuzz, not the browser.
router.post("/payment-success", paymentSuccess);

// POST /api/application-fee/payment-failure
// EaseBuzz server-to-server callback on failed/cancelled payment.
// No JWT authentication — called directly by EaseBuzz, not the browser.
router.post("/payment-failure", paymentFailure);

// GET /api/application-fee/status/:applicationId
// Called by the authenticated frontend to poll current payment status.
// Must be declared after static routes to prevent path conflicts.
router.get("/status/:applicationId", authenticate, getPaymentStatus);

export default router;
