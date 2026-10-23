import { spawn } from "node:child_process";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const children = [];

function cleanup() {
  for (const child of children) child.kill("SIGTERM");
}

process.on("exit", cleanup);
process.on("SIGINT", () => {
  cleanup();
  process.exit(130);
});

function start(args) {
  const child = spawn(process.execPath, args, { stdio: "inherit" });
  children.push(child);
  return child;
}

function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", env: { ...process.env, ...env } });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function waitFor(url) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.status < 500) return;
    } catch {
      // not ready yet
    }
    await sleep(200);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

try {
  start(["mock-server.mjs"]);
  start(["server.mjs"]);
  await waitFor("http://127.0.0.1:4311/v1/account");
  await waitFor("http://127.0.0.1:4312/browser/index.html");

  await run(join("node_modules", ".bin", "tsx"), ["typescript/checkout.ts"], {
    AIRPAY_CONFIRM: "true",
  });
  await run(process.execPath, ["browser-check.mjs"]);
} finally {
  cleanup();
}
