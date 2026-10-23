This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## AirPay — testnet payments (EVM)

Real wallet connect + on-chain verification, **testnet only** (no real funds move).

### 1. Configure

```bash
cp .env.example .env.local
```

| Variable | Required | Purpose |
| --- | --- | --- |
| `RECEIVER_ADDRESS` | yes | Testnet EVM address (`0x…`) that receives merchant funds |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | optional | [Reown/ WalletConnect Cloud](https://cloud.reown.com) ID — without it only browser wallets (MetaMask etc.) are offered |
| `ETHERSCAN_API_KEY` | optional | [Etherscan v2](https://etherscan.io/apis) key — enables QR auto-detection of incoming transfers (QR payers can always paste the tx hash manually) |
| `RPC_*` | optional | Per-chain RPC overrides; public RPCs are the default |

Supported testnets: **Base Sepolia, Ethereum Sepolia, Arbitrum Sepolia, Optimism Sepolia, Polygon Amoy** (Circle-issued testnet USDC + native ETH).

### 2. Fund a wallet

1. Gas: any testnet faucet — e.g. [Alchemy Sepolia faucets](https://faucets.chain.link/), or your wallet's built-in faucet.
2. USDC: [Circle faucet](https://faucet.circle.com) (20 testnet USDC per address / network / 2h).

### 3. Run

```bash
npm install
npm run dev:all     # next dev + verification worker
```

Or in two terminals:

```bash
npm run dev         # app on http://localhost:3000
npm run worker      # transaction verification worker (polls every 5s)
```

### 4. Pay

Open a checkout link (from the dashboard **New payment link**, or a demo: `http://localhost:3000/pay/demo`), then:

- **Wallet**: connect → the app switches you to the selected testnet if needed → Pay → confirm in the wallet.
- **QR**: send the exact amount, then paste the transaction hash (or leave the tab open — with `ETHERSCAN_API_KEY` the worker auto-detects it).

The worker independently re-verifies every transaction on-chain (sender, recipient, exact amount, token contract, receipt status) and needs **2 confirmations** before the checkout shows *Payment confirmed*.

Intents are stored in Neon Postgres via `DATABASE_URL` and expire after 15 minutes.

### Deploying on Vercel Hobby (free)

Vercel Hobby only allows cron jobs **once per day**, so the per-minute reconciler
is driven by an external scheduler instead:

1. Generate and set `CRON_SECRET` in the Vercel project environment
   (`openssl rand -hex 32`), then redeploy.
2. Create a free [cron-job.org](https://cron-job.org) job:
   - URL: `https://<your-app>.vercel.app/api/cron/verify`
   - Schedule: every minute
   - Header: `Authorization: Bearer <CRON_SECRET>`
   - Enable failure notifications.
3. Vercel Cron calls `GET /api/cron/cleanup` once a day (`0 3 * * *`) to prune
   terminal intents, stale kv rows, delivered webhook events and expired
   idempotency keys.

`GET /api/cron/verify` is the safety net for users who close the tab before a QR
payment lands; an open checkout still self-heals every few seconds. Both routes
reject requests without the bearer secret in production.

### SDKs

| Language | Package | Source |
| --- | --- | --- |
| TypeScript / Node | `npm install @airpay/sdk` | `sdk/typescript` |
| Browser JS | `npm install @airpay/js` | `sdk/js` |
| Python | `pip install airpay` | `sdk/python` |
| Go | `go get github.com/arindam923/airpay/sdk/go` | `sdk/go` |
| PHP | `composer require airpay/airpay` | `sdk/php` |

Release instructions and required repository secrets are in
[`sdk/PUBLISHING.md`](sdk/PUBLISHING.md).

### Useful commands

```bash
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm run build       # production build
```
