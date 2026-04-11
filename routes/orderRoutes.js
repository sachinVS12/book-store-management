const express = require("express");
const router = express.Router();
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getOrderStats,
} = require("../controllers/orderController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.route("/").post(protect, createOrder).get(protect, getOrders);

router.get("/stats", protect, authorize("admin"), getOrderStats);
router.get("/:id", protect, getOrderById);
router.put("/:id/status", protect, authorize("admin"), updateOrderStatus);
router.put("/:id/cancel", protect, cancelOrder);

module.exports = router;
