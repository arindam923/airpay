"use client"

import React, { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Link2, Smartphone, Sparkles, Check, Copy, 
  QrCode, Wallet, ShieldCheck, RefreshCw, Cpu, History, ExternalLink
} from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787"

interface CheckoutLink {
  id: string
  productName: string
  amount: number
  currency: string
  network: string
  status: string
  buyerEmail?: string
  collectEmail: boolean
  expiresAt: number
  createdAt: number
}

interface CheckoutTabProps {
  onRefresh?: () => void
}

export default function CheckoutTab({ onRefresh }: CheckoutTabProps = {}) {
  // Configurator Form States
  const [productName, setProductName] = useState("AirPay Pro Plan SaaS")
  const [priceAmount, setPriceAmount] = useState("49.00")
  const [selectedCurrency, setSelectedCurrency] = useState("USDC")
  const [selectedNetwork, setSelectedNetwork] = useState("Solana")
  const [collectEmail, setCollectEmail] = useState(true)
  const [accentColor, setAccentColor] = useState("#6366f1") // default indigo
  
  // Link Output States
  const [generatedLink, setGeneratedLink] = useState("")
  const [isCopied, setIsCopied] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [sessionId, setSessionId] = useState("")

  // Mobile Simulator States
  const [simStep, setSimStep] = useState<"idle" | "connecting" | "paying" | "broadcasting" | "success">("idle")
  const [mockEmailInput, setMockEmailInput] = useState("client@buyer.io")

  // Recent links state
  const [recentLinks, setRecentLinks] = useState<CheckoutLink[]>([])
  const [isLoadingLinks, setIsLoadingLinks] = useState(true)

  const fetchRecentLinks = useCallback(async () => {
    setIsLoadingLinks(true)
    try {
      const res = await fetch(`${API_URL}/api/merchant/checkout-links?limit=10`, {
        credentials: "include",
      })
      if (res.ok) {
        const data = await res.json()
        setRecentLinks(data.links || [])
      }
    } catch {} finally { setIsLoadingLinks(false) }
  }, [])

  useEffect(() => {
    fetchRecentLinks()
  }, [fetchRecentLinks])

  // Generate payment link via real API
  const generateLink = async () => {
    setIsGenerating(true)
    try {
      const res = await fetch(`${API_URL}/api/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          productName,
          amount: Math.round(parseFloat(priceAmount || "0") * 100),
          currency: selectedCurrency,
          network: selectedNetwork,
          collectEmail,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to create checkout")
      }

      const data = await res.json()
      const origin = typeof window !== "undefined" ? window.location.origin : ""
      setGeneratedLink(`${origin}/checkout/${data.id}`)
      setSessionId(data.id)
      setSimStep("idle")
      await fetchRecentLinks()
    } catch (err: any) {
      alert(err.message || "Failed to create checkout session")
    } finally {
      setIsGenerating(false)
    }
  }

  // Generate link on mount or form changes
  useEffect(() => {
    const randomId = "8k9d2l1"
    setSessionId(randomId)
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    setGeneratedLink(`${origin}/checkout/${randomId}`)
  }, [])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  // Run Simulated checkout in mobile iframe preview
  const runSimulatedCheckout = () => {
    if (simStep !== "idle") return
    
    setSimStep("connecting")
    setTimeout(() => {
      setSimStep("paying")
      setTimeout(() => {
        setSimStep("broadcasting")
        setTimeout(() => {
          setSimStep("success")
        }, 1500)
      }, 1000)
    }, 1200)
  }

  const resetCheckoutSim = () => {
    setSimStep("idle")
  }

  // Copy react component
  const [isComponentCopied, setIsComponentCopied] = useState(false)
  const reactComponentCode = `<AirPayCheckoutButton 
  sessionId="${sessionId}"
  theme={{ accentColor: "${accentColor}" }}
  onSuccess={(receipt) => alert('Received: ' + receipt.amount + ' ' + receipt.currency)}
/>`

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* Left Column: Link Generator Form (7 Columns) */}
      <div className="lg:col-span-7 space-y-6">
        
        <div className="glass-card border border-neutral-900 rounded-xl p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-900 mb-6">
            <div className="flex items-center gap-2">
              <Link2 className="w-4.5 h-4.5 text-indigo-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Hosted Payment Link Creator
              </h3>
            </div>
            <span className="text-[9px] font-mono text-neutral-500 font-semibold">Generate checkouts in 1 click</span>
          </div>

          <div className="space-y-4">
            
            {/* Product Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono block">
                Product / Service Name
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Product description"
                className="w-full px-3 py-2 bg-black border border-neutral-900 rounded text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            {/* Price & Currency */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono block">
                  Price (USD equivalent)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-xs font-bold">$</span>
                  <input
                    type="number"
                    value={priceAmount}
                    onChange={(e) => setPriceAmount(e.target.value)}
                    placeholder="Price"
                    className="w-full pl-7 pr-3 py-2 bg-black border border-neutral-900 rounded text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono block">
                  Preferred Asset
                </label>
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="w-full bg-black border border-neutral-900 text-xs text-white font-mono rounded px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="USDC">USDC</option>
                  <option value="USDT">USDT</option>
                  <option value="EURC">EURC</option>
                </select>
              </div>

            </div>

            {/* Routing chain & collect email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono block">
                  Settlement Network
                </label>
                <select
                  value={selectedNetwork}
                  onChange={(e) => setSelectedNetwork(e.target.value)}
                  className="w-full bg-black border border-neutral-900 text-xs text-white font-mono rounded px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="Solana">Solana</option>
                  <option value="Arbitrum">Arbitrum</option>
                  <option value="Polygon">Polygon</option>
                  <option value="Ethereum">Ethereum</option>
                </select>
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <label className="flex items-center justify-between p-2 rounded bg-black border border-neutral-900 cursor-pointer select-none">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-bold">Collect Buyer Email</span>
                  <input
                    type="checkbox"
                    checked={collectEmail}
                    onChange={() => setCollectEmail(!collectEmail)}
                    className="accent-indigo-500 text-indigo-500 cursor-pointer"
                  />
                </label>
              </div>

            </div>

            {/* Customize Checkout theme */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono block">
                Checkout Theme Branding
              </label>
              <div className="flex gap-4 items-center">
                <div className="flex gap-2.5">
                  {["#6366f1", "#06b6d4", "#10b981", "#a855f7", "#ec4899"].map(color => (
                    <button
                      type="button"
                      key={color}
                      onClick={() => setAccentColor(color)}
                      className="w-6 h-6 rounded-full border transition-all"
                      style={{ 
                        backgroundColor: color,
                        borderColor: accentColor === color ? "#ffffff" : "rgba(0,0,0,0.4)",
                        boxShadow: accentColor === color ? `0 0 10px ${color}` : "none"
                      }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-neutral-500">Custom hex:</span>
                  <input 
                    type="text" 
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="bg-black border border-neutral-900 rounded px-2 py-0.5 text-[10px] font-mono text-white w-20 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={generateLink}
              disabled={isGenerating}
              className="w-full py-2.5 mt-6 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded transition-colors shadow-md flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Configuring metadata nodes...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Payment URL</span>
                </>
              )}
            </button>

          </div>
        </div>

        {/* Generated output links panel */}
        {generatedLink && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card border border-neutral-900 rounded-xl p-5 shadow-xl space-y-4"
          >
            {/* Copyable Link */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono block">
                Shareable Payment Link
              </label>
              <div className="flex items-center bg-black border border-neutral-900 rounded p-1">
                <span className="text-[10px] text-neutral-350 font-mono flex-1 px-2 select-all truncate">
                  {generatedLink}
                </span>
                <button
                  onClick={handleCopyLink}
                  className="p-1.5 text-neutral-500 hover:text-white rounded bg-neutral-950 hover:bg-neutral-900 border border-neutral-900 transition-all shrink-0"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-450" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* SDK Code Snippet */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-neutral-400 uppercase tracking-wider font-mono">React Component Integration</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(reactComponentCode)
                    setIsComponentCopied(true)
                    setTimeout(() => setIsComponentCopied(false), 2000)
                  }}
                  className="text-indigo-400 hover:text-indigo-300 font-bold font-mono text-[9px] hover:underline flex items-center gap-1"
                >
                  {isComponentCopied ? "Copied Component!" : "Copy Snippet"}
                </button>
              </div>
              <div className="relative rounded-lg overflow-hidden border border-neutral-900 bg-black p-3.5 font-mono text-[9px] leading-relaxed text-neutral-400 select-all">
                <pre>{reactComponentCode}</pre>
              </div>
            </div>

          </motion.div>
        )}

        <div className="glass-card border border-neutral-900 rounded-xl p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-900 mb-4">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Recent Checkout Links
              </h3>
            </div>
            <button
              onClick={fetchRecentLinks}
              type="button"
              className="text-[9px] font-mono text-neutral-400 hover:text-white flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingLinks ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>

          {isLoadingLinks ? (
            <div className="flex items-center justify-center py-6">
              <RefreshCw className="w-4 h-4 text-neutral-500 animate-spin" />
            </div>
          ) : recentLinks.length === 0 ? (
            <div className="text-center py-8 text-[10px] text-neutral-500 font-mono">
              No checkout links yet. Generate one above to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {recentLinks.map(link => (
                <div key={link.id} className="p-3 bg-neutral-950 border border-neutral-900 rounded-lg flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-white font-bold truncate">{link.productName}</span>
                      <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded shrink-0 ${
                        link.status === "completed"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : link.status === "pending"
                          ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                          : "bg-neutral-900 text-neutral-500 border border-neutral-800"
                      }`}>{link.status}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[9px] font-mono text-neutral-500">
                      <span>${(link.amount / 100).toFixed(2)} {link.currency}</span>
                      <span>·</span>
                      <span>{link.network}</span>
                      <span>·</span>
                      <span>{new Date(link.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit" })}</span>
                    </div>
                  </div>
                  <a
                    href={`/checkout/${link.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 p-1.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 shrink-0"
                    title="Open checkout"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Right Column: Live Mockup Simulator (5 Columns) */}
      <div className="lg:col-span-5 flex justify-center">
        
        {/* Smartphone Wrapper */}
        <div className="relative w-[280px] h-[550px] bg-neutral-950 rounded-[36px] p-3 border-[6px] border-neutral-900 shadow-2xl relative flex flex-col items-center">
          {/* Speaker mesh & camera notch */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-neutral-900 rounded-full z-20 flex items-center justify-center">
            <div className="w-10 h-1 bg-black rounded-full mb-1" />
            <div className="w-2.5 h-2.5 bg-black border border-neutral-800 rounded-full ml-2 mb-1" />
          </div>

          {/* Screen Content */}
          <div className="w-full h-full bg-black rounded-[26px] overflow-hidden flex flex-col justify-between border border-neutral-900 p-4 pt-8 text-[11px] relative select-none">
            
            {/* Top Info Header */}
            <div className="flex items-center justify-between text-[8px] font-mono text-neutral-500 pb-2 border-b border-neutral-900 mb-4">
              <span>AIRPAY HOSTED CHECKOUT</span>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <span>SECURE</span>
              </div>
            </div>

            {/* Main Stage inside simulator */}
            <AnimatePresence mode="wait">
              
              {/* STATE 1: Idle checkout display */}
              {simStep === "idle" && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Merchant Header */}
                    <div className="text-center pt-2">
                      <span className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest block font-bold">MERCHANT INVOICE</span>
                      <h4 className="font-bold text-white text-[13px] mt-1">{productName || "Product Name"}</h4>
                    </div>

                    {/* Price Block */}
                    <div className="bg-neutral-950 border border-neutral-900 p-3.5 rounded-xl text-center">
                      <span className="text-[8px] font-mono text-neutral-500 block">TOTAL TO PAY</span>
                      <h2 className="text-2xl font-bold font-mono text-white mt-1">
                        ${parseFloat(priceAmount || "0").toFixed(2)}
                      </h2>
                      <span className="text-[8px] font-mono text-neutral-450 block mt-1 font-semibold">
                        Settle on {selectedNetwork} in {selectedCurrency}
                      </span>
                    </div>

                    {/* Email Collector Form */}
                    {collectEmail && (
                      <div className="space-y-1">
                        <span className="text-[8px] font-mono text-neutral-500 font-bold uppercase block">YOUR ACCOUNT EMAIL</span>
                        <input
                          type="email"
                          value={mockEmailInput}
                          onChange={(e) => setMockEmailInput(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-900 rounded p-1.5 text-[9px] text-white focus:outline-none"
                          disabled
                        />
                      </div>
                    )}

                    {/* QR Code section */}
                    <div className="border border-neutral-900 bg-neutral-950 rounded-xl p-3 flex flex-col items-center gap-1.5">
                      <div className="w-24 h-24 bg-white/5 rounded border border-neutral-850 flex items-center justify-center relative">
                        <QrCode className="w-18 h-18 text-white opacity-90" />
                        <div className="absolute inset-0 bg-neutral-950/20 flex items-center justify-center">
                          <span className="bg-neutral-900 border border-neutral-800 text-[8px] font-mono text-white px-1 py-0.5 rounded font-bold">
                            Scan Wallet
                          </span>
                        </div>
                      </div>
                      <span className="text-[7px] text-neutral-500 text-center font-mono">
                        Scan with phantom or metamask wallet
                      </span>
                    </div>

                  </div>

                  {/* CTA button inside phone */}
                  <a
                    href={generatedLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold transition-all mt-4 text-[10px] block text-center"
                    style={{ backgroundColor: accentColor }}
                  >
                    Pay ${parseFloat(priceAmount || "0").toFixed(2)} {selectedCurrency}
                  </a>
                </motion.div>
              )}

              {/* STATE 2: Connecting Wallet loading */}
              {simStep === "connecting" && (
                <motion.div
                  key="connecting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center text-center space-y-4"
                >
                  <div className="relative flex items-center justify-center">
                    <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin" style={{ color: accentColor }} />
                    <Wallet className="w-4.5 h-4.5 text-white absolute" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-[12px] uppercase font-mono tracking-wider">
                      Connecting Wallet
                    </h4>
                    <p className="text-[8px] text-neutral-500 mt-1 font-mono">
                      Querying Phantom browser extension...
                    </p>
                  </div>
                </motion.div>
              )}

              {/* STATE 3: Paying (signing transaction) */}
              {simStep === "paying" && (
                <motion.div
                  key="paying"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center text-center space-y-4"
                >
                  <div className="relative flex items-center justify-center">
                    <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin" />
                    <Cpu className="w-4.5 h-4.5 text-white absolute" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-[12px] uppercase font-mono tracking-wider">
                      Signing Tx
                    </h4>
                    <p className="text-[8px] text-neutral-500 mt-1 font-mono">
                      Requesting secure cryptography payload...
                    </p>
                  </div>
                </motion.div>
              )}

              {/* STATE 4: Broadcasting transaction to blockchain */}
              {simStep === "broadcasting" && (
                <motion.div
                  key="broadcasting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center text-center space-y-4"
                >
                  <div className="relative flex items-center justify-center">
                    <RefreshCw className="w-10 h-10 text-emerald-450 animate-spin" />
                    <Sparkles className="w-4.5 h-4.5 text-white absolute" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-[12px] uppercase font-mono tracking-wider">
                      Confirming Chain
                    </h4>
                    <p className="text-[8px] text-neutral-500 mt-1 font-mono">
                      Relaying transaction to {selectedNetwork} finality nodes...
                    </p>
                  </div>
                </motion.div>
              )}

              {/* STATE 5: Success confirmation */}
              {simStep === "success" && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center text-center space-y-5"
                >
                  <div 
                    className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-2 border-emerald-500 bg-emerald-500/10 text-emerald-400 animate-pulse"
                  >
                    <ShieldCheck className="w-7 h-7 text-emerald-450" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-[13px] uppercase font-mono tracking-wider">
                      Payment Settled!
                    </h4>
                    <p className="text-[8px] text-neutral-450 mt-1.5 font-mono max-w-[160px] mx-auto leading-relaxed">
                      Succeeded: received ${parseFloat(priceAmount || "0").toFixed(2)} {selectedCurrency} on {selectedNetwork} relayer node.
                    </p>
                  </div>
                  <button
                    onClick={resetCheckoutSim}
                    className="px-3 py-1 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-white rounded font-mono text-[8px] font-bold transition-all"
                  >
                    Reset Simulator
                  </button>
                </motion.div>
              )}

            </AnimatePresence>

            {/* Bottom Footer Info */}
            <div className="text-[7px] text-neutral-600 font-mono text-center pt-2 border-t border-neutral-900 mt-4 font-semibold uppercase">
              Powered by AirPay relayer engine.
            </div>

          </div>
        </div>

      </div>

    </div>
  )
}
