import { Hono } from "hono"
import { cors } from "hono/cors"
import { createAuth } from "./auth"
import checkoutRoutes from "./routes/checkout"
import merchantRoutes from "./routes/merchant"
import v1Routes from "./routes/v1/checkout"
import * as schema from "./db/schema"
import { handleBlockchainVerification } from "./cron"
import { checkHealth } from "./health"

export type MerchantProfile = typeof schema.merchantProfiles.$inferSelect

export type Env = {
  Bindings: {
    DB: D1Database
    BETTER_AUTH_URL: string
    BETTER_AUTH_SECRET: string
    FRONTEND_URL: string
    GOOGLE_CLIENT_ID?: string
    GOOGLE_CLIENT_SECRET?: string
    // Company wallets per network (from env)
    COMPANY_SOLANA_WALLET?: string
    COMPANY_ARBITRUM_WALLET?: string
    COMPANY_POLYGON_WALLET?: string
    COMPANY_ETHEREUM_WALLET?: string
  }
  Variables: {
    merchantProfile: MerchantProfile
    apiKey: {
      id: string
      type: string
      environment: string
      prefix: string
      lastFour: string
    }
  }
}

const app = new Hono<Env>()

// CORS for auth routes
app.use("/api/auth/*", cors({
  origin: ["https://airpay-frontend.arindam92.workers.dev", "http://localhost:3000"],
  credentials: true,
}))

// CORS for other API routes
app.use("/api/*", cors({
  origin: ["https://airpay-frontend.arindam92.workers.dev", "http://localhost:3000"],
  credentials: true,
}))

app.get("/", (c) => c.json({ message: "AirPay Server" }))

app.get("/api/health", async (c) => {
  const health = await checkHealth(c.env)
  return c.json(health, health.status === "ok" ? 200 : health.status === "degraded" ? 200 : 503)
})

app.on(["POST", "GET"], "/api/auth/*", async (c) => {
  console.log("Auth request:", c.req.method, c.req.url)
  const auth = createAuth({
    binding: c.env.DB,
    url: c.env.BETTER_AUTH_URL,
    secret: c.env.BETTER_AUTH_SECRET,
    frontendUrl: c.env.FRONTEND_URL,
    googleClientId: c.env.GOOGLE_CLIENT_ID,
    googleClientSecret: c.env.GOOGLE_CLIENT_SECRET,
  })
  const response = await auth.handler(c.req.raw)
  console.log("Auth response:", response.status, response.statusText)
  return response
})

// Mount checkout routes
app.route("/api/checkout", checkoutRoutes)

// Mount merchant routes
app.route("/api/merchant", merchantRoutes)

// Mount versioned public API (used by the official SDKs)
app.route("/api/v1", v1Routes)

// Cron trigger handler for blockchain verification
export default {
  fetch: app.fetch,
  async scheduled(event: any, env: any, ctx: any) {
    ctx.waitUntil(handleBlockchainVerification({ env }))
  }
}
