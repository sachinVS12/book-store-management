const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["stripe", "paypal", "razorpay", "cod"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: process.env.CURRENCY || "USD",
    },
    status: {
      type: String,
      enum: ["pending", "processing", "succeeded", "failed", "refunded"],
      default: "pending",
    },
    transactionId: {
      type: String,
      unique: true,
      sparse: true,
    },
    paymentIntentId: String,
    paymentMethodId: String,
    receiptUrl: String,
    failureReason: String,
    metadata: {
      type: Map,
      of: String,
    },
    refundDetails: {
      amount: Number,
      reason: String,
      refundId: String,
      refundedAt: Date,
    },
    paidAt: Date,
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Payment", paymentSchema);
