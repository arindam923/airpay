"use client"

import React, { useState } from "react"
import Link from "next/link"
import { 
  Cpu, Search, BookOpen, Key, Smartphone, Terminal, 
  Settings, ChevronRight, Copy, Check, ExternalLink, ArrowLeft,
  Info, AlertTriangle, ShieldCheck
} from "lucide-react"

type DocSection = 
  | "overview" 
  | "quickstart" 
  | "auth" 
  | "checkout" 
  | "webhooks" 
  | "gas" 
  | "sdk-node" 
  | "sdk-py"

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<DocSection>("quickstart")
  const [langTab, setLangTab] = useState<"nodejs" | "python" | "go" | "curl">("nodejs")
  const [copied, setCopied] = useState(false)

  const copyCode = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Code snippets data
  const codeSnippets = {
    quickstart: {
      nodejs: `import AirPay from '@airpay/sdk';\nconst airpay = new AirPay('sk_test_51P8...');`,
      python: `import airpay\nairpay.api_key = "sk_test_51P8..."`,
      go: `package main\nimport "github.com/airpay/airpay-go"\nfunc main() {\n  airpay.Key = "sk_test_51P8..."\n}`,
      curl: `curl https://api.airpay.io/v1/checkout/sessions \\\n  -u sk_test_51P8...:`
    },
    auth: {
      nodejs: `import AirPay from '@airpay/sdk';\n// Initialize client with secret key\nconst airpay = new AirPay('sk_live_51P8...');`,
      python: `import airpay\n# Assign secret key globally\nairpay.api_key = "sk_live_51P8..."`,
      go: `package main\nimport "github.com/airpay/airpay-go"\n\nfunc main() {\n  airpay.Key = "sk_live_51P8..."\n}`,
      curl: `curl https://api.airpay.io/v1/balances \\\n  -H "Authorization: Bearer sk_live_51P8..."`
    },
    checkout: {
      nodejs: `const session = await airpay.checkout.sessions.create({\n  amount: 25000, // $250.00\n  currency: "usdc",\n  network: "solana",\n  success_url: "https://example.com/success",\n  cancel_url: "https://example.com/cancel",\n});\nconsole.log(session.url);`,
      python: `session = airpay.checkout.Session.create(\n    amount=25000, # $250.00\n    currency="usdc",\n    network="solana",\n    success_url="https://example.com/success",\n    cancel_url="https://example.com/cancel",\n)\nprint(session.url)`,
      go: `params := &airpay.CheckoutSessionParams{\n  Amount:     airpay.Int64(25000),\n  Currency:   airpay.String("usdc"),\n  Network:    airpay.String("solana"),\n  SuccessURL: airpay.String("https://example.com/success"),\n  CancelURL:  airpay.String("https://example.com/cancel"),\n}\nsession, _ := airpay.CheckoutSession.New(params)`,
      curl: `curl https://api.airpay.io/v1/checkout/sessions \\\n  -d amount=25000 \\\n  -d currency=usdc \\\n  -d network=solana \\\n  -d success_url="https://example.com/success" \\\n  -d cancel_url="https://example.com/cancel"`
    },
    webhooks: {
      nodejs: `// Verify webhook signature (Express)\nimport express from 'express';\nconst app = express();\n\napp.post('/webhooks', express.raw({type: 'application/json'}), (req, res) => {\n  const sig = req.headers['airpay-signature'];\n  let event = airpay.webhooks.constructEvent(req.body, sig, endpointSecret);\n  \n  if (event.type === 'payment.succeeded') {\n    console.log('Payment Succeeded!');\n  }\n  res.json({received: true});\n});`,
      python: `@app.route('/webhooks', methods=['POST'])\ndef webhook():\n    payload = request.data\n    sig_header = request.headers.get('AirPay-Signature')\n    event = airpay.Webhook.construct_event(payload, sig_header, endpoint_secret)\n    \n    if event['type'] == 'payment.succeeded':\n        # Settle invoice\n        pass\n    return jsonify(success=True)`,
      go: `func handleWebhook(w http.ResponseWriter, req *http.Request) {\n  const endpointSecret = "whsec_..."\n  payload, _ := io.ReadAll(req.Body)\n  sig := req.Header.Get("AirPay-Signature")\n  \n  event, _ := webhook.ConstructEvent(payload, sig, endpointSecret)\n  if event.Type == "payment.succeeded" {\n    // Fulfill order\n  }\n}`,
      curl: `# Test webhooks locally using CLI\nairpay trigger payment.succeeded`
    }
  }

  // Response payloads data
  const responsePayloads = {
    quickstart: `{
  "object": "balance",
  "available": [
    {
      "amount": 145000,
      "currency": "usdc",
      "network": "solana"
    }
  ]
}`,
    auth: `{
  "authenticated": true,
  "scope": "live_keys",
  "environment": "production"
}`,
    checkout: `{
  "id": "sess_9xJ1ka8",
  "object": "checkout.session",
  "amount": 25000,
  "currency": "usdc",
  "network": "solana",
  "status": "open",
  "url": "https://checkout.airpay.io/pay/sess_9xJ1ka8",
  "created_at": 1780829103
}`,
    webhooks: `{
  "id": "evt_9xJk8S2",
  "object": "event",
  "type": "payment.succeeded",
  "created": 1780829150,
  "data": {
    "id": "pay_2m7a8h",
    "amount": 25000,
    "currency": "usdc",
    "network": "solana",
    "transaction_hash": "3kF92JkKsa81HskWp..."
  }
}`
  }

  const getSnippet = () => {
    const section = activeSection as keyof typeof codeSnippets
    if (codeSnippets[section]) {
      return codeSnippets[section][langTab]
    }
    return `// Documentation Reference for ${activeSection}`
  }

  const getResponse = () => {
    const section = activeSection as keyof typeof responsePayloads
    return responsePayloads[section] || `{ "status": "200 OK" }`
  }

  return (
    <div className="min-h-screen bg-black text-neutral-200 flex flex-col font-sans">
      
      {/* 3-Pane Layout container */}
      <div className="flex-1 flex flex-col md:flex-row items-stretch">
        
        {/* PANE 1: Sidebar Navigation (Left) */}
        <aside className="w-full md:w-[260px] bg-neutral-950 border-r border-neutral-900 flex flex-col shrink-0">
          {/* Logo header */}
          <div className="h-16 px-6 border-b border-neutral-900 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <Cpu className="w-4 h-4 text-indigo-400 group-hover:text-white transition-colors" />
              <span className="font-extrabold text-sm text-white tracking-tight">
                Air<span className="text-indigo-400 font-medium group-hover:text-white transition-colors">Pay Docs</span>
              </span>
            </Link>
            <Link href="/" className="text-[10px] font-mono text-neutral-500 hover:text-white flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-3 h-3" />
              <span>Back</span>
            </Link>
          </div>

          {/* Search bar */}
          <div className="px-4 py-4 border-b border-neutral-900">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-600" />
              <input 
                type="text" 
                placeholder="Search documentation..."
                className="w-full bg-black border border-neutral-900 rounded px-8 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-700 transition-colors"
                disabled
              />
            </div>
          </div>

          {/* Sidebar Nav Links */}
          <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-7 text-xs select-none">
            <div>
              <span className="font-mono text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-3 px-2">
                Getting Started
              </span>
              <ul className="space-y-1.5 font-medium">
                <li>
                  <button 
                    onClick={() => setActiveSection("overview")}
                    className={`w-full text-left px-2 py-1.5 rounded transition-colors ${activeSection === "overview" ? "bg-neutral-900 text-white" : "text-neutral-450 hover:text-neutral-200"}`}
                  >
                    Overview
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveSection("quickstart")}
                    className={`w-full text-left px-2 py-1.5 rounded transition-colors ${activeSection === "quickstart" ? "bg-neutral-900 text-white" : "text-neutral-450 hover:text-neutral-200"}`}
                  >
                    Quickstart Guide
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveSection("auth")}
                    className={`w-full text-left px-2 py-1.5 rounded transition-colors ${activeSection === "auth" ? "bg-neutral-900 text-white" : "text-neutral-450 hover:text-neutral-200"}`}
                  >
                    Authentication
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <span className="font-mono text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-3 px-2">
                Core APIs
              </span>
              <ul className="space-y-1.5 font-medium">
                <li>
                  <button 
                    onClick={() => setActiveSection("checkout")}
                    className={`w-full text-left px-2 py-1.5 rounded transition-colors ${activeSection === "checkout" ? "bg-neutral-900 text-white" : "text-neutral-450 hover:text-neutral-200"}`}
                  >
                    Hosted Checkout
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveSection("webhooks")}
                    className={`w-full text-left px-2 py-1.5 rounded transition-colors ${activeSection === "webhooks" ? "bg-neutral-900 text-white" : "text-neutral-450 hover:text-neutral-200"}`}
                  >
                    Webhook Listener
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveSection("gas")}
                    className={`w-full text-left px-2 py-1.5 rounded transition-colors ${activeSection === "gas" ? "bg-neutral-900 text-white" : "text-neutral-450 hover:text-neutral-200"}`}
                  >
                    Gasless Sponsorship
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <span className="font-mono text-[10px] font-bold text-neutral-500 uppercase tracking-widest block mb-3 px-2">
                Client SDK References
              </span>
              <ul className="space-y-1.5 font-medium font-mono">
                <li>
                  <button 
                    onClick={() => setActiveSection("sdk-node")}
                    className={`w-full text-left px-2 py-1.5 rounded transition-colors ${activeSection === "sdk-node" ? "bg-neutral-900 text-white" : "text-neutral-450 hover:text-neutral-200"}`}
                  >
                    @airpay/sdk (Node)
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveSection("sdk-py")}
                    className={`w-full text-left px-2 py-1.5 rounded transition-colors ${activeSection === "sdk-py" ? "bg-neutral-900 text-white" : "text-neutral-450 hover:text-neutral-200"}`}
                  >
                    airpay-py (Python)
                  </button>
                </li>
              </ul>
            </div>
          </nav>
        </aside>

        {/* PANE 2: Markdown Main Document Reading Area (Middle) */}
        <main className="flex-1 bg-black px-8 md:px-12 py-12 overflow-y-auto max-h-screen">
          <div className="max-w-2xl mx-auto space-y-10">
            
            {/* OVERVIEW CONTENT */}
            {activeSection === "overview" && (
              <article className="space-y-6">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Overview</h1>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  AirPay is an enterprise-grade multi-chain stablecoin payment gateway. It abstracts blockchain transaction complexities, gas management, and slippage calculations into a clean REST API interface similar to Stripe.
                </p>
                <div className="p-4 bg-neutral-950 border border-neutral-900 rounded-lg flex items-start gap-3">
                  <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Supported Networks</h4>
                    <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                      Accept stablecoin deposits via Solana, Arbitrum, Polygon, and Ethereum Mainnet automatically with direct non-custodial settlements.
                    </p>
                  </div>
                </div>
              </article>
            )}

            {/* QUICKSTART CONTENT */}
            {activeSection === "quickstart" && (
              <article className="space-y-6">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Quickstart</h1>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  Start integrating AirPay to accept stablecoins. Follow this brief guide to configure credentials, call client APIs, and check balance states.
                </p>

                <h3 className="text-lg font-bold text-white">1. Install SDK Client</h3>
                <pre className="bg-neutral-950 border border-neutral-900 p-4 rounded-lg font-mono text-[11px] text-neutral-300">
                  <code>npm install @airpay/sdk</code>
                </pre>

                <h3 className="text-lg font-bold text-white">2. Initialize and Query</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  Provide your private sandbox key to retrieve account objects. Sandbox keys are generated inside the developer dashboard.
                </p>

                <div className="p-4 bg-neutral-950 border border-neutral-900 rounded-lg flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-450 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Non-custodial Settle Vaults</h4>
                    <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                      Ensure your destination settlement address is configured correctly in the dashboard settings before processing sandbox requests.
                    </p>
                  </div>
                </div>
              </article>
            )}

            {/* AUTHENTICATION CONTENT */}
            {activeSection === "auth" && (
              <article className="space-y-6">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Authentication</h1>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  All requests to the AirPay API must carry bearer credentials. Provide your API secret key in the request header context.
                </p>
                <h3 className="text-lg font-bold text-white">Bearer Headers</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  Add the secret key inside standard HTTP authorization values:
                </p>
                <pre className="bg-neutral-950 border border-neutral-900 p-4 rounded-lg font-mono text-[11px] text-neutral-300">
                  <code>Authorization: Bearer sk_live_51P8...</code>
                </pre>
              </article>
            )}

            {/* CHECKOUT CONTENT */}
            {activeSection === "checkout" && (
              <article className="space-y-6">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Hosted Checkout</h1>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  Create checkout sessions to display hosted payment pages. The checkout session response contains a hosted payment URL.
                </p>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  Redirect customers to the `session.url` returned in the payload to display stablecoin deposits options.
                </p>
              </article>
            )}

            {/* WEBHOOKS CONTENT */}
            {activeSection === "webhooks" && (
              <article className="space-y-6">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Webhook Listeners</h1>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  Listen to webhook events triggered by our platform to receive real-time confirmations on blockchain finalizations.
                </p>
                <div className="p-4 bg-neutral-950 border border-neutral-900 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Signature Validation</h4>
                    <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                      Verify signature headers on incoming HTTP requests to ensure they are dispatched securely by AirPay.
                    </p>
                  </div>
                </div>
              </article>
            )}

            {/* GASLESS CONTENT */}
            {activeSection === "gas" && (
              <article className="space-y-6">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Gasless Relaying</h1>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  AirPay automatically abstracts network gas costs. When creating checkout sessions or calling wallet payouts, gas costs are sponsored in full by our relayer network.
                </p>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  This ensures customers do not need native gas tokens (like ETH, SOL, or MATIC) to complete stablecoin transactions.
                </p>
              </article>
            )}

            {/* SDK NODE CONTENT */}
            {activeSection === "sdk-node" && (
              <article className="space-y-6">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Node.js SDK</h1>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  Manage digital balances and invoice routing natively inside Node servers. Install the `@airpay/sdk` package.
                </p>
                <pre className="bg-neutral-950 border border-neutral-900 p-4 rounded-lg font-mono text-[11px] text-neutral-300">
                  <code>npm i @airpay/sdk</code>
                </pre>
              </article>
            )}

            {/* SDK PYTHON CONTENT */}
            {activeSection === "sdk-py" && (
              <article className="space-y-6">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Python SDK</h1>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  Import the official Python client helper library inside Django, Flask, or FastAPI configurations.
                </p>
                <pre className="bg-neutral-950 border border-neutral-900 p-4 rounded-lg font-mono text-[11px] text-neutral-300">
                  <code>pip install airpay</code>
                </pre>
              </article>
            )}

          </div>
        </main>

        {/* PANE 3: Interactive Request/Response Code Area (Right) */}
        <section className="w-full md:w-[420px] bg-neutral-950 border-l border-neutral-900 flex flex-col shrink-0 font-mono text-xs">
          
          {/* Code pane navigation */}
          <div className="h-12 border-b border-neutral-900 px-4 flex items-center justify-between bg-black/40">
            <div className="flex items-center gap-1">
              {["nodejs", "python", "go", "curl"].map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLangTab(lang as any)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-colors ${langTab === lang ? "bg-neutral-900 text-indigo-400" : "text-neutral-500 hover:text-neutral-350"}`}
                >
                  {lang === "nodejs" ? "Node" : lang}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => copyCode(getSnippet())}
              className="p-1 rounded bg-neutral-900 border border-neutral-850 text-neutral-500 hover:text-white transition-colors"
              title="Copy Code"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Code panel request display */}
          <div className="flex-1 p-5 overflow-auto bg-black max-h-[380px] border-b border-neutral-900">
            <span className="text-[9px] text-neutral-550 font-bold block mb-3 text-neutral-600 uppercase">Request Sample</span>
            <pre className="text-neutral-300 leading-relaxed text-[10px]">
              <code>{getSnippet()}</code>
            </pre>
          </div>

          {/* Response panel display */}
          <div className="flex-1 p-5 overflow-auto bg-neutral-950/30 max-h-[350px]">
            <span className="text-[9px] text-neutral-550 font-bold block mb-3 text-neutral-600 uppercase">Response JSON (200 OK)</span>
            <pre className="text-neutral-400 leading-relaxed text-[10px]">
              <code>{getResponse()}</code>
            </pre>
          </div>

          {/* Footer operational references */}
          <div className="px-5 py-3 border-t border-neutral-900 bg-neutral-950 flex items-center justify-between text-[9px] text-neutral-600">
            <span>Server Response finality</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Sandbox Up</span>
            </span>
          </div>

        </section>

      </div>

    </div>
  )
}
