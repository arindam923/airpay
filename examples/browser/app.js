import AirPayJS from "@airpay/js";

const params = new URLSearchParams(window.location.search);
const baseUrl = params.get("api") ?? "http://127.0.0.1:4311";
const publishableKey = params.get("key") ?? "pk_test_example";
const shouldConfirm = params.get("confirm") !== "0";
const output = document.querySelector("#out");

document.querySelector("#api").textContent = baseUrl;

function log(label, value) {
  output.textContent += `${label}: ${typeof value === "string" ? value : JSON.stringify(value)}\n`;
}

const airpay = new AirPayJS(publishableKey, { baseUrl });

try {
  const intentId = params.get("intent");
  const clientSecret = params.get("secret");
  const demo =
    intentId && clientSecret
      ? { id: intentId, client_secret: clientSecret }
      : await (await fetch(`${baseUrl}/demo/intent`)).json();

  const account = await airpay.getAccount();
  log("account", account.workspace_name);

  const config = await airpay.getConfig();
  log("chains", config.chains.map((chain) => chain.key));

  const intent = await airpay.retrieveIntent(demo.id, demo.client_secret);
  log("intent", intent.status);

  if (shouldConfirm) {
    const confirmed = await airpay.confirmIntent(demo.id, {
      txHash: `0x${"cd".repeat(32)}`,
      clientSecret: demo.client_secret,
    });
    log("confirmed", confirmed.status);
  }

  document.body.dataset.status = "ok";
} catch (error) {
  log("error", error instanceof Error ? error.message : String(error));
  document.body.dataset.status = "error";
}
