import { getDB } from "./db"
import * as schema from "./db/schema"
import { sql } from "drizzle-orm"
import { getRpcUrl } from "./blockchain/verify"

export interface HealthStatus {
  status: "ok" | "degraded" | "error"
  timestamp: string
  checks: {
    database: { ok: boolean; latencyMs: number; error?: string }
    solanaRpc: { ok: boolean; latencyMs: number; error?: string }
    ethereumRpc: { ok: boolean; latencyMs: number; error?: string }
    arbitrumRpc: { ok: boolean; latencyMs: number; error?: string }
    polygonRpc: { ok: boolean; latencyMs: number; error?: string }
  }
}

export async function checkHealth(env: { [key: string]: unknown }): Promise<HealthStatus> {
  const timestamp = new Date().toISOString()

  const dbCheck = await checkDatabase(env.DB as D1Database)
  const solanaRpc = await checkRpc("Solana", env)
  const ethereumRpc = await checkRpc("Ethereum", env)
  const arbitrumRpc = await checkRpc("Arbitrum", env)
  const polygonRpc = await checkRpc("Polygon", env)

  const allOk = dbCheck.ok && solanaRpc.ok && ethereumRpc.ok && arbitrumRpc.ok && polygonRpc.ok
  const anyError = !dbCheck.ok || !solanaRpc.ok || !ethereumRpc.ok || !arbitrumRpc.ok || !polygonRpc.ok

  return {
    status: allOk ? "ok" : anyError ? "error" : "degraded",
    timestamp,
    checks: {
      database: dbCheck,
      solanaRpc,
      ethereumRpc,
      arbitrumRpc,
      polygonRpc,
    },
  }
}

async function checkDatabase(binding: D1Database): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now()
  try {
    const db = getDB(binding)
    await db.run(sql`SELECT 1`)
    return { ok: true, latencyMs: Date.now() - start }
  } catch (err: any) {
    return { ok: false, latencyMs: Date.now() - start, error: err.message }
  }
}


async function checkRpc(
  network: string,
  env: { [key: string]: unknown },
): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now()
  try {
    const rpcUrl = getRpcUrl(network, env)

    if (network === "Solana") {
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth", params: [] }),
      })
      const data: any = await response.json()
      if (data?.result !== "ok") {
        return { ok: false, latencyMs: Date.now() - start, error: `Solana RPC health: ${data?.result ?? "unknown"}` }
      }
    } else {
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }),
      })
      const data: any = await response.json()
      if (!data?.result) {
        return { ok: false, latencyMs: Date.now() - start, error: "EVM RPC returned no block number" }
      }
    }

    return { ok: true, latencyMs: Date.now() - start }
  } catch (err: any) {
    return { ok: false, latencyMs: Date.now() - start, error: err.message }
  }
}
