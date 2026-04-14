const Stripe = require("stripe");
const paypal = require("@paypal/checkout-server-sdk");

// Stripe Configuration - Check if API key exists
let stripe = null;
if (
  process.env.STRIPE_SECRET_KEY &&
  process.env.STRIPE_SECRET_KEY !== "your_stripe_secret_key_here"
) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  console.log("Stripe initialized successfully");
} else {
  console.warn("⚠️  Stripe API key not found. Stripe payments will not work.");
}

// PayPal Configuration
class PayPalClient {
  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID;
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    // Check if PayPal credentials exist
    if (
      this.clientId &&
      this.clientSecret &&
      this.clientId !== "your_paypal_client_id_here" &&
      this.clientSecret !== "your_paypal_client_secret_here"
    ) {
      this.environment =
        process.env.PAYPAL_MODE === "live"
          ? new paypal.core.LiveEnvironment(this.clientId, this.clientSecret)
          : new paypal.core.SandboxEnvironment(
              this.clientId,
              this.clientSecret,
            );
      this.client = new paypal.core.PayPalHttpClient(this.environment);
      console.log("PayPal initialized successfully");
    } else {
      console.warn(
        "⚠️  PayPal credentials not found. PayPal payments will not work.",
      );
      this.client = null;
    }
  }

  getClient() {
    return this.client;
  }
}

const paypalClient = new PayPalClient();

module.exports = {
  stripe,
  paypalClient,
};
