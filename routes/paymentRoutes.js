const express = require("express");
const router = express.Router();
const {
  createStripePaymentIntent,
  handleStripeWebhook,
  createPayPalOrder,
  capturePayPalOrder,
  processCOD,
  processRefund,
} = require("../controllers/paymentController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Stripe routes
router.post("/stripe/create-intent", protect, createStripePaymentIntent);
router.post(
  "/stripe/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook,
);

// PayPal routes
router.post("/paypal/create-order", protect, createPayPalOrder);
router.post("/paypal/capture-order", protect, capturePayPalOrder);

// COD route
router.post("/cod/process", protect, processCOD);

// Refund route
router.post("/:paymentId/refund", protect, authorize("admin"), processRefund);

module.exports = router;
