import assert from "node:assert/strict";
import { AirPay, AirPayError } from "@airpay/sdk";
import { computeSignature, constructEvent } from "@airpay/sdk/webhooks";

const baseUrl = process.env.AIRPAY_BASE_URL ?? "http://127.0.0.1:4311";
const apiKey = process.env.AIRPAY_SECRET_KEY ?? "ap_test_example";
const shouldConfirm = process.env.AIRPAY_CONFIRM === "true";

const airpay = new AirPay({ apiKey, baseUrl });

const account = await airpay.account.retrieve();
assert.equal(account.object, "account");
assert.equal(account.key.kind, "secret");

const config = await airpay.config.retrieve();
assert.ok(config.chains.length > 0);

const chainKey = process.env.AIRPAY_CHAIN ?? config.chains[0]?.key;
const chain = config.chains.find((entry) => entry.key === chainKey);
assert.ok(chain, `Chain ${chainKey} is not enabled for this workspace.`);
const tokenFromEnv = process.env.AIRPAY_TOKEN;
const token =
  tokenFromEnv === "USDC" || tokenFromEnv === "ETH" ? tokenFromEnv : chain.tokens[0]?.symbol;
assert.ok(token, `No token is enabled on ${chain.key}.`);

const session = await airpay.checkoutSessions.create({
  amount: 1250,
  chain: chain.key,
  token,
  successUrl: "https://shop.example/ok",
  clientReferenceId: `sdk_example_${Date.now()}`,
});
assert.equal(session.object, "checkout.session");
assert.match(session.url, /\/checkout\/cs_/);

const intent = await airpay.paymentIntents.create(
  {
    amount: 1250,
    chain: chain.key,
    token,
    metadata: { source: "sdk-example" },
  },
  { idempotencyKey: `sdk-example-${Date.now()}` },
);
assert.ok(intent.client_secret);

const retrieved = await airpay.paymentIntents.retrieve(intent.id, {
  clientSecret: intent.client_secret,
});
assert.equal(retrieved.id, intent.id);
assert.equal(retrieved.status, "requires_payment");

let confirmed = retrieved;
if (shouldConfirm) {
  confirmed = await airpay.paymentIntents.confirm(intent.id, {
    txHash: `0x${"ab".repeat(32)}`,
    clientSecret: intent.client_secret,
  });
  assert.equal(confirmed.status, "succeeded");
  assert.equal(confirmed.confirmations, confirmed.required_confirmations);
}

const webhookSecret = "whsec_example";
const timestamp = Math.floor(Date.now() / 1000);
const payload = JSON.stringify({
  id: "evt_example",
  type: "payment.confirmed",
  createdAt: Date.now(),
  environment: "sandbox",
  data: { intent_id: intent.id },
});
const signature = computeSignature(webhookSecret, timestamp, payload);
const event = constructEvent(payload, `t=${timestamp},v1=${signature}`, webhookSecret, {
  now: timestamp,
});
assert.equal(event.type, "payment.confirmed");

let missingIntentError: unknown;
try {
  await airpay.paymentIntents.retrieve("pi_missing");
} catch (error) {
  missingIntentError = error;
}
assert.ok(missingIntentError instanceof AirPayError);
assert.equal(missingIntentError.statusCode, 404);
assert.equal(missingIntentError.code, "resource_missing");

console.log("TypeScript example passed");
console.log(
  JSON.stringify(
    {
      baseUrl,
      account: account.workspace_name,
      environment: account.environment,
      chain: chain.key,
      token,
      checkoutId: session.id,
      checkoutUrl: session.url,
      intentId: intent.id,
      clientSecret: intent.client_secret,
      intentStatus: confirmed.status,
      webhook: event.type,
      missingIntentCode: missingIntentError.code,
    },
    null,
    2,
  ),
);
