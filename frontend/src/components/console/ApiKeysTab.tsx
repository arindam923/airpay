"use client"

import React, { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Key, Eye, EyeOff, Copy, Check, RefreshCw, 
  Terminal, Globe, Shield, Play, Code, Server, AlertTriangle, X
} from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787"

interface ApiKeysTabProps {
  isLiveMode: boolean
}

interface ApiKey {
  id: string
  type: string
  environment: string
  display: string
  lastFour: string
  createdAt: number
  lastUsedAt: number | null
  revokedAt: number | null
}

interface WebhookLog {
  id: string
  event: string
  url: string
  statusCode: number | null
  attempt: number
  deliveredAt: number | null
  createdAt: number
  paymentId: string
  txHash: string
}

interface WebhookEvent {
  event: string
  enabled: boolean
}

function highlightJsLine(line: string, lineIndex: number): React.ReactNode {
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

    if (comment) parts.push(<span key={key} className="text-neutral-500">{comment}</span>)
    else if (str) parts.push(<span key={key} className="text-emerald-400">{str}</span>)
    else if (keyword) parts.push(<span key={key} className="text-indigo-400 font-semibold">{keyword}</span>)
    else if (number) parts.push(<span key={key} className="text-cyan-400 font-mono">{number}</span>)
    else if (identifier) {
      if (line[match.index + identifier.length] === ':') {
        parts.push(<span key={key} className="text-neutral-350">{identifier}</span>)
      } else {
        parts.push(<span key={key} className="text-cyan-400">{identifier}</span>)
      }
    }
    lastIndex = tokenRegex.lastIndex
  }

  if (lastIndex < line.length) parts.push(line.substring(lastIndex))

  return <div key={lineIndex} className="min-h-[1.2rem]">{parts.length > 0 ? parts : line}</div>
}

function highlightCurlLine(line: string, lineIndex: number): React.ReactNode {
  if (line.trim().startsWith("#") || line.trim().startsWith("//")) {
    return <div key={lineIndex} className="text-neutral-500 font-mono">{line}</div>
  }
  const tokenRegex = /(https:\/\/[\w./\-_]+)|(\bcurl\b)|(-\w+)|(sk_test_[\w]+|pk_test_[\w]+)/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match
  let matchCount = 0
  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIndex) parts.push(line.substring(lastIndex, match.index))
    const [full, url, curl, flag, keyToken] = match
    const key = `t-${lineIndex}-${match.index}-${matchCount++}`
    if (url) parts.push(<span key={key} className="text-emerald-450">{url}</span>)
    else if (curl) parts.push(<span key={key} className="text-indigo-400 font-bold">{curl}</span>)
    else if (flag) parts.push(<span key={key} className="text-cyan-400 font-semibold">{flag}</span>)
    else if (keyToken) parts.push(<span key={key} className="text-yellow-400 font-mono font-semibold">{keyToken}</span>)
    lastIndex = tokenRegex.lastIndex
  }
  if (lastIndex < line.length) parts.push(line.substring(lastIndex))
  return <div key={lineIndex} className="min-h-[1.2rem]">{parts.length > 0 ? parts : line}</div>
}

export default function ApiKeysTab({ isLiveMode }: ApiKeysTabProps) {
  const [hasProfile, setHasProfile] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [showProfileSetup, setShowProfileSetup] = useState(false)

  const [businessName, setBusinessName] = useState("")
  const [feeType, setFeeType] = useState<"part_of" | "on_top">("part_of")
  const [webhookUrl, setWebhookUrl] = useState("")
  const [wallets, setWallets] = useState([
    { network: "Solana", walletAddress: "" },
    { network: "Arbitrum", walletAddress: "" },
    { network: "Polygon", walletAddress: "" },
    { network: "Ethereum", walletAddress: "" },
  ])
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [isLoadingKeys, setIsLoadingKeys] = useState(true)
  const [showSecret, setShowSecret] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [regeneratingType, setRegeneratingType] = useState<string | null>(null)
  const [revealedKey, setRevealedKey] = useState<{ fullKey: string; type: string; environment: string } | null>(null)

  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([])
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(true)
  const [isSendingTest, setIsSendingTest] = useState(false)

  const [codeTab, setCodeTab] = useState<"javascript" | "react" | "curl">("javascript")

  const fetchMerchantProfile = async () => {
    setIsLoadingProfile(true)
    try {
      const res = await fetch(`${API_URL}/api/merchant/profile`, { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
        setHasProfile(true)
        setBusinessName(data.businessName)
        setFeeType(data.feeType)
        setWebhookUrl(data.webhookUrl || "")
        if (data.wallets) {
          const merged = [
            { network: "Solana", walletAddress: "" },
            { network: "Arbitrum", walletAddress: "" },
            { network: "Polygon", walletAddress: "" },
            { network: "Ethereum", walletAddress: "" },
          ]
          for (const w of data.wallets) {
            const idx = merged.findIndex(m => m.network === w.network)
            if (idx >= 0) merged[idx] = w
          }
          setWallets(merged)
        }
      } else {
        setHasProfile(false)
      }
    } catch {
      setHasProfile(false)
    } finally {
      setIsLoadingProfile(false)
    }
  }

  const fetchApiKeys = async () => {
    setIsLoadingKeys(true)
    try {
      const res = await fetch(`${API_URL}/api/merchant/api-keys`, { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setApiKeys(data.keys || [])
      }
    } catch {} finally { setIsLoadingKeys(false) }
  }

  const fetchWebhookData = async () => {
    setIsLoadingLogs(true)
    try {
      const [eventsRes, logsRes] = await Promise.all([
        fetch(`${API_URL}/api/merchant/webhook-events`, { credentials: "include" }),
        fetch(`${API_URL}/api/merchant/webhook-logs?limit=20`, { credentials: "include" }),
      ])
      if (eventsRes.ok) {
        const data = await eventsRes.json()
        setWebhookEvents(data.events || [])
      }
      if (logsRes.ok) {
        const data = await logsRes.json()
        setWebhookLogs(data.logs || [])
      }
    } catch {} finally { setIsLoadingLogs(false) }
  }

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!mounted) return
      await Promise.all([
        fetchMerchantProfile(),
        fetchApiKeys(),
        fetchWebhookData(),
      ])
    }
    void fetchMerchantProfile
    void fetchApiKeys
    void fetchWebhookData
    load()
    return () => { mounted = false }
  }, [])

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
          wallets: wallets.filter(w => w.walletAddress),
        }),
      })

      if (!res.ok) throw new Error("Failed to save profile")

      setHasProfile(true)
      setShowProfileSetup(false)
      await fetchMerchantProfile()
      await fetchApiKeys()
    } catch {
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

  const handleCopy = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(identifier)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleRegenerate = async (type: string) => {
    if (regeneratingType) return
    setRegeneratingType(type)
    try {
      const res = await fetch(`${API_URL}/api/merchant/api-keys/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type, environment: isLiveMode ? "live" : "test" }),
      })
      if (!res.ok) throw new Error("Failed to regenerate")
      const data = await res.json()
      setRevealedKey({ fullKey: data.fullKey, type, environment: data.environment })
      await fetchApiKeys()
    } catch {
      alert("Failed to regenerate key")
    } finally {
      setRegeneratingType(null)
    }
  }

  const handleRevoke = async (id: string) => {
    if (!confirm("Revoke this key? Any client using it will stop working.")) return
    try {
      await fetch(`${API_URL}/api/merchant/api-keys/${id}/revoke`, {
        method: "POST",
        credentials: "include",
      })
      await fetchApiKeys()
    } catch {
      alert("Failed to revoke key")
    }
  }

  const handleEventToggle = async (event: string) => {
    const updated = webhookEvents.map(e =>
      e.event === event ? { ...e, enabled: !e.enabled } : e
    )
    setWebhookEvents(updated)
    try {
      await fetch(`${API_URL}/api/merchant/webhook-events`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          events: Object.fromEntries(updated.map(e => [e.event, e.enabled])),
        }),
      })
    } catch {
      await fetchWebhookData()
    }
  }

  const handleSendTestWebhook = async () => {
    setIsSendingTest(true)
    try {
      await new Promise(r => setTimeout(r, 800))
      await fetchWebhookData()
    } finally {
      setIsSendingTest(false)
    }
  }

  const publishableKey = useMemo(() => {
    const pk = apiKeys.find(k => k.type === "publishable" && k.environment === (isLiveMode ? "live" : "test"))
    return pk?.display ?? "—"
  }, [apiKeys, isLiveMode])

  const secretKey = useMemo(() => {
    const sk = apiKeys.find(k => k.type === "secret" && k.environment === (isLiveMode ? "live" : "test"))
    return sk?.display ?? "—"
  }, [apiKeys, isLiveMode])

  const signingSecret = useMemo(() => {
    const ss = apiKeys.find(k => k.type === "signing" && k.environment === (isLiveMode ? "live" : "test"))
    return ss?.display ?? "—"
  }, [apiKeys, isLiveMode])

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

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleString("en-US", {
      month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit"
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      <div className="lg:col-span-7 space-y-8">

        <div className="glass-card border border-neutral-900 rounded-xl p-5 shadow-xl relative">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-900 mb-6">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-400" />
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
                    type="button"
                    className={`flex-1 py-1 text-[9px] font-mono font-bold uppercase tracking-wider rounded transition-all ${
                      feeType === "part_of" ? "bg-neutral-900 text-white border border-neutral-850" : "text-neutral-500 hover:text-neutral-300"
                    }`}
                  >
                    Part of Total
                  </button>
                  <button
                    onClick={() => setFeeType("on_top")}
                    type="button"
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
                  type="button"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 text-white text-xs font-bold rounded transition-colors shadow-md flex items-center justify-center gap-2"
                >
                  {isSavingProfile ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{hasProfile ? "Update Profile" : "Create Profile"}</span>
                  )}
                </button>
                {hasProfile && (
                  <button
                    onClick={() => setShowProfileSetup(false)}
                    type="button"
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
                type="button"
                className="w-full py-1.5 bg-neutral-950 border border-neutral-900 hover:border-neutral-700 text-white rounded text-[10px] font-mono font-bold transition-all"
              >
                Edit Profile
              </button>
            </div>
          )}
        </div>
        
        <div className="glass-card border border-neutral-900 rounded-xl p-5 shadow-xl relative">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-900 mb-6">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                API Credentials
              </h3>
            </div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-neutral-950 border border-neutral-900 text-neutral-450 font-semibold uppercase">
              {isLiveMode ? "Production Mode" : "Sandbox Test Mode"}
            </span>
          </div>

          {isLoadingKeys ? (
            <div className="flex items-center justify-center py-6">
              <RefreshCw className="w-4 h-4 text-neutral-500 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {[
                { type: "publishable", label: "Publishable Key", display: publishableKey, identifier: "pub", canHide: false, sensitive: false },
                { type: "secret", label: "Secret Key", display: secretKey, identifier: "sec", canHide: true, sensitive: true },
                { type: "signing", label: "Signing Secret", display: signingSecret, identifier: "sig", canHide: false, sensitive: true },
              ].map(row => {
                const liveKey = apiKeys.find(k => k.type === row.type && k.environment === (isLiveMode ? "live" : "test"))
                const isRevoked = !!liveKey?.revokedAt
                return (
                  <div key={row.type} className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-neutral-400 uppercase tracking-wider font-mono">{row.label}</span>
                      {row.sensitive && <span className="text-[8px] text-red-400 font-semibold uppercase tracking-wider font-mono">KEEP PRIVATE</span>}
                    </div>
                    <div className="flex items-center bg-black border border-neutral-900 rounded p-1">
                      <input 
                        type={row.canHide && !showSecret ? "password" : "text"} 
                        value={row.display} 
                        readOnly 
                        className="bg-transparent text-[10px] text-neutral-300 font-mono flex-1 focus:outline-none px-2 select-all tracking-wide"
                      />
                      <div className="flex gap-1 items-center shrink-0">
                        {row.canHide && (
                          <button
                            onClick={() => setShowSecret(s => !s)}
                            type="button"
                            className="p-1.5 text-neutral-500 hover:text-white rounded bg-neutral-950 hover:bg-neutral-900 border border-neutral-900 transition-all"
                          >
                            {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <button
                          onClick={() => handleCopy(row.display, row.identifier)}
                          type="button"
                          className="p-1.5 text-neutral-500 hover:text-white rounded bg-neutral-950 hover:bg-neutral-900 border border-neutral-900 transition-all"
                        >
                          {copiedKey === row.identifier ? <Check className="w-3.5 h-3.5 text-emerald-450" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[9px] font-mono">
                      <span className="text-neutral-500">
                        {liveKey ? `Created ${formatTime(liveKey.createdAt)}` : "No key generated"}
                        {isRevoked && <span className="text-red-400 ml-2">· REVOKED</span>}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRegenerate(row.type)}
                          disabled={!!regeneratingType}
                          type="button"
                          className="text-indigo-400 hover:text-indigo-300 font-bold disabled:opacity-50"
                        >
                          {regeneratingType === row.type ? "Generating…" : "Regenerate"}
                        </button>
                        {liveKey && !isRevoked && (
                          <button
                            onClick={() => handleRevoke(liveKey.id)}
                            type="button"
                            className="text-red-400 hover:text-red-300 font-bold"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              <div className="pt-4 border-t border-neutral-900 mt-6 flex items-center gap-1.5 text-[9px] text-neutral-500 font-mono">
                <Shield className="w-3.5 h-3.5" />
                <span>Secret values are stored as SHA-256 hashes and are shown only once at creation.</span>
              </div>
            </div>
          )}
        </div>

        <div className="glass-card border border-neutral-900 rounded-xl p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-900 mb-6">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Webhook Settings
              </h3>
            </div>
            <div className={`w-2 h-2 rounded-full ${webhookUrl ? "bg-emerald-500 glow-emerald" : "bg-neutral-700"}`} />
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono block">
                Webhook Endpoint URL
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                onBlur={() => { if (hasProfile) handleSaveProfile() }}
                placeholder="https://api.merchant.com/v1/webhooks"
                className="w-full px-3 py-2 bg-black border border-neutral-900 rounded text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono block">
                Subscribed Events
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {webhookEvents.map(ev => (
                  <label 
                    key={ev.event} 
                    className="flex items-center justify-between p-2.5 rounded bg-black border border-neutral-900/60 hover:border-neutral-850 cursor-pointer select-none"
                  >
                    <span className="text-[10px] font-mono text-neutral-350">{ev.event}</span>
                    <input
                      type="checkbox"
                      checked={ev.enabled}
                      onChange={() => handleEventToggle(ev.event)}
                      className="accent-indigo-500 text-indigo-500 cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-900 mt-6 flex justify-between items-center">
              <p className="text-[9px] text-neutral-500 font-mono leading-relaxed max-w-[280px]">
                Webhook delivery logs are listed on the right. Configure your URL above to start receiving events.
              </p>
              <button
                type="button"
                onClick={handleSendTestWebhook}
                disabled={isSendingTest}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-neutral-950 hover:bg-neutral-900 border border-neutral-900 hover:border-neutral-800 text-white rounded text-[10px] font-mono font-bold transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 text-cyan-400 ${isSendingTest ? "animate-spin" : ""}`} />
                <span>{isSendingTest ? "Refreshing..." : "Refresh Logs"}</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      <div className="lg:col-span-5 space-y-8">
        
        <div className="glass-card border border-neutral-900 rounded-xl p-5 shadow-xl flex flex-col justify-between min-h-[300px]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-900 mb-5">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Integration SDK
                </h3>
              </div>
              <span className="text-[9px] font-mono text-neutral-500 font-semibold">Node / React / CLI</span>
            </div>

            <div className="flex bg-neutral-950 border border-neutral-900 rounded p-0.5 mb-4 w-full">
              {(["javascript", "react", "curl"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setCodeTab(tab)}
                  type="button"
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

        <div className="glass-card border border-neutral-900 rounded-xl p-5 shadow-xl flex flex-col justify-between min-h-[340px]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-900 mb-5">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Webhook Deliveries
                </h3>
              </div>
              <span className="text-[9px] font-mono text-neutral-500">Live logs</span>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-[200px] pr-1">
              {isLoadingLogs ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-4 h-4 text-neutral-500 animate-spin" />
                </div>
              ) : (
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
                          <span className="text-[8px] font-mono text-neutral-500 font-bold">#{log.attempt}</span>
                        </div>
                        <span className="text-[8px] font-mono text-neutral-500 block mt-1">
                          {log.txHash ? `${log.txHash.slice(0, 10)}…` : log.paymentId.slice(0, 12)} · {formatTime(log.createdAt)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center justify-center font-bold px-1.5 py-0.5 rounded font-mono text-[9px] ${
                          log.statusCode && log.statusCode < 300
                            ? "bg-emerald-500/10 text-emerald-450 border border-emerald-500/20" 
                            : log.statusCode
                            ? "bg-red-500/10 text-red-500 border border-red-500/20"
                            : "bg-neutral-900 text-neutral-500 border border-neutral-800"
                        }`}>
                          {log.statusCode ?? "queued"}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}

              {!isLoadingLogs && webhookLogs.length === 0 && (
                <div className="text-center py-10 text-[10px] text-neutral-500 font-mono">
                  No webhooks delivered yet.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-900 text-[8px] text-neutral-600 font-semibold leading-relaxed">
            Relayer monitors receiver URL responses. Payloads auto-retry up to 3 times on failures.
          </div>
        </div>

      </div>

      <AnimatePresence>
        {revealedKey && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRevealedKey(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-md bg-neutral-950 border border-indigo-500/30 rounded-xl p-6 shadow-2xl z-10"
            >
              <button
                onClick={() => setRevealedKey(null)}
                type="button"
                className="absolute top-4 right-4 p-1.5 text-neutral-500 hover:text-white rounded bg-neutral-900/60 border border-neutral-850 hover:border-neutral-800 transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider font-mono">
                  Save Your New Key
                </h3>
              </div>
              <p className="text-[10px] text-amber-300 font-semibold mb-5 leading-relaxed">
                This is the only time the full key will be shown. Copy it now and store it securely.
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-neutral-500 uppercase">{revealedKey.type} ({revealedKey.environment})</span>
                </div>
                <div className="flex items-center bg-black border border-neutral-900 rounded p-2">
                  <code className="bg-transparent text-[10px] text-emerald-400 font-mono flex-1 px-2 break-all select-all">
                    {revealedKey.fullKey}
                  </code>
                  <button
                    onClick={() => handleCopy(revealedKey.fullKey, "revealed")}
                    type="button"
                    className="p-1.5 text-neutral-500 hover:text-white rounded bg-neutral-950 hover:bg-neutral-900 border border-neutral-900 transition-all shrink-0"
                  >
                    {copiedKey === "revealed" ? <Check className="w-3.5 h-3.5 text-emerald-450" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button
                  onClick={() => setRevealedKey(null)}
                  type="button"
                  className="w-full py-2 mt-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded transition-colors"
                >
                  I've saved it — close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
