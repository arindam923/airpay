"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Key, Eye, EyeOff, Copy, Check, RefreshCw, 
  Terminal, Globe, Shield, Play, Code, Server
} from "lucide-react"

// Custom syntax highlighting tokens helper for JS/React
function highlightJsLine(line: string, lineIndex: number) {
  if (line.trim().startsWith("//")) {
    return (
      <div key={lineIndex} className="text-neutral-500 font-mono">
        {line}
      </div>
    )
  }

  const tokenRegex = /(\/\/.*)|(".*?"|'.*?'|`.*?`)|(\b(?:const|let|var|function|async|await|import|from|export|default|return|class|extends|require|new)\b)|(\b\d+(?:\.\d+)?\b)|(\b[a-zA-Z_][a-zA-Z0-9_]*(?=\s*\()|[a-zA-Z_][a-zA-Z0-9_]*(?=\s*:))/g

  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match
  let matchCount = 0

  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(line.substring(lastIndex, match.index))
    }

    const [full, comment, str, keyword, number, identifier] = match
    const key = `t-${lineIndex}-${match.index}-${matchCount++}`

    if (comment) {
      parts.push(<span key={key} className="text-neutral-500">{comment}</span>)
    } else if (str) {
      parts.push(<span key={key} className="text-emerald-400">{str}</span>)
    } else if (keyword) {
      parts.push(<span key={key} className="text-indigo-400 font-semibold">{keyword}</span>)
    } else if (number) {
      parts.push(<span key={key} className="text-cyan-400 font-mono">{number}</span>)
    } else if (identifier) {
      if (line[match.index + identifier.length] === ':') {
        parts.push(<span key={key} className="text-neutral-350">{identifier}</span>)
      } else {
        parts.push(<span key={key} className="text-cyan-400">{identifier}</span>)
      }
    }

    lastIndex = tokenRegex.lastIndex
  }

  if (lastIndex < line.length) {
    parts.push(line.substring(lastIndex))
  }

  return (
    <div key={lineIndex} className="min-h-[1.2rem]">
      {parts.length > 0 ? parts : line}
    </div>
  )
}

// Custom syntax highlighting tokens helper for Curl
function highlightCurlLine(line: string, lineIndex: number) {
  if (line.trim().startsWith("#") || line.trim().startsWith("//")) {
    return (
      <div key={lineIndex} className="text-neutral-500 font-mono">
        {line}
      </div>
    )
  }

  const tokenRegex = /(https:\/\/[\w./\-_]+)|(\bcurl\b)|(-\w+)|(sk_test_[\w]+|pk_test_[\w]+)/g

  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match
  let matchCount = 0

  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(line.substring(lastIndex, match.index))
    }

    const [full, url, curl, flag, keyToken] = match
    const key = `t-${lineIndex}-${match.index}-${matchCount++}`

    if (url) {
      parts.push(<span key={key} className="text-emerald-450">{url}</span>)
    } else if (curl) {
      parts.push(<span key={key} className="text-indigo-400 font-bold">{curl}</span>)
    } else if (flag) {
      parts.push(<span key={key} className="text-cyan-400 font-semibold">{flag}</span>)
    } else if (keyToken) {
      parts.push(<span key={key} className="text-yellow-400 font-mono font-semibold">{keyToken}</span>)
    }

    lastIndex = tokenRegex.lastIndex
  }

  if (lastIndex < line.length) {
    parts.push(line.substring(lastIndex))
  }

  return (
    <div key={lineIndex} className="min-h-[1.2rem]">
      {parts.length > 0 ? parts : line}
    </div>
  )
}

interface ApiKeysTabProps {
  isLiveMode: boolean
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787"

export default function ApiKeysTab({ isLiveMode }: ApiKeysTabProps) {
  // Merchant Profile state
  const [hasProfile, setHasProfile] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [showProfileSetup, setShowProfileSetup] = useState(false)

  // Profile form state
  const [businessName, setBusinessName] = useState("")
  const [feeType, setFeeType] = useState<"part_of" | "on_top">("part_of")
  const [webhookUrl, setWebhookUrl] = useState("")
  const [webhookSecret, setWebhookSecret] = useState("")
  const [wallets, setWallets] = useState([
    { network: "Solana", walletAddress: "" },
    { network: "Arbitrum", walletAddress: "" },
    { network: "Polygon", walletAddress: "" },
    { network: "Ethereum", walletAddress: "" },
  ])
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // API Keys state
  const [showSecret, setShowSecret] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [publishableKey, setPublishableKey] = useState("pk_test_airpay_98fd4k1s7m90x2b3v")
  const [secretKey, setSecretKey] = useState("sk_test_airpay_782jk1s9a2k8d5j3s1m5d6f8g")
  const [isRegenerating, setIsRegenerating] = useState(false)

  // Webhook settings state
  const [subscribedEvents, setSubscribedEvents] = useState({
    "payment.succeeded": true,
    "payment.failed": true,
    "payout.completed": false,
    "payment.refunded": false
  })
  const [copiedSecret, setCopiedSecret] = useState(false)
  const [signingSecret] = useState("whsec_airpay_s9823k8jsad9238ka92s")

  // Load merchant profile on mount
  useEffect(() => {
    fetchMerchantProfile()
  }, [])

  const fetchMerchantProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/api/merchant/profile`, {
        credentials: "include",
      })
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
        setHasProfile(true)
        setBusinessName(data.businessName)
        setFeeType(data.feeType)
        setWebhookUrl(data.webhookUrl || "")
        if (data.wallets) {
          setWallets(data.wallets)
        }
      } else {
        setHasProfile(false)
      }
    } catch (err) {
      setHasProfile(false)
    } finally {
      setIsLoadingProfile(false)
    }
  }

  const handleSaveProfile = async () => {
    setIsSavingProfile(true)
    try {
      const method = hasProfile ? "PUT" : "POST"
      const res = await fetch(`${API_URL}/api/merchant/profile`, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          businessName,
          feeType,
          webhookUrl: webhookUrl || undefined,
          webhookSecret: webhookSecret || undefined,
          wallets: wallets.filter(w => w.walletAddress),
        }),
      })

      if (!res.ok) throw new Error("Failed to save profile")

      setHasProfile(true)
      setShowProfileSetup(false)
      await fetchMerchantProfile()
    } catch (err) {
      alert("Failed to save merchant profile")
    } finally {
      setIsSavingProfile(false)
    }
  }

  const updateWallet = (index: number, value: string) => {
    const newWallets = [...wallets]
    newWallets[index] = { ...newWallets[index], walletAddress: value }
    setWallets(newWallets)
  }

  // Webhook test logs
  const [webhookLogs, setWebhookLogs] = useState<Array<{
    id: string
    event: string
    url: string
    status: number
    timestamp: Date
    latency: number
  }>>([
    { id: "log_1", event: "payment.succeeded", url: "https://api.yourdomain.com/v1/webhooks/airpay", status: 200, timestamp: new Date(Date.now() - 3600000), latency: 142 },
    { id: "log_2", event: "payment.succeeded", url: "https://api.yourdomain.com/v1/webhooks/airpay", status: 200, timestamp: new Date(Date.now() - 10800000), latency: 184 }
  ])
  const [isSendingTest, setIsSendingTest] = useState(false)

  // Code Tab state
  const [codeTab, setCodeTab] = useState<"javascript" | "react" | "curl">("javascript")

  // Copy helper
  const handleCopy = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(identifier)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  // Regenerate Keys simulation
  const handleRegenerateKeys = () => {
    setIsRegenerating(true)
    setTimeout(() => {
      const randomSuffix = Math.random().toString(36).substring(2, 12)
      setPublishableKey(`pk_${isLiveMode ? "live" : "test"}_airpay_${randomSuffix}`)
      setSecretKey(`sk_${isLiveMode ? "live" : "test"}_airpay_sec_${randomSuffix}`)
      setIsRegenerating(false)
    }, 1000)
  }

  // Event toggle handler
  const handleEventToggle = (event: keyof typeof subscribedEvents) => {
    setSubscribedEvents(prev => ({
      ...prev,
      [event]: !prev[event]
    }))
  }

  // Simulate Sending Test Webhook
  const handleSendTestWebhook = () => {
    setIsSendingTest(true)
    setTimeout(() => {
      const activeEvents = Object.entries(subscribedEvents)
        .filter(([_, enabled]) => enabled)
        .map(([event]) => event)
      const selectedEvent = activeEvents[Math.floor(Math.random() * activeEvents.length)] || "payment.succeeded"

      const newLog = {
        id: `log_${Math.random().toString(36).substring(2, 7)}`,
        event: selectedEvent,
        url: webhookUrl || "http://localhost:3000",
        status: Math.random() > 0.08 ? 200 : 500, // 8% error rate simulation
        timestamp: new Date(),
        latency: Math.floor(Math.random() * 150) + 80
      }
      setWebhookLogs(prev => [newLog, ...prev])
      setIsSendingTest(false)
    }, 800)
  }

  // Code Snippet template generator
  const codeSnippets = {
    javascript: `// Install SDK: npm install @airpay/node
const AirPay = require('@airpay/node');
const airpay = new AirPay('${secretKey}');

async function createPaymentIntent() {
  const intent = await airpay.paymentIntents.create({
    amount: 15000, // $150.00 equivalent
    currency: 'usdc',
    network: 'solana',
    metadata: { orderId: 'ord_91823' }
  });
  
  console.log('Payment initialized:', intent.client_secret);
}`,
    react: `// In your React Component
import { AirPayProvider, CheckoutButton } from '@airpay/react';

export default function CheckoutPage() {
  return (
    <AirPayProvider publishableKey="${publishableKey}">
      <CheckoutButton
        amount={150.00}
        currency="USDC"
        network="Solana"
        onSuccess={(tx) => console.log('Settled!', tx.id)}
        onError={(err) => console.error('Failed', err)}
        className="bg-indigo-600 font-bold"
      />
    </AirPayProvider>
  );
}`,
    curl: `curl https://api.airpay.io/v1/payment_intents \\
  -u ${secretKey}: \\
  -d amount=15000 \\
  -d currency=usdc \\
  -d network=solana`
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* Left Column: API Keys & Webhook configurator (7 Columns) */}
      <div className="lg:col-span-7 space-y-8">

        {/* Merchant Profile Card */}
        <div className="glass-card border border-neutral-900 rounded-xl p-5 shadow-xl relative">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-900 mb-6">
            <div className="flex items-center gap-2">
              <Globe className="w-4.5 h-4.5 text-indigo-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Merchant Profile
              </h3>
            </div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-neutral-950 border border-neutral-900 text-neutral-450 font-semibold uppercase">
              {hasProfile ? "Configured" : "Required"}
            </span>
          </div>

          {isLoadingProfile ? (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="w-4 h-4 text-neutral-500 animate-spin" />
            </div>
          ) : !hasProfile || showProfileSetup ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono block">Business Name</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Your Business Name"
                  className="w-full px-3 py-2 bg-black border border-neutral-900 rounded text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono block">Fee Type</label>
                <div className="flex bg-black border border-neutral-900 rounded p-0.5">
                  <button
                    onClick={() => setFeeType("part_of")}
                    className={`flex-1 py-1 text-[9px] font-mono font-bold uppercase tracking-wider rounded transition-all ${
                      feeType === "part_of" ? "bg-neutral-900 text-white border border-neutral-850" : "text-neutral-500 hover:text-neutral-300"
                    }`}
                  >
                    Part of Total
                  </button>
                  <button
                    onClick={() => setFeeType("on_top")}
                    className={`flex-1 py-1 text-[9px] font-mono font-bold uppercase tracking-wider rounded transition-all ${
                      feeType === "on_top" ? "bg-neutral-900 text-white border border-neutral-850" : "text-neutral-500 hover:text-neutral-300"
                    }`}
                  >
                    Added on Top
                  </button>
                </div>
                <p className="text-[8px] text-neutral-500 font-mono">
                  {feeType === "part_of" ? "2% fee deducted from the payment amount." : "2% fee added on top of the payment amount."}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono block">Webhook URL</label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://api.yourdomain.com/webhooks"
                  className="w-full px-3 py-2 bg-black border border-neutral-900 rounded text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono block">Webhook Secret</label>
                <input
                  type="text"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder="whsec_..."
                  className="w-full px-3 py-2 bg-black border border-neutral-900 rounded text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono block">Wallet Addresses</label>
                {wallets.map((wallet, index) => (
                  <div key={wallet.network} className="space-y-1 bg-neutral-950 border border-neutral-900 rounded p-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      <span className="text-[9px] font-mono text-white font-bold">{wallet.network}</span>
                    </div>
                    <input
                      type="text"
                      value={wallet.walletAddress}
                      onChange={(e) => updateWallet(index, e.target.value)}
                      placeholder="Your wallet address"
                      className="w-full px-2 py-1 bg-black border border-neutral-900 rounded text-[10px] text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 text-white text-xs font-bold rounded transition-colors shadow-md flex items-center justify-center gap-2"
                >
                  {isSavingProfile ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span>{hasProfile ? "Update Profile" : "Create Profile"}</span>
                    </>
                  )}
                </button>
                {hasProfile && (
                  <button
                    onClick={() => setShowProfileSetup(false)}
                    className="px-3 py-2 bg-neutral-950 border border-neutral-900 hover:border-neutral-700 text-white rounded text-xs font-mono font-bold transition-all"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-neutral-500">Business Name</span>
                <span className="text-[10px] font-mono text-white font-bold">{profile?.businessName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-neutral-500">Fee Type</span>
                <span className="text-[10px] font-mono text-white font-bold">{profile?.feeType === "part_of" ? "Part of Total" : "Added on Top"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-neutral-500">Fee Percentage</span>
                <span className="text-[10px] font-mono text-white font-bold">{profile?.feePercentage / 100}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-neutral-500">Webhook URL</span>
                <span className="text-[10px] font-mono text-white truncate max-w-[200px]">{profile?.webhookUrl || "Not set"}</span>
              </div>
              <div className="space-y-1 pt-2 border-t border-neutral-900">
                <span className="text-[10px] font-mono text-neutral-500 block">Wallet Addresses</span>
                {profile?.wallets?.map((w: any) => (
                  <div key={w.network} className="flex justify-between items-center">
                    <span className="text-[9px] font-mono text-neutral-500">{w.network}</span>
                    <span className="text-[9px] font-mono text-white truncate max-w-[200px]">{w.walletAddress}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowProfileSetup(true)}
                className="w-full py-1.5 bg-neutral-950 border border-neutral-900 hover:border-neutral-700 text-white rounded text-[10px] font-mono font-bold transition-all"
              >
                Edit Profile
              </button>
            </div>
          )}
        </div>
        
        {/* API Credentials Card */}
        <div className="glass-card border border-neutral-900 rounded-xl p-5 shadow-xl relative">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-900 mb-6">
            <div className="flex items-center gap-2">
              <Key className="w-4.5 h-4.5 text-indigo-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                API Credentials
              </h3>
            </div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-neutral-950 border border-neutral-900 text-neutral-450 font-semibold uppercase">
              {isLiveMode ? "Production Mode" : "Sandbox Test Mode"}
            </span>
          </div>

          <div className="space-y-4">
            
            {/* Publishable key */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-neutral-400 uppercase tracking-wider font-mono">Publishable Key</span>
                <span className="text-[8px] text-neutral-500 font-mono">Safe to share in client-side code</span>
              </div>
              <div className="flex items-center bg-black border border-neutral-900 rounded p-1">
                <input 
                  type="text" 
                  value={publishableKey} 
                  readOnly 
                  className="bg-transparent text-[10px] text-neutral-300 font-mono flex-1 focus:outline-none px-2 select-all"
                />
                <button
                  onClick={() => handleCopy(publishableKey, "pub")}
                  className="p-1.5 text-neutral-500 hover:text-white rounded bg-neutral-950 hover:bg-neutral-900 border border-neutral-900 transition-all shrink-0"
                >
                  {copiedKey === "pub" ? <Check className="w-3.5 h-3.5 text-emerald-450" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Secret key */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-neutral-400 uppercase tracking-wider font-mono">Secret Key</span>
                <span className="text-[8px] text-red-400 font-semibold uppercase tracking-wider font-mono">KEEP PRIVATE</span>
              </div>
              <div className="flex items-center bg-black border border-neutral-900 rounded p-1">
                <input 
                  type={showSecret ? "text" : "password"} 
                  value={secretKey} 
                  readOnly 
                  className="bg-transparent text-[10px] text-neutral-300 font-mono flex-1 focus:outline-none px-2 select-all tracking-wide"
                />
                <div className="flex gap-1 items-center shrink-0">
                  <button
                    onClick={() => setShowSecret(!showSecret)}
                    className="p-1.5 text-neutral-500 hover:text-white rounded bg-neutral-950 hover:bg-neutral-900 border border-neutral-900 transition-all"
                  >
                    {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleCopy(secretKey, "sec")}
                    className="p-1.5 text-neutral-500 hover:text-white rounded bg-neutral-950 hover:bg-neutral-900 border border-neutral-900 transition-all"
                  >
                    {copiedKey === "sec" ? <Check className="w-3.5 h-3.5 text-emerald-450" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-neutral-900 mt-6 flex justify-between items-center">
              <div className="flex items-center gap-1.5 text-[9px] text-neutral-500 font-mono">
                <Shield className="w-3.5 h-3.5" />
                <span>Private keys are hashed inside HSM storage.</span>
              </div>
              <button
                onClick={handleRegenerateKeys}
                disabled={isRegenerating}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-950 hover:bg-neutral-900 border border-neutral-900 hover:border-neutral-800 text-neutral-300 rounded text-[10px] font-mono font-bold transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 text-neutral-500 ${isRegenerating ? "animate-spin" : ""}`} />
                <span>{isRegenerating ? "Rotating..." : "Rotate Credentials"}</span>
              </button>
            </div>

          </div>
        </div>

        {/* Webhooks Configurator Card */}
        <div className="glass-card border border-neutral-900 rounded-xl p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-900 mb-6">
            <div className="flex items-center gap-2">
              <Globe className="w-4.5 h-4.5 text-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Webhook Settings
              </h3>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500 glow-emerald" />
          </div>

          <div className="space-y-4">
            
            {/* Destination URL */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono block">
                Webhook Endpoint URL
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://api.merchant.com/v1/webhooks"
                className="w-full px-3 py-2 bg-black border border-neutral-900 rounded text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            {/* Signing Secret */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-neutral-400 uppercase tracking-wider font-mono">Signing Secret</span>
                <span className="text-[8px] text-neutral-500 font-mono">Used to verify payload headers signature</span>
              </div>
              <div className="flex items-center bg-black border border-neutral-900 rounded p-1">
                <span className="text-[10px] text-neutral-350 font-mono flex-1 px-2 select-all truncate">
                  {signingSecret}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(signingSecret)
                    setCopiedSecret(true)
                    setTimeout(() => setCopiedSecret(false), 2000)
                  }}
                  className="p-1.5 text-neutral-500 hover:text-white rounded bg-neutral-950 hover:bg-neutral-900 border border-neutral-900 transition-all shrink-0"
                >
                  {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-450" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Events Subscriptions Grid */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono block">
                Subscribed Events
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(subscribedEvents).map(([event, active]) => (
                  <label 
                    key={event} 
                    className="flex items-center justify-between p-2.5 rounded bg-black border border-neutral-900/60 hover:border-neutral-850 cursor-pointer select-none"
                  >
                    <span className="text-[10px] font-mono text-neutral-350">{event}</span>
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => handleEventToggle(event as keyof typeof subscribedEvents)}
                      className="accent-indigo-500 text-indigo-500 cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Webhook Test trigger */}
            <div className="pt-4 border-t border-neutral-900 mt-6 flex justify-between items-center">
              <p className="text-[9px] text-neutral-500 font-mono leading-relaxed max-w-[280px]">
                Deliver a mock webhook event payload to the URL above to verify your local endpoint listener is functional.
              </p>
              <button
                type="button"
                onClick={handleSendTestWebhook}
                disabled={isSendingTest}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-neutral-950 hover:bg-neutral-900 border border-neutral-900 hover:border-neutral-800 text-white rounded text-[10px] font-mono font-bold transition-all disabled:opacity-50"
              >
                <Play className="w-3 h-3 text-cyan-400 fill-cyan-400" />
                <span>{isSendingTest ? "Broadcasting..." : "Send Test Trigger"}</span>
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* Right Column: Code snippets & Webhooklogs (5 Columns) */}
      <div className="lg:col-span-5 space-y-8">
        
        {/* Code Snippets Card */}
        <div className="glass-card border border-neutral-900 rounded-xl p-5 shadow-xl flex flex-col justify-between min-h-[300px]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-900 mb-5">
              <div className="flex items-center gap-2">
                <Code className="w-4.5 h-4.5 text-indigo-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Integration SDK
                </h3>
              </div>
              <span className="text-[9px] font-mono text-neutral-500 font-semibold">Node / React / CLI</span>
            </div>

            {/* Code Tabs */}
            <div className="flex bg-neutral-950 border border-neutral-900 rounded p-0.5 mb-4 w-full">
              {(["javascript", "react", "curl"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setCodeTab(tab)}
                  className={`flex-1 py-1 text-[9px] font-mono font-bold uppercase tracking-wider rounded transition-all ${
                    codeTab === tab 
                      ? "bg-neutral-900 text-white border border-neutral-850" 
                      : "text-neutral-500 hover:text-neutral-350"
                  }`}
                >
                  {tab === "javascript" ? "NodeJS" : tab === "react" ? "React" : "cURL"}
                </button>
              ))}
            </div>

            {/* Code terminal */}
            <div className="relative rounded-lg overflow-hidden border border-neutral-900 bg-black p-3.5 font-mono text-[9px] leading-relaxed text-neutral-300">
              <pre className="overflow-x-auto whitespace-pre font-mono">
                {codeSnippets[codeTab].split("\n").map((line, idx) => 
                  codeTab === "curl" 
                    ? highlightCurlLine(line, idx) 
                    : highlightJsLine(line, idx)
                )}
              </pre>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-900 flex justify-between items-center text-[8px] text-neutral-500 font-mono uppercase tracking-wider">
            <span>Auth header required</span>
            <span>TLS 1.3 encryption</span>
          </div>
        </div>

        {/* Webhook Delivery logs */}
        <div className="glass-card border border-neutral-900 rounded-xl p-5 shadow-xl flex flex-col justify-between min-h-[340px]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-900 mb-5">
              <div className="flex items-center gap-2">
                <Server className="w-4.5 h-4.5 text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Webhook Deliveries
                </h3>
              </div>
              <span className="text-[9px] font-mono text-neutral-500">Live logs</span>
            </div>

            {/* Ledger logs */}
            <div className="space-y-2.5 overflow-y-auto max-h-[200px] pr-1">
              <AnimatePresence initial={false}>
                {webhookLogs.map((log) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-neutral-950 border border-neutral-900 rounded flex items-center justify-between text-[10px]"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-white">{log.event}</span>
                        <span className="text-[8px] font-mono text-neutral-500 font-bold">{log.id}</span>
                      </div>
                      <span className="text-[8px] font-mono text-neutral-500 block truncate max-w-[170px] mt-1">
                        {log.url}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className={`inline-flex items-center justify-center font-bold px-1.5 py-0.5 rounded font-mono text-[9px] ${
                        log.status === 200 
                          ? "bg-emerald-500/10 text-emerald-450 border border-emerald-500/20" 
                          : "bg-red-500/10 text-red-500 border border-red-500/20"
                      }`}>
                        {log.status}
                      </span>
                      <span className="text-[8px] font-mono text-neutral-600 block mt-1">{log.latency}ms</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {webhookLogs.length === 0 && (
                <div className="text-center py-10 text-[10px] text-neutral-500 font-mono">
                  No webhooks sent. Trigger a test event.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-900 text-[8px] text-neutral-600 font-semibold leading-relaxed">
            Relayer monitors receiver URL responses. Payloads auto-retry up to 3 times on failures.
          </div>
        </div>

      </div>

    </div>
  )
}
