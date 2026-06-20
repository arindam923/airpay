# AirPay

AirPay is a crypto payment gateway that lets merchants accept payments in Solana, Ethereum, Arbitrum, and Polygon. It handles session creation, checkout flows, wallet connections, and settlement tracking.

## Tech Stack

- **Frontend:** Next.js 15, React 19, Tailwind CSS, Framer Motion
- **Backend:** Hono (Cloudflare Workers)
- **Database:** Cloudflare D1 with Drizzle ORM
- **Auth:** Better Auth
- **Wallets:** Solana (wallet-adapter), EVM (Wagmi / Viem)
- **Deployment:** Cloudflare Pages (frontend), Cloudflare Workers (API)

## Project Structure

```
airpay/
├── frontend/          # Next.js app
│   ├── src/app/       # Pages and routes
│   ├── src/components/# UI components
│   └── wrangler.toml  # Cloudflare Pages config
├── server/            # Hono API
│   ├── src/           # Routes, auth, db logic
│   ├── drizzle/       # Migrations
│   └── wrangler.toml  # Worker config
├── scripts/           # Dev and deploy helpers
└── package.json       # Workspace root
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- A Cloudflare account (for D1 and Workers)

### Install

```bash
npm install
```

### Environment Setup

Create `server/.dev.vars` if it doesn't exist:

```
BETTER_AUTH_URL=http://localhost:8787
FRONTEND_URL=http://localhost:3000
COMPANY_SOLANA_WALLET=YOUR_SOLANA_WALLET_HERE
COMPANY_ARBITRUM_WALLET=YOUR_ARBITRUM_WALLET_HERE
COMPANY_POLYGON_WALLET=YOUR_POLYGON_WALLET_HERE
COMPANY_ETHEREUM_WALLET=YOUR_ETHEREUM_WALLET_HERE
```

### Run Locally

Start both frontend and server:

```bash
npm run dev
```

Or run them separately:

```bash
npm run dev:frontend
npm run dev:server
```

The frontend runs on `http://localhost:3000` and the API on `http://localhost:8787`.

### Database Migrations

Generate a new migration:

```bash
npm run db:generate -w server
```

Push schema changes to D1:

```bash
npm run db:migrate -w server
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend and API in parallel |
| `npm run build` | Build both frontend and server |
| `npm run deploy` | Deploy both to Cloudflare |
| `npm run deploy:frontend` | Deploy only the frontend |
| `npm run deploy:server` | Deploy only the server |

## Notes

- The `server/.dev.vars` file is included in the repo for convenience but only holds local placeholder values. Do not commit real secrets.
- Both apps are configured for Cloudflare. If you switch providers, you'll need to update `wrangler.toml` files and deployment scripts.

## License

MIT
