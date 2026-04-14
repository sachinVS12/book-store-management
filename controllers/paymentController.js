const { stripe, paypalClient } = require("../config/payment");
const Order = require("../models/Order");
const Payment = require("../models/Payment");
const Book = require("../models/Book");
const paypal = require("@paypal/checkout-server-sdk");

// @desc    Create Stripe Payment Intent
// @route   POST /api/payments/stripe/create-intent
// @access  Private
const createStripePaymentIntent = async (req, res) => {
  try {
    // Check if Stripe is initialized
    if (!stripe) {
      return res.status(503).json({
        success: false,
        message:
          "Stripe payment is not configured. Please add STRIPE_SECRET_KEY to .env file",
      });
    }

    const { orderId } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Verify order belongs to user
    if (order.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.totalAmount * 100), // Convert to cents
      currency: process.env.CURRENCY.toLowerCase(),
      metadata: {
        orderId: order._id.toString(),
        userId: req.user.id,
      },
      receipt_email: req.user.email,
    });

    // Save payment record
    await Payment.create({
      order: order._id,
      user: req.user.id,
      paymentMethod: "stripe",
      amount: order.totalAmount,
      paymentIntentId: paymentIntent.id,
      status: "pending",
    });

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error("Stripe payment error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Handle Stripe Webhook
// @route   POST /api/payments/stripe/webhook
// @access  Public
const handleStripeWebhook = async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ message: "Stripe not configured" });
  }

  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case "payment_intent.succeeded":
      const paymentIntent = event.data.object;
      await handleSuccessfulPayment(
        paymentIntent.metadata.orderId,
        "stripe",
        paymentIntent.id,
      );
      break;
    case "payment_intent.payment_failed":
      const failedPayment = event.data.object;
      await handleFailedPayment(
        failedPayment.metadata.orderId,
        "stripe",
        failedPayment.last_payment_error?.message,
      );
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
};

// @desc    Create PayPal Order
// @route   POST /api/payments/paypal/create-order
// @access  Private
const createPayPalOrder = async (req, res) => {
  try {
    // Check if PayPal is initialized
    if (!paypalClient.getClient()) {
      return res.status(503).json({
        success: false,
        message:
          "PayPal payment is not configured. Please add PayPal credentials to .env file",
      });
    }

    const { orderId } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Verify order belongs to user
    if (order.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: process.env.CURRENCY,
            value: order.totalAmount.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: process.env.CURRENCY,
                value: order.subtotal.toFixed(2),
              },
              tax_total: {
                currency_code: process.env.CURRENCY,
                value: order.tax.toFixed(2),
              },
              shipping: {
                currency_code: process.env.CURRENCY,
                value: order.shippingCost.toFixed(2),
              },
            },
          },
          items: order.items.map((item) => ({
            name: item.title,
            unit_amount: {
              currency_code: process.env.CURRENCY,
              value: item.price.toFixed(2),
            },
            quantity: item.quantity,
          })),
          reference_id: order._id.toString(),
        },
      ],
      application_context: {
        brand_name: "Book Store",
        landing_page: "NO_PREFERENCE",
        user_action: "PAY_NOW",
        return_url: `${process.env.CLIENT_URL || "http://localhost:3000"}/payment-success`,
        cancel_url: `${process.env.CLIENT_URL || "http://localhost:3000"}/payment-cancel`,
      },
    });

    const paypalOrder = await paypalClient.getClient().execute(request);

    // Save payment record
    await Payment.create({
      order: order._id,
      user: req.user.id,
      paymentMethod: "paypal",
      amount: order.totalAmount,
      transactionId: paypalOrder.result.id,
      status: "pending",
    });

    // Find approval URL
    const approvalUrl = paypalOrder.result.links.find(
      (link) => link.rel === "approve",
    ).href;

    res.status(200).json({
      success: true,
      orderId: paypalOrder.result.id,
      approvalUrl,
    });
  } catch (error) {
    console.error("PayPal payment error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Capture PayPal Order
// @route   POST /api/payments/paypal/capture-order
// @access  Private
const capturePayPalOrder = async (req, res) => {
  try {
    if (!paypalClient.getClient()) {
      return res.status(503).json({
        success: false,
        message: "PayPal payment is not configured",
      });
    }

    const { paypalOrderId } = req.body;

    const request = new paypal.orders.OrdersCaptureRequest(paypalOrderId);
    request.requestBody({});

    const capture = await paypalClient.getClient().execute(request);

    const orderId = capture.result.purchase_units[0].reference_id;

    if (capture.result.status === "COMPLETED") {
      await handleSuccessfulPayment(orderId, "paypal", capture.result.id);

      res.status(200).json({
        success: true,
        captureId: capture.result.id,
        orderId,
      });
    } else {
      throw new Error("Payment not completed");
    }
  } catch (error) {
    console.error("PayPal capture error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Process Cash on Delivery
// @route   POST /api/payments/cod/process
// @access  Private
const processCOD = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (process.env.COD_ENABLED !== "true") {
      return res
        .status(400)
        .json({ success: false, message: "COD is not enabled" });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Verify order belongs to user
    if (order.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    // Update order status for COD
    order.paymentStatus = "pending";
    order.orderStatus = "processing";
    await order.save();

    // Create payment record
    await Payment.create({
      order: order._id,
      user: req.user.id,
      paymentMethod: "cod",
      amount: order.totalAmount,
      status: "pending",
      paidAt: null,
    });

    res.status(200).json({
      success: true,
      message: "Order placed successfully with Cash on Delivery",
      data: order,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Process Refund
// @route   POST /api/payments/:paymentId/refund
// @access  Private/Admin
const processRefund = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { amount, reason } = req.body;

    const payment = await Payment.findById(paymentId).populate("order");

    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    if (payment.status === "refunded") {
      return res
        .status(400)
        .json({ success: false, message: "Payment already refunded" });
    }

    let refundResult;

    switch (payment.paymentMethod) {
      case "stripe":
        if (!stripe) {
          return res
            .status(503)
            .json({ success: false, message: "Stripe not configured" });
        }
        const refund = await stripe.refunds.create({
          payment_intent: payment.paymentIntentId,
          amount: amount ? Math.round(amount * 100) : undefined,
        });
        refundResult = refund;
        break;

      case "paypal":
        if (!paypalClient.getClient()) {
          return res
            .status(503)
            .json({ success: false, message: "PayPal not configured" });
        }
        const paypalRequest = new paypal.payments.CapturesRefundRequest(
          payment.transactionId,
        );
        paypalRequest.requestBody({
          amount: {
            currency_code: process.env.CURRENCY,
            value: (amount || payment.amount).toFixed(2),
          },
        });
        refundResult = await paypalClient.getClient().execute(paypalRequest);
        break;

      default:
        return res
          .status(400)
          .json({
            success: false,
            message: "Refund not supported for this payment method",
          });
    }

    // Update payment record
    payment.status = "refunded";
    payment.refundDetails = {
      amount: amount || payment.amount,
      reason,
      refundId: refundResult.id,
      refundedAt: new Date(),
    };
    await payment.save();

    // Update order
    payment.order.paymentStatus = "refunded";
    payment.order.orderStatus = "cancelled";
    await payment.order.save();

    res.status(200).json({
      success: true,
      message: "Refund processed successfully",
      data: payment,
    });
  } catch (error) {
    console.error("Refund error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// Helper function to handle successful payment
const handleSuccessfulPayment = async (
  orderId,
  paymentMethod,
  transactionId,
) => {
  const order = await Order.findById(orderId);
  if (!order) return;

  // Update order
  order.paymentStatus = "completed";
  order.orderStatus = "processing";
  order.paymentDetails = {
    ...order.paymentDetails,
    paymentId: transactionId,
  };
  await order.save();

  // Update payment record
  await Payment.findOneAndUpdate(
    { order: orderId, paymentMethod },
    {
      status: "succeeded",
      transactionId,
      paidAt: new Date(),
    },
  );

  // Update inventory
  for (const item of order.items) {
    await Book.findByIdAndUpdate(item.book, {
      $inc: { quantity: -item.quantity },
    });
  }
};

// Helper function to handle failed payment
const handleFailedPayment = async (orderId, paymentMethod, failureReason) => {
  // Update order
  await Order.findByIdAndUpdate(orderId, {
    paymentStatus: "failed",
    orderStatus: "cancelled",
    cancelledAt: new Date(),
  });

  // Update payment record
  await Payment.findOneAndUpdate(
    { order: orderId, paymentMethod },
    {
      status: "failed",
      failureReason,
    },
  );
};

module.exports = {
  createStripePaymentIntent,
  handleStripeWebhook,
  createPayPalOrder,
  capturePayPalOrder,
  processCOD,
  processRefund,
};
