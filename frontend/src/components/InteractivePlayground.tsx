"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Terminal, Code2, Copy, Check, ExternalLink, Loader2, 
  Lock, Coins, ArrowRight, RefreshCw, Smartphone, Globe
} from "lucide-react"

interface InteractivePlaygroundProps {
  onPaymentSuccess: (amount: number, currency: string, network: string) => void
  webhookEvents: any[]
  addWebhookEvent: (event: any) => void
}

export default function InteractivePlayground({ 
  onPaymentSuccess, 
  webhookEvents, 
  addWebhookEvent 
}: InteractivePlaygroundProps) {
  const [activeTab, setActiveTab] = useState<"sdk" | "webhooks">("sdk")
  const [sdkLanguage, setSdkLanguage] = useState<"nodejs" | "python" | "go" | "rust">("nodejs")
  
  // Checkout Simulator Form State
  const [amount, setAmount] = useState<number>(150)
  const [currency, setCurrency] = useState<string>("USDC")
  const [network, setNetwork] = useState<string>("Solana")
  const [email, setEmail] = useState<string>("developer@airpay.io")
  const [checkoutState, setCheckoutState] = useState<"idle" | "connecting" | "submitting" | "confirming" | "success">("idle")
  const [copied, setCopied] = useState<boolean>(false)
  const [txHash, setTxHash] = useState<string>("")
  const terminalEndRef = useRef<HTMLDivElement>(null)

  // Auto scroll webhook logs
  useEffect(() => {
    if (activeTab === "webhooks" && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [webhookEvents, activeTab])

  // Map networks to random wallet address patterns
  const networkAddresses: Record<string, string> = {
    Solana: "H7xG8yL2kP1m5N3oQ4rS6tU8vW0xY2z",
    Arbitrum: "0x7a91B6dCcFeC9029aA348d2C19c595dBdE4F281E",
    Polygon: "0x3f5CE0FB0eDE1B6F6E6D38006E88a2A43dFe229A",
    Ethereum: "0x98fE3A823B41C52A20a1fA7BdB1266e74E696dbC",
  }

  // Map networks to block explorer formats
  const explorerUrls: Record<string, string> = {
    Solana: "solscan.io/tx/",
    Arbitrum: "arbiscan.io/tx/",
    Polygon: "polygonscan.com/tx/",
    Ethereum: "etherscan.io/tx/",
  }

  const triggerCheckout = async () => {
    if (checkoutState !== "idle") return
    
    // Phase 1: Connecting Wallet
    setCheckoutState("connecting")
    await new Promise((resolve) => setTimeout(resolve, 1200))
    
    // Append webhook log: session created
    const sessId = "sess_" + Math.random().toString(36).substring(2, 10)
    addWebhookEvent({
      id: "wh_" + Math.random().toString(36).substring(2, 10),
      event: "checkout.session.created",
      timestamp: new Date(),
      payload: {
        id: sessId,
        object: "checkout.session",
        amount: amount * 100,
        currency: currency.toLowerCase(),
        status: "open",
        network: network.toLowerCase(),
        customer_email: email,
      }
    })

    // Phase 2: Submitting Blockchain Tx
    setCheckoutState("submitting")
    await new Promise((resolve) => setTimeout(resolve, 1400))

    // Append webhook log: transaction detected
    const tempTxHash = network === "Solana" 
      ? Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      : "0x" + Math.random().toString(16).substring(2, 10) + "..." + Math.random().toString(16).substring(2, 10)
    setTxHash(tempTxHash)

    addWebhookEvent({
      id: "wh_" + Math.random().toString(36).substring(2, 10),
      event: "blockchain.transaction.detected",
      timestamp: new Date(),
      payload: {
        session_id: sessId,
        hash: tempTxHash,
        network: network.toLowerCase(),
        gas_fee_usd: 0.00,
        sponsored: true,
      }
    })

    // Phase 3: Confirming Settlement
    setCheckoutState("confirming")
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Phase 4: Success
    setCheckoutState("success")
    
    // Append final webhook log: payment succeeded
    addWebhookEvent({
      id: "wh_" + Math.random().toString(36).substring(2, 10),
      event: "payment.succeeded",
      timestamp: new Date(),
      payload: {
        id: "pay_" + Math.random().toString(36).substring(2, 10),
        object: "payment_intent",
        amount: amount * 100,
        currency: currency.toLowerCase(),
        status: "succeeded",
        network: network.toLowerCase(),
        transaction_hash: tempTxHash,
        settled_at: new Date().toISOString(),
      }
    })

    // Trigger parent callback to update charts and volume
    onPaymentSuccess(amount, currency, network)
  }

  const resetCheckout = () => {
    setCheckoutState("idle")
    setTxHash("")
  }

  const copyCode = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getSdkCode = () => {
    const amountCents = amount * 100
    const currencyLower = currency.toLowerCase()
    const networkLower = network.toLowerCase()
    
    switch (sdkLanguage) {
      case "nodejs":
        return `import AirPay from '@airpay/sdk';

const airpay = new AirPay('sk_live_51P8...');

// Create a hosted payment checkout session
const session = await airpay.checkout.sessions.create({
  amount: ${amountCents}, // in cents ($${amount}.00)
  currency: "${currencyLower}",
  network: "${networkLower}",
  customer_email: "${email}",
  success_url: "https://yourdomain.com/success",
  cancel_url: "https://yourdomain.com/cancel",
});

console.log("Hosted Payment URL:", session.url);`

      case "python":
        return `import airpay

airpay.api_key = "sk_live_51P8..."

# Create a hosted payment checkout session
session = airpay.checkout.Session.create(
    amount=${amountCents}, # in cents ($${amount}.00)
    currency="${currencyLower}",
    network="${networkLower}",
    customer_email="${email}",
    success_url="https://yourdomain.com/success",
    cancel_url="https://yourdomain.com/cancel",
)

print(f"Hosted Payment URL: {session.url}")`

      case "go":
        return `package main

import (
	"fmt"
	"github.com/airpay/airpay-go"
)

func main() {
	airpay.Key = "sk_live_51P8..."

	params := &airpay.CheckoutSessionParams{
		Amount:        airpay.Int64(${amountCents}),
		Currency:      airpay.String("${currencyLower}"),
		Network:       airpay.String("${networkLower}"),
		CustomerEmail: airpay.String("${email}"),
		SuccessURL:    airpay.String("https://yourdomain.com/success"),
		CancelURL:     airpay.String("https://yourdomain.com/cancel"),
	}

	session, _ := airpay.CheckoutSession.New(params)
	fmt.Printf("Hosted Payment URL: %s\\n", session.URL)
}`

      case "rust":
        return `use airpay_sdk::{AirPayClient, CheckoutSessionParams};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = AirPayClient::new("sk_live_51P8...");
    
    let params = CheckoutSessionParams {
        amount: ${amountCents}, // in cents
        currency: "${currencyLower}".to_string(),
        network: "${networkLower}".to_string(),
        customer_email: "${email}".to_string(),
        success_url: "https://yourdomain.com/success".to_string(),
        cancel_url: "https://yourdomain.com/cancel".to_string(),
    };
    
    let session = client.checkout_sessions.create(params).await?;
    println!("Hosted Payment URL: {}", session.url);
    Ok(())
}`
    }
  }

  return (
    <section id="playground" className="py-24 relative overflow-hidden bg-black border-t border-neutral-900">
      {/* Subtle background mesh glows */}
      <div className="absolute right-0 top-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Section Header */}
        <div className="max-w-2xl mb-16">
          <span className="text-xs font-mono font-bold tracking-widest text-neutral-500 uppercase">
            Developer Sandbox
          </span>
          <h2 className="text-3xl font-extrabold text-white tracking-tight mt-3">
            Interactive SDK Explorer
          </h2>
          <p className="mt-4 text-neutral-400 text-sm leading-relaxed font-medium">
            Configure parameters inside the checkout widget simulator. View the generated SDK payload update instantly, execute a test payment transaction, and watch webhooks stream in the terminal.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* LEFT: Hosted Payment Page Simulator (5 Columns) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            {/* Phone Container with Subtle Gradient Ring */}
            <div className="w-full max-w-[350px] sm:max-w-[360px] relative bg-neutral-950 rounded-[36px] p-3 border border-neutral-900/80 hover:border-neutral-800 transition-colors duration-300 shadow-2xl overflow-hidden aspect-[9/18.5] flex flex-col">
              
              {/* Phone Status Bar Decorator */}
              <div className="flex justify-between items-center px-5 py-2.5 text-[9px] text-neutral-600 font-mono select-none">
                <span>9:41</span>
                {/* Speaker pill */}
                <div className="w-14 h-3.5 bg-black border border-neutral-900 rounded-full flex items-center justify-center" />
                <div className="flex items-center gap-1">
                  <span className="text-indigo-400">5G</span>
                  <div className="w-3.5 h-1.5 bg-neutral-700 rounded-xs" />
                </div>
              </div>

              {/* Phone Screen Container */}
              <div className="flex-1 bg-black border border-neutral-900 rounded-[26px] p-5 overflow-y-auto flex flex-col justify-between relative">
                
                {/* IDLE checkout state */}
                {checkoutState === "idle" && (
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      {/* Merchant Logo */}
                      <div className="flex items-center justify-between mt-1 mb-6">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                            <Coins className="w-3 h-3 text-indigo-400" />
                          </div>
                          <span className="font-bold text-xs tracking-tight text-white">
                            AirPay <span className="font-normal text-neutral-500">Checkout</span>
                          </span>
                        </div>
                        <Globe className="w-3 h-3 text-neutral-600" />
                      </div>

                      {/* Invoice Summary */}
                      <div className="mb-6">
                        <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider block">Total Amount</span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-3xl font-extrabold text-white tracking-tight">${amount}</span>
                          <span className="text-xs text-neutral-400 font-bold">{currency}</span>
                        </div>
                        <p className="text-[9px] text-neutral-600 mt-1 font-medium">demo_order_invoice_3802</p>
                      </div>

                      {/* Interactive Amount Slider */}
                      <div className="mb-5 bg-neutral-950 border border-neutral-900 p-3.5 rounded-xl">
                        <div className="flex justify-between items-center mb-1 text-[11px]">
                          <span className="text-neutral-400 font-medium">Transaction Size:</span>
                          <span className="text-indigo-400 font-bold font-mono">${amount}</span>
                        </div>
                        <input 
                          type="range" 
                          min="10" 
                          max="1000" 
                          value={amount}
                          onChange={(e) => setAmount(Number(e.target.value))}
                          className="w-full h-1 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-1.5"
                        />
                      </div>

                      {/* Stablecoin Selector */}
                      <div className="mb-5">
                        <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider block mb-2">Stablecoin</span>
                        <div className="grid grid-cols-3 gap-2">
                          {["USDC", "USDT", "EURC"].map((c) => (
                            <button
                              key={c}
                              onClick={() => setCurrency(c)}
                              className={`py-2 px-1 rounded-lg text-xs font-bold border transition-all duration-150 ${
                                currency === c 
                                  ? "bg-indigo-900/10 border-indigo-500 text-indigo-400 glow-indigo"
                                  : "bg-neutral-950 border-neutral-900 text-neutral-500 hover:border-neutral-800"
                              }`}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Network Selector */}
                      <div className="mb-6">
                        <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider block mb-2">Settlement Chain</span>
                        <div className="grid grid-cols-2 gap-2">
                          {["Solana", "Arbitrum", "Polygon", "Ethereum"].map((n) => (
                            <button
                              key={n}
                              onClick={() => setNetwork(n)}
                              className={`py-2.5 px-3 rounded-lg text-left border flex items-center justify-between transition-all duration-150 ${
                                network === n 
                                  ? "bg-cyan-955/10 border-cyan-500 text-cyan-400 glow-cyan bg-cyan-950/20"
                                  : "bg-neutral-955 border-neutral-900 text-neutral-400 hover:border-neutral-800"
                              }`}
                            >
                              <span className="text-[11px] font-bold">{n}</span>
                              <div className={`w-1.5 h-1.5 rounded-full ${n === "Solana" ? "bg-purple-500" : n === "Arbitrum" ? "bg-blue-500" : n === "Polygon" ? "bg-violet-600" : "bg-neutral-400"}`} />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Prefilled Wallet address */}
                      <div className="mb-2 bg-neutral-950 border border-neutral-900 rounded-lg p-3">
                        <div className="flex justify-between items-center text-[9px] text-neutral-500 font-bold mb-1">
                          <span>SENDER DEPOSIT ADDR</span>
                          <span className="text-cyan-400 text-[8px] font-mono font-bold">GAS SPONSORED</span>
                        </div>
                        <div className="font-mono text-[9px] text-neutral-300 truncate">
                          {networkAddresses[network]}
                        </div>
                      </div>
                    </div>

                    {/* Pay Button */}
                    <button
                      onClick={triggerCheckout}
                      className="w-full mt-4 py-3.5 bg-white hover:bg-indigo-500 hover:text-white text-black rounded-lg text-xs font-semibold shadow-sm transition-all duration-150 flex items-center justify-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Confirm & Pay ${amount} {currency}</span>
                    </button>
                  </div>
                )}

                {/* LOADING states */}
                {(checkoutState === "connecting" || checkoutState === "submitting" || checkoutState === "confirming") && (
                  <div className="flex-1 flex flex-col justify-center items-center py-20">
                    <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-6" />
                    
                    <AnimatePresence mode="wait">
                      {checkoutState === "connecting" && (
                        <motion.div
                          key="connecting"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="text-center"
                        >
                          <h4 className="text-xs font-bold text-white">Opening Session</h4>
                          <p className="text-[10px] text-neutral-500 mt-1">Generating SDK payload...</p>
                        </motion.div>
                      )}

                      {checkoutState === "submitting" && (
                        <motion.div
                          key="submitting"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="text-center"
                        >
                          <h4 className="text-xs font-bold text-white">Broadcasting</h4>
                          <p className="text-[10px] text-neutral-500 mt-1">Sponsoring {network} network gas...</p>
                        </motion.div>
                      )}

                      {checkoutState === "confirming" && (
                        <motion.div
                          key="confirming"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="text-center"
                        >
                          <h4 className="text-xs font-bold text-white">Settling Contract</h4>
                          <p className="text-[10px] text-neutral-500 mt-1">Confirming blockchain receipts...</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* SUCCESS checkout state */}
                {checkoutState === "success" && (
                  <div className="flex-1 flex flex-col justify-between py-4">
                    <div className="flex-1 flex flex-col justify-center items-center text-center">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-5 glow-emerald animate-float">
                        <Check className="w-6 h-6 text-emerald-400" />
                      </div>
                      
                      <h4 className="text-sm font-extrabold text-white">Settlement Succeeded</h4>
                      <p className="text-xs text-neutral-400 mt-2 max-w-[220px] leading-relaxed">
                        Your payment of <span className="text-emerald-400 font-bold">${amount} {currency}</span> has settled successfully.
                      </p>

                      <div className="mt-8 w-full bg-neutral-950 border border-neutral-900 rounded-xl p-4 text-left">
                        <span className="text-[8px] text-neutral-500 font-bold block mb-2">RECEIPT DATA</span>
                        
                        <div className="space-y-2 text-[10px]">
                          <div className="flex justify-between">
                            <span className="text-neutral-500">Settled On:</span>
                            <span className="text-neutral-300 font-mono font-semibold">{network}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-500">Gas Routing:</span>
                            <span className="text-cyan-400 font-semibold">Sponsored</span>
                          </div>
                          <div className="flex flex-col mt-2 pt-2 border-t border-neutral-900">
                            <span className="text-neutral-500 mb-1">Receipt Hash:</span>
                            <a 
                              href={`https://${explorerUrls[network]}${txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[9px] text-indigo-400 font-mono break-all flex items-center gap-1 hover:text-indigo-300 hover:underline"
                            >
                              <span>{txHash}</span>
                              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={resetCheckout}
                      className="w-full mt-4 py-3 bg-neutral-950 hover:bg-neutral-900 border border-neutral-900 text-neutral-350 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Process Another Checkout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Developer View: SDK snippets & Live Webhooks Terminal (7 Columns) */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div className="w-full flex-1 flex flex-col bg-neutral-950 border border-neutral-900 rounded-2xl overflow-hidden shadow-2xl min-h-[500px]">
              
              {/* Tab Navigation header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-b border-neutral-900 bg-neutral-950">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab("sdk")}
                    className={`py-1.5 px-4 rounded text-xs font-bold flex items-center gap-2 transition-colors ${
                      activeTab === "sdk"
                        ? "bg-neutral-900 text-white border border-neutral-850"
                        : "text-neutral-500 hover:text-neutral-300"
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Developer SDK</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("webhooks")}
                    className={`py-1.5 px-4 rounded text-xs font-bold flex items-center gap-2 transition-colors relative ${
                      activeTab === "webhooks"
                        ? "bg-neutral-900 text-white border border-neutral-850"
                        : "text-neutral-500 hover:text-neutral-300"
                    }`}
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Live Webhooks</span>
                    {webhookEvents.length > 1 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5 animate-pulse">
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400"></span>
                      </span>
                    )}
                  </button>
                </div>

                {/* Subheading actions */}
                {activeTab === "sdk" ? (
                  <div className="flex flex-wrap items-center gap-1">
                    {["nodejs", "python", "go", "rust"].map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setSdkLanguage(lang as any)}
                        className={`text-[9px] font-mono px-2.5 py-1 rounded transition-colors uppercase font-bold tracking-wider ${
                          sdkLanguage === lang 
                            ? "bg-neutral-900 text-indigo-400 border border-neutral-850" 
                            : "text-neutral-600 hover:text-neutral-400"
                        }`}
                      >
                        {lang === "nodejs" ? "Node" : lang}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-[9px] font-mono text-cyan-400 flex items-center gap-1.5 bg-neutral-900 px-2.5 py-1 rounded border border-neutral-850">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    <span>Webhook Port 8080 Active</span>
                  </div>
                )}
              </div>

              {/* Content Panel Area */}
              <div className="flex-1 p-6 font-mono text-[11px] overflow-auto bg-black max-h-[460px] relative">
                
                {/* SDK tab */}
                {activeTab === "sdk" && (
                  <div className="h-full flex flex-col justify-between">
                    <div>
                      {/* Code Block Container */}
                      <div className="relative">
                        <button
                          onClick={() => copyCode(getSdkCode())}
                          className="absolute right-0 top-0 p-1.5 rounded bg-neutral-950 border border-neutral-900 text-neutral-500 hover:text-white transition-colors"
                          title="Copy Code"
                        >
                          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                        
                        <pre className="text-neutral-350 leading-relaxed overflow-x-auto max-w-full">
                          {sdkLanguage === "nodejs" && (
                            <code>
                              <span className="text-indigo-400 font-semibold">import</span> AirPay <span className="text-indigo-400 font-semibold">from</span> <span className="text-emerald-400">'@airpay/sdk'</span>;
                              <br /><br />
                              <span className="text-indigo-400 font-semibold">const</span> airpay = <span className="text-indigo-400 font-semibold">new</span> <span className="text-cyan-400">AirPay</span>(<span className="text-emerald-400">'sk_live_51P8...'</span>);
                              <br /><br />
                              <span className="text-neutral-600">// Create checkout session</span>
                              <br />
                              <span className="text-indigo-400 font-semibold">const</span> session = <span className="text-indigo-400 font-semibold">await</span> airpay.checkout.sessions.create(&#123;
                              <br />
                              &nbsp;&nbsp;amount: <span className="text-amber-500">{amount * 100}</span>, <span className="text-neutral-600">// cents (${amount}.00)</span>
                              <br />
                              &nbsp;&nbsp;currency: <span className="text-emerald-400">"{currency.toLowerCase()}"</span>,
                              <br />
                              &nbsp;&nbsp;network: <span className="text-emerald-400">"{network.toLowerCase()}"</span>,
                              <br />
                              &nbsp;&nbsp;customer_email: <span className="text-emerald-400">"{email}"</span>,
                              <br />
                              &nbsp;&nbsp;success_url: <span className="text-emerald-400">"https://yourdomain.com/success"</span>,
                              <br />
                              &nbsp;&nbsp;cancel_url: <span className="text-emerald-400">"https://yourdomain.com/cancel"</span>,
                              <br />
                              &#125;);
                              <br /><br />
                              <span className="text-cyan-400">console</span>.log(<span className="text-emerald-400">"Hosted Payment URL:"</span>, session.url);
                            </code>
                          )}
                          {sdkLanguage === "python" && (
                            <code>
                              <span className="text-indigo-400 font-semibold">import</span> airpay
                              <br /><br />
                              airpay.api_key = <span className="text-emerald-400">"sk_live_51P8..."</span>
                              <br /><br />
                              <span className="text-neutral-600"># Create checkout session</span>
                              <br />
                              session = airpay.checkout.Session.create(
                              <br />
                              &nbsp;&nbsp;&nbsp;&nbsp;amount=<span className="text-amber-500">{amount * 100}</span>, <span className="text-neutral-600"># cents (${amount}.00)</span>
                              <br />
                              &nbsp;&nbsp;&nbsp;&nbsp;currency=<span className="text-emerald-400">"{currency.toLowerCase()}"</span>,
                              <br />
                              &nbsp;&nbsp;&nbsp;&nbsp;network=<span className="text-emerald-400">"{network.toLowerCase()}"</span>,
                              <br />
                              &nbsp;&nbsp;&nbsp;&nbsp;customer_email=<span className="text-emerald-400">"{email}"</span>,
                              <br />
                              &nbsp;&nbsp;&nbsp;&nbsp;success_url=<span className="text-emerald-400">"https://yourdomain.com/success"</span>,
                              <br />
                              &nbsp;&nbsp;&nbsp;&nbsp;cancel_url=<span className="text-emerald-400">"https://yourdomain.com/cancel"</span>,
                              <br />
                              )
                              <br /><br />
                              <span className="text-indigo-400 font-semibold">print</span>(f<span className="text-emerald-400">"Hosted Payment URL: &#123;session.url&#125;"</span>)
                            </code>
                          )}
                          {sdkLanguage === "go" && (
                            <code>
                              <span className="text-indigo-400 font-semibold">package</span> main
                              <br /><br />
                              <span className="text-indigo-400 font-semibold">import</span> (
                              <br />
                              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-emerald-400">"fmt"</span>
                              <br />
                              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-emerald-400">"github.com/airpay/airpay-go"</span>
                              <br />
                              )
                              <br /><br />
                              <span className="text-indigo-400 font-semibold">func</span> main() &#123;
                              <br />
                              &nbsp;&nbsp;&nbsp;&nbsp;airpay.Key = <span className="text-emerald-400">"sk_live_51P8..."</span>
                              <br /><br />
                              &nbsp;&nbsp;&nbsp;&nbsp;params := &amp;airpay.CheckoutSessionParams&#123;
                              <br />
                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Amount:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;airpay.Int64(<span className="text-amber-500">{amount * 100}</span>),
                              <br />
                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Currency:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;airpay.String(<span className="text-emerald-400">"{currency.toLowerCase()}"</span>),
                              <br />
                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Network:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;airpay.String(<span className="text-emerald-400">"{network.toLowerCase()}"</span>),
                              <br />
                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;CustomerEmail: airpay.String(<span className="text-emerald-400">"{email}"</span>),
                              <br />
                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;SuccessURL:&nbsp;&nbsp;&nbsp;&nbsp;airpay.String(<span className="text-emerald-400">"https://yourdomain.com/success"</span>),
                              <br />
                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;CancelURL:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;airpay.String(<span className="text-emerald-400">"https://yourdomain.com/cancel"</span>),
                              <br />
                              &nbsp;&nbsp;&nbsp;&nbsp;&#125;
                              <br /><br />
                              &nbsp;&nbsp;&nbsp;&nbsp;session, _ := airpay.CheckoutSession.New(params)
                              <br />
                              &nbsp;&nbsp;&nbsp;&nbsp;fmt.Printf(<span className="text-emerald-400">"Hosted Payment URL: %s\\n"</span>, session.URL)
                              <br />
                              &#125;
                            </code>
                          )}
                          {sdkLanguage === "rust" && (
                            <code>
                              <span className="text-indigo-400 font-semibold">use</span> airpay_sdk::&#123;AirPayClient, CheckoutSessionParams&#125;;
                              <br /><br />
                              <span className="text-indigo-400 font-semibold">#</span>[tokio::main]
                              <br />
                              <span className="text-indigo-400 font-semibold">async fn</span> main() -&gt; Result&lt;(), Box&lt;<span className="text-indigo-400 font-semibold">dyn</span> std::error::Error&gt;&gt; &#123;
                              <br />
                              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400 font-semibold">let</span> client = AirPayClient::new(<span className="text-emerald-400">"sk_live_51P8..."</span>);
                              <br /><br />
                              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400 font-semibold">let</span> params = CheckoutSessionParams &#123;
                              <br />
                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;amount: <span className="text-amber-500">{amount * 100}</span>,
                              <br />
                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;currency: <span className="text-emerald-400">"{currency.toLowerCase()}"</span>.to_string(),
                              <br />
                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;network: <span className="text-emerald-400">"{network.toLowerCase()}"</span>.to_string(),
                              <br />
                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;customer_email: <span className="text-emerald-400">"{email}"</span>.to_string(),
                              <br />
                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;success_url: <span className="text-emerald-400">"https://yourdomain.com/success"</span>.to_string(),
                              <br />
                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;cancel_url: <span className="text-emerald-400">"https://yourdomain.com/cancel"</span>.to_string(),
                              <br />
                              &nbsp;&nbsp;&nbsp;&nbsp;&#125;;
                              <br /><br />
                              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-indigo-400 font-semibold">let</span> session = client.checkout_sessions.create(params).<span className="text-indigo-400 font-semibold">await</span>?;
                              <br />
                              &nbsp;&nbsp;&nbsp;&nbsp;println!(<span className="text-emerald-400">"Hosted Payment URL: &#123;&#125;"</span>, session.url);
                              <br />
                              &nbsp;&nbsp;&nbsp;&nbsp;Ok(())
                              <br />
                              &#125;
                            </code>
                          )}
                        </pre>
                      </div>
                    </div>

                    <div className="mt-8 pt-4 border-t border-neutral-900 flex justify-between items-center text-neutral-500 text-[10px]">
                      <span>Copy SDK integration boilerplate code.</span>
                      <a href="#" className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 hover:underline">
                        <span>Read SDK Guides</span>
                        <ArrowRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}

                {/* WEBHOOKS tab */}
                {activeTab === "webhooks" && (
                  <div className="flex flex-col gap-4 text-[10px] leading-relaxed">
                    {webhookEvents.length === 0 ? (
                      <div className="py-20 text-center flex flex-col justify-center items-center text-neutral-500">
                        <Terminal className="w-7 h-7 text-neutral-700 mb-3" />
                        <p>Awaiting transaction trigger...</p>
                        <p className="text-[9px] mt-1 text-neutral-650">Simulate a checkout on the left phone to generate logs.</p>
                      </div>
                    ) : (
                      webhookEvents.map((evt) => (
                        <motion.div
                          key={evt.id}
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="bg-neutral-950 border border-neutral-900 rounded-lg p-4"
                        >
                          <div className="flex items-center justify-between border-b border-neutral-900 pb-2 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] bg-neutral-900 border border-neutral-800 text-neutral-400 px-2 py-0.5 rounded font-bold">POST</span>
                              <span className="font-bold text-amber-500 text-[10px] font-mono">{evt.event}</span>
                            </div>
                            <span className="text-neutral-600 text-[9px] font-mono">
                              {new Date(evt.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          
                          <pre className="text-neutral-400 text-[10px] overflow-x-auto leading-relaxed max-w-full">
                            <code>
                              {/* Custom formatted highlighted JSON */}
                              &#123;
                              <br />
                              &nbsp;&nbsp;<span className="text-indigo-400">"id"</span>: <span className="text-emerald-400">"{evt.payload.id || evt.payload.session_id}"</span>,
                              <br />
                              &nbsp;&nbsp;<span className="text-indigo-400 font-medium">"object"</span>: <span className="text-emerald-400">"{evt.payload.object || "event"}"</span>,
                              <br />
                              &nbsp;&nbsp;<span className="text-indigo-400 font-medium">"amount"</span>: <span className="text-amber-500">{evt.payload.amount || amount * 100}</span>,
                              <br />
                              &nbsp;&nbsp;<span className="text-indigo-400 font-medium">"currency"</span>: <span className="text-emerald-400">"{evt.payload.currency || currency.toLowerCase()}"</span>,
                              <br />
                              &nbsp;&nbsp;<span className="text-indigo-400 font-medium">"status"</span>: <span className="text-emerald-400">"{evt.payload.status || "succeeded"}"</span>,
                              <br />
                              &nbsp;&nbsp;<span className="text-indigo-400 font-medium">"network"</span>: <span className="text-cyan-400">"{evt.payload.network || network.toLowerCase()}"</span>
                              <br />
                              &#125;
                            </code>
                          </pre>
                        </motion.div>
                      ))
                    )}
                    <div ref={terminalEndRef} />
                  </div>
                )}
              </div>

              {/* Status bar bottom */}
              <div className="px-6 py-3.5 border-t border-neutral-900 bg-neutral-950 flex items-center justify-between text-[9px] font-mono text-neutral-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Sandbox Environment Active</span>
                </div>
                <span>REST API v2.4</span>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
