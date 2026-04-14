const Stripe = require("stripe");
const paypal = require("@paypal/checkout-server-sdk");

// Stripe Configuration
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// PayPal Configuration
class PayPalClient {
  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID;
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    this.environment =
      process.env.PAYPAL_MODE === "live"
        ? new paypal.core.LiveEnvironment(this.clientId, this.clientSecret)
        : new paypal.core.SandboxEnvironment(this.clientId, this.clientSecret);
    this.client = new paypal.core.PayPalHttpClient(this.environment);
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
