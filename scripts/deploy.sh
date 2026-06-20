#!/bin/bash
set -e

echo "=== AirPay Deploy ==="
echo "Building and deploying frontend + server to Cloudflare..."
echo ""

echo "--- Deploying frontend (Next.js via OpenNext) ---"
npm run deploy -w frontend

echo ""
echo "--- Deploying server (Hono on Cloudflare Workers) ---"
npm run deploy -w server

echo ""
echo "=== AirPay Deploy Complete ==="
