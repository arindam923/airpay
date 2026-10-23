import assert from "node:assert/strict";
import { chromium } from "playwright";

const pageUrl = process.env.BROWSER_URL ?? "http://127.0.0.1:4312/browser/index.html";
const apiUrl = process.env.AIRPAY_BASE_URL ?? "http://127.0.0.1:4311";

const browser = await chromium.launch();
const page = await browser.newPage();

const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(error.message));

try {
  await page.goto(`${pageUrl}?api=${encodeURIComponent(apiUrl)}`);
  await page.waitForFunction(() => document.body.dataset.status, null, { timeout: 20_000 });

  const status = await page.getAttribute("body", "data-status");
  const output = await page.textContent("#out");

  assert.equal(status, "ok", `Browser example failed:\n${output}\n${consoleErrors.join("\n")}`);
  assert.match(output ?? "", /confirmed: succeeded/);

  console.log("Browser example passed");
  console.log((output ?? "").trim());
} finally {
  await browser.close();
}
