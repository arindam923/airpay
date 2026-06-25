"use client"

import React, { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import {
  Wallet2, Shield, CheckCircle2, RefreshCw,
  Zap, Globe, Info
} from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787"

interface Wallet {
  network: string
  walletAddress: string
}

interface SettlementSettings {
  id: string
  enabledChains: string[]
  updatedAt: number
}

export default function SettlementsTab() {
  const [wallets, setWallets] = useState<Wallet[]>([
    { network: "Solana", walletAddress: "" },
    { network: "Arbitrum", walletAddress: "" },
    { network: "Polygon", walletAddress: "" },
    { network: "Ethereum", walletAddress: "" },
  ])
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const [isSavingWallets, setIsSavingWallets] = useState(false)
  const [isLoadingWallets, setIsLoadingWallets] = useState(true)

  const [settings, setSettings] = useState<SettlementSettings | null>(null)
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const fetchWallets = useCallback(async () => {
    setIsLoadingWallets(true)
    try {
      const res = await fetch(`${API_URL}/api/merchant/profile`, { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        if (data.wallets) {
          const merged: Wallet[] = [
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
      }
    } catch {} finally { setIsLoadingWallets(false) }
  }, [])

  const fetchSettings = useCallback(async () => {
    setIsLoadingSettings(true)
    try {
      const res = await fetch(`${API_URL}/api/merchant/settlement-settings`, { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
      }
    } catch {} finally { setIsLoadingSettings(false) }
  }, [])

  useEffect(() => {
    fetchWallets()
    fetchSettings()
  }, [fetchWallets, fetchSettings])

  const handleCopy = (address: string, chain: string) => {
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopiedAddress(chain)
    setTimeout(() => setCopiedAddress(null), 2000)
  }

  const updateWalletAddress = (network: string, value: string) => {
    setWallets(prev => prev.map(w => w.network === network ? { ...w, walletAddress: value } : w))
  }

  const saveWallets = async () => {
    setIsSavingWallets(true)
    try {
      const res = await fetch(`${API_URL}/api/merchant/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          wallets: wallets.filter(w => w.walletAddress),
        }),
      })
      if (!res.ok) throw new Error("Failed")
      await fetchWallets()
    } catch {
      alert("Failed to save wallet addresses")
    } finally {
      setIsSavingWallets(false)
    }
  }

  const saveSettings = async (patch: Partial<SettlementSettings>) => {
    setIsSavingSettings(true)
    try {
      const res = await fetch(`${API_URL}/api/merchant/settlement-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      setSettings(data)
      setSavedAt(Date.now())
      setTimeout(() => setSavedAt(null), 2000)
    } catch {
      alert("Failed to save settings")
    } finally {
      setIsSavingSettings(false)
    }
  }

  const handleChainToggle = (chain: string) => {
    if (!settings) return
    const next = settings.enabledChains.includes(chain)
      ? settings.enabledChains.filter(c => c !== chain)
      : [...settings.enabledChains, chain]
    setSettings({ ...settings, enabledChains: next })
    saveSettings({ enabledChains: next })
  }

  if (isLoadingSettings || isLoadingWallets) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-5 h-5 text-neutral-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

      <div className="lg:col-span-7 space-y-8">

        {/* Non-custodial info banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card border border-emerald-500/20 rounded-xl p-5 shadow-xl bg-emerald-500/5"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Non-Custodial Settlement
              </h3>
              <p className="text-[10px] text-neutral-400 mt-1.5 leading-relaxed font-semibold">
                AirPay never holds your funds. When a buyer pays, 98% is sent
                <strong className="text-emerald-400"> directly to your wallet</strong> on-chain,
                and 2% goes directly to the platform fee wallet — instantly.
                There are no sweep schedules, gas sponsorships, or withdrawal delays.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Wallet addresses */}
        <div className="glass-card border border-neutral-900 rounded-xl p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-900 mb-6">
            <div className="flex items-center gap-2">
              <Wallet2 className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Receiving Wallets
              </h3>
            </div>
            <span className="text-[9px] font-mono text-neutral-500">On-chain destination addresses</span>
          </div>

          <div className="space-y-4">
            {wallets.map(w => (
              <div key={w.network} className="space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-bold text-neutral-400 font-mono">{w.network}</span>
                  <span className="text-[8px] text-neutral-500 font-mono">
                    {w.network === "Solana" ? "SPL token receiver" : w.network === "Ethereum" ? "ERC-20 token receiver" : "L2 ERC-20 receiver"}
                  </span>
                </div>
                <div className="flex items-center bg-black border border-neutral-900 rounded p-1">
                  <input
                    type="text"
                    value={w.walletAddress}
                    onChange={(e) => updateWalletAddress(w.network, e.target.value)}
                    placeholder={`Your ${w.network} wallet address`}
                    className="bg-transparent text-[10px] text-neutral-300 font-mono flex-1 focus:outline-none px-2 font-semibold placeholder-neutral-700"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(w.walletAddress, w.network)}
                    className="px-2 py-1 text-[9px] font-mono text-neutral-400 hover:text-white"
                  >
                    {copiedAddress === w.network ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            ))}

            <div className="pt-4 border-t border-neutral-900 mt-6 flex justify-between items-center">
              <span className="text-[8px] text-neutral-500 font-mono uppercase tracking-wider flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" />
                <span>Save updates the merchant profile wallets</span>
              </span>
              <button
                onClick={saveWallets}
                disabled={isSavingWallets}
                type="button"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 text-white rounded text-xs font-bold transition-all shadow-md flex items-center gap-2"
              >
                {isSavingWallets ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Save Wallets</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      <div className="lg:col-span-5 space-y-8">

        {/* Enabled Networks */}
        <div className="glass-card border border-neutral-900 rounded-xl p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-900 mb-5">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Enabled Networks
              </h3>
            </div>
            <span className="text-[9px] font-mono text-neutral-500">
              {savedAt ? "Saved" : "Active chains"}
            </span>
          </div>

          {settings && (
            <div className="space-y-4 text-xs font-medium">
              <p className="text-[10px] text-neutral-500 leading-relaxed">
                Toggle which blockchain networks you want to accept payments on.
                Buyers will only see enabled networks at checkout.
              </p>

              <div className="grid grid-cols-2 gap-2">
                {wallets.map(w => {
                  const active = settings.enabledChains.includes(w.network)
                  return (
                    <button
                      type="button"
                      key={w.network}
                      onClick={() => handleChainToggle(w.network)}
                      className={`py-2 px-3 rounded font-mono text-[10px] font-bold text-left border flex items-center justify-between transition-colors ${
                        active
                          ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                          : "bg-black text-neutral-500 border-neutral-900 hover:border-neutral-800"
                      }`}
                    >
                      <span>{w.network}</span>
                      <span>{active ? "ON" : "OFF"}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* How it works info card */}
        <div className="glass-card border border-neutral-900 rounded-xl p-5 shadow-xl">
          <div className="flex items-center gap-2 pb-3 border-b border-neutral-900 mb-5">
            <Info className="w-4 h-4 text-neutral-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              How Settlements Work
            </h3>
          </div>

          <div className="space-y-3 text-[10px] text-neutral-400 font-semibold leading-relaxed">
            <div className="flex gap-2.5">
              <span className="text-indigo-400 font-mono font-bold shrink-0">01</span>
              <span>
                Buyer connects their wallet and confirms the payment amount.
              </span>
            </div>
            <div className="flex gap-2.5">
              <span className="text-indigo-400 font-mono font-bold shrink-0">02</span>
              <span>
                Their wallet signs a transaction that splits the payment:
                <strong className="text-emerald-400"> 98% to your wallet</strong> and
                <strong className="text-white"> 2% to AirPay</strong>.
              </span>
            </div>
            <div className="flex gap-2.5">
              <span className="text-indigo-400 font-mono font-bold shrink-0">03</span>
              <span>
                Funds arrive directly on-chain. No holding periods, no sweep rules, no gas sponsorship needed.
              </span>
            </div>
          </div>

          <div className="text-[8px] text-neutral-600 font-semibold leading-relaxed border-t border-neutral-900 pt-3 mt-4">
            Settlement is instant and final once the blockchain confirms the transaction.
            AirPay does not have access to your private keys or funds at any point.
          </div>
        </div>

      </div>

    </div>
  )
}
