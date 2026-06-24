"use client"

import React, { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { 
  Sliders, Wallet2, Shield, Settings, 
  CheckCircle2, Activity, RefreshCw
} from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787"

interface Wallet {
  network: string
  walletAddress: string
}

interface SettlementSettings {
  id: string
  autoSettle: boolean
  sweepThresholdCents: number
  sweepSchedule: string
  sponsorGas: boolean
  gasCapCents: number
  enabledChains: string[]
  updatedAt: number
}

interface SweepLog {
  id: string
  amount: number
  currency: string
  network: string
  destinationAddress: string
  txHash: string | null
  status: string
  sweptAt: number
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

  const [sweepLogs, setSweepLogs] = useState<SweepLog[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(true)

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

  const fetchSweepLogs = useCallback(async () => {
    setIsLoadingLogs(true)
    try {
      const res = await fetch(`${API_URL}/api/merchant/sweep-logs?limit=20`, { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setSweepLogs(data.logs || [])
      }
    } catch {} finally { setIsLoadingLogs(false) }
  }, [])

  useEffect(() => {
    fetchWallets()
    fetchSettings()
    fetchSweepLogs()
  }, [fetchWallets, fetchSettings, fetchSweepLogs])

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
      alert("Failed to save vault addresses")
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

  const handleAutoSettleToggle = () => {
    if (!settings) return
    const next = !settings.autoSettle
    setSettings({ ...settings, autoSettle: next })
    saveSettings({ autoSettle: next })
  }

  const handleSponsorGasToggle = () => {
    if (!settings) return
    const next = !settings.sponsorGas
    setSettings({ ...settings, sponsorGas: next })
    saveSettings({ sponsorGas: next })
  }

  const handleChainToggle = (chain: string) => {
    if (!settings) return
    const next = settings.enabledChains.includes(chain)
      ? settings.enabledChains.filter(c => c !== chain)
      : [...settings.enabledChains, chain]
    setSettings({ ...settings, enabledChains: next })
    saveSettings({ enabledChains: next })
  }

  const updateThreshold = (dollars: string) => {
    if (!settings) return
    const cents = Math.round(parseFloat(dollars || "0") * 100)
    setSettings({ ...settings, sweepThresholdCents: cents })
  }

  const commitThreshold = () => {
    if (!settings) return
    saveSettings({ sweepThresholdCents: settings.sweepThresholdCents })
  }

  const updateGasCap = (dollars: string) => {
    if (!settings) return
    const cents = Math.round(parseFloat(dollars || "0") * 100)
    setSettings({ ...settings, gasCapCents: cents })
  }

  const commitGasCap = () => {
    if (!settings) return
    saveSettings({ gasCapCents: settings.gasCapCents })
  }

  const updateSchedule = (schedule: string) => {
    if (!settings) return
    setSettings({ ...settings, sweepSchedule: schedule })
    saveSettings({ sweepSchedule: schedule as any })
  }

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
  }

  const truncateAddress = (addr: string) => {
    if (!addr) return "—"
    if (addr.length <= 14) return addr
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`
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
        
        <div className="glass-card border border-neutral-900 rounded-xl p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-900 mb-6">
            <div className="flex items-center gap-2">
              <Wallet2 className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Treasury Settlement Vaults
              </h3>
            </div>
            <span className="text-[9px] font-mono text-neutral-500">Auto-routed destination wallets</span>
          </div>

          <div className="space-y-4">
            {wallets.map(w => (
              <div key={w.network} className="space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-bold text-neutral-400 font-mono">{w.network} Settlement Vault</span>
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
                <span>Save Vault Addresses</span>
              </button>
            </div>
          </div>
        </div>

        <div className="glass-card border border-neutral-900 rounded-xl p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-900 mb-6">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Auto-Sweep Rules
              </h3>
            </div>
            <span className="text-[9px] font-mono text-neutral-500">
              {savedAt ? "Saved" : "Withdrawal parameters"}
            </span>
          </div>

          {settings && (
            <div className="space-y-4 text-xs font-medium">
              <div className="flex items-center justify-between p-3.5 rounded-lg bg-black border border-neutral-900/60 hover:border-neutral-850 transition-all select-none">
                <div>
                  <h4 className="text-xs font-bold text-white">Enable Automated Sweeps</h4>
                  <p className="text-[9px] text-neutral-500 mt-0.5">Funds will be auto-swept to configured vaults when conditions trigger</p>
                </div>
                <button
                  type="button"
                  onClick={handleAutoSettleToggle}
                  disabled={isSavingSettings}
                  className={`relative w-9 h-5 rounded-full p-0.5 transition-colors ${
                    settings.autoSettle ? "bg-indigo-600" : "bg-neutral-800"
                  }`}
                >
                  <div 
                    className={`w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.autoSettle ? "translate-x-4" : "translate-x-0"
                    }`} 
                  />
                </button>
              </div>

              {settings.autoSettle && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-neutral-950 p-4 border border-neutral-900 rounded-lg">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-neutral-450 uppercase tracking-wider font-mono block">
                      Sweep Trigger Threshold (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-xs font-bold">$</span>
                      <input
                        type="number"
                        value={(settings.sweepThresholdCents / 100).toString()}
                        onChange={(e) => updateThreshold(e.target.value)}
                        onBlur={commitThreshold}
                        className="w-full pl-7 pr-3 py-1.5 bg-black border border-neutral-900 rounded text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-neutral-450 uppercase tracking-wider font-mono block">
                      Sweep Schedule Interval
                    </label>
                    <select
                      value={settings.sweepSchedule}
                      onChange={(e) => updateSchedule(e.target.value)}
                      className="w-full bg-black border border-neutral-900 text-xs text-white font-mono rounded px-3 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="instant">Instant on finality</option>
                      <option value="daily">Daily sweeps (midnight UTC)</option>
                      <option value="weekly">Weekly sweeps (Sundays)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      <div className="lg:col-span-5 space-y-8">
        
        <div className="glass-card border border-neutral-900 rounded-xl p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-900 mb-5">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Gas Sponsorship
              </h3>
            </div>
            <span className="text-[9px] font-mono text-neutral-500">Relayer settings</span>
          </div>

          {settings && (
            <div className="space-y-4 text-xs font-medium">
              <div className="flex items-center justify-between p-3 rounded bg-black border border-neutral-900 select-none">
                <div>
                  <h4 className="text-[11px] font-bold text-white uppercase tracking-wider font-mono">Sponsor Gas Fees</h4>
                  <p className="text-[9px] text-neutral-500 mt-0.5">Sponsor wallet fees for buyers to increase sales conversion</p>
                </div>
                <button
                  type="button"
                  onClick={handleSponsorGasToggle}
                  disabled={isSavingSettings}
                  className={`relative w-8 h-4.5 rounded-full p-0.5 transition-colors shrink-0 ${
                    settings.sponsorGas ? "bg-cyan-500" : "bg-neutral-800"
                  }`}
                >
                  <div 
                    className={`w-3.5 h-3.5 bg-white rounded-full transition-transform ${
                      settings.sponsorGas ? "translate-x-3.5" : "translate-x-0"
                    }`} 
                  />
                </button>
              </div>

              {settings.sponsorGas && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-neutral-450 uppercase tracking-wider font-mono block">
                      Monthly Sponsorship Cap (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-xs font-bold">$</span>
                      <input
                        type="number"
                        value={(settings.gasCapCents / 100).toString()}
                        onChange={(e) => updateGasCap(e.target.value)}
                        onBlur={commitGasCap}
                        className="w-full pl-6 pr-3 py-1.5 bg-black border border-neutral-900 rounded text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-neutral-450 uppercase tracking-wider font-mono block">
                      Sponsored Networks
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {wallets.map(w => {
                        const active = settings.enabledChains.includes(w.network)
                        return (
                          <button
                            type="button"
                            key={w.network}
                            onClick={() => handleChainToggle(w.network)}
                            className={`py-1 px-2.5 rounded font-mono text-[9px] font-bold text-left border flex items-center justify-between transition-colors ${
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
                </div>
              )}
            </div>
          )}
        </div>

        <div className="glass-card border border-neutral-900 rounded-xl p-5 shadow-xl flex flex-col justify-between min-h-[300px]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-900 mb-5">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Settlement History
                </h3>
              </div>
              <button
                onClick={fetchSweepLogs}
                type="button"
                className="text-[9px] font-mono text-neutral-400 hover:text-white flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingLogs ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-[160px] pr-1">
              {isLoadingLogs ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-4 h-4 text-neutral-500 animate-spin" />
                </div>
              ) : sweepLogs.length === 0 ? (
                <div className="text-center py-8 text-[10px] text-neutral-500 font-mono">
                  No auto-sweeps executed yet. Configure thresholds above to start.
                </div>
              ) : (
                sweepLogs.map(log => (
                  <div key={log.id} className="p-3 bg-neutral-950 border border-neutral-900 rounded flex justify-between items-center text-[10px]">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">Sweep {log.id.slice(-6)}</span>
                        <span className="text-[8px] font-mono text-neutral-500 font-bold">{formatTime(log.sweptAt)}</span>
                      </div>
                      <span className="text-[8px] font-mono text-neutral-500 block truncate mt-1">
                        Vault: {truncateAddress(log.destinationAddress)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-emerald-450 font-bold block">
                        +${(log.amount / 100).toFixed(2)}
                      </span>
                      <span className="text-[8px] font-mono text-neutral-600 block mt-1">{log.network} · {log.currency}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="text-[8px] text-neutral-600 font-semibold leading-relaxed border-t border-neutral-900 pt-3 mt-4">
            Sweep logs are recorded when funds are auto-routed to merchant treasury vaults.
          </div>
        </div>

      </div>

    </div>
  )
}
