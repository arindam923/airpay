"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { 
  Sliders, Wallet2, Shield, Settings, 
  HelpCircle, CheckCircle2, ChevronRight, Activity, ArrowUpRight
} from "lucide-react"

export default function SettlementsTab() {
  // Vault Addresses state
  const [solAddress, setSolAddress] = useState("8x4KjJda923HskKsJ28skaKsaP2J83skKlsHskW1")
  const [ethAddress, setEthAddress] = useState("0x71C7656EC7ab88b098defB751B7401B5f6d8976F")
  const [arbAddress, setArbAddress] = useState("0x71C7656EC7ab88b098defB751B7401B5f6d8976F")
  const [polyAddress, setPolyAddress] = useState("0x71C7656EC7ab88b098defB751B7401B5f6d8976F")
  
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const [isSaved, setIsSaved] = useState(false)

  // Auto Settlement Rules
  const [autoSettle, setAutoSettle] = useState(true)
  const [sweepThreshold, setSweepThreshold] = useState("1000")
  const [sweepSchedule, setSweepSchedule] = useState("daily")

  // Gas Sponsorship
  const [sponsorGas, setSponsorGas] = useState(true)
  const [gasCap, setGasCap] = useState("250")
  const [selectedChains, setSelectedChains] = useState({
    Solana: true,
    Arbitrum: true,
    Polygon: true,
    Ethereum: false
  })

  // Recent Sweep Logs
  const [sweepLogs] = useState([
    { id: "swp_901", amount: 4500, currency: "USDC", network: "Solana", destination: "8x4KjJda...sHskW1", date: "June 05, 2026", hash: "4sK92...3Js" },
    { id: "swp_902", amount: 1200, currency: "USDT", network: "Arbitrum", destination: "0x71C7...8976F", date: "June 03, 2026", hash: "0xe2f...1a4" },
    { id: "swp_903", amount: 850, currency: "EURC", network: "Polygon", destination: "0x71C7...8976F", date: "May 29, 2026", hash: "0xb7d...e4a" }
  ])

  // Save settings simulation
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
  }

  // Chain selection toggle
  const handleChainToggle = (chain: keyof typeof selectedChains) => {
    setSelectedChains(prev => ({
      ...prev,
      [chain]: !prev[chain]
    }))
  }

  const handleCopy = (address: string, chain: string) => {
    navigator.clipboard.writeText(address)
    setCopiedAddress(chain)
    setTimeout(() => setCopiedAddress(null), 2000)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* Left Column: Settlement Addresses & Sweep Rules (7 Columns) */}
      <div className="lg:col-span-7 space-y-8">
        
        {/* Treasury Addresses Configuration */}
        <div className="glass-card border border-neutral-900 rounded-xl p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-900 mb-6">
            <div className="flex items-center gap-2">
              <Wallet2 className="w-4.5 h-4.5 text-indigo-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Treasury Settlement Vaults
              </h3>
            </div>
            <span className="text-[9px] font-mono text-neutral-500">Auto-routed destination wallets</span>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            
            {/* Solana address */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-neutral-400 font-mono">Solana Settlement Vault</span>
                <span className="text-[8px] text-neutral-550 text-neutral-500 font-mono">SPL token receiver</span>
              </div>
              <div className="flex items-center bg-black border border-neutral-900 rounded p-1">
                <input
                  type="text"
                  value={solAddress}
                  onChange={(e) => setSolAddress(e.target.value)}
                  className="bg-transparent text-[10px] text-neutral-300 font-mono flex-1 focus:outline-none px-2 font-semibold"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(solAddress, "sol")}
                  className="px-2 py-1 text-[9px] font-mono text-neutral-400 hover:text-white"
                >
                  {copiedAddress === "sol" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            {/* Ethereum address */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-neutral-400 font-mono">Ethereum Settlement Vault</span>
                <span className="text-[8px] text-neutral-550 text-neutral-500 font-mono">ERC-20 token receiver</span>
              </div>
              <div className="flex items-center bg-black border border-neutral-900 rounded p-1">
                <input
                  type="text"
                  value={ethAddress}
                  onChange={(e) => setEthAddress(e.target.value)}
                  className="bg-transparent text-[10px] text-neutral-300 font-mono flex-1 focus:outline-none px-2 font-semibold"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(ethAddress, "eth")}
                  className="px-2 py-1 text-[9px] font-mono text-neutral-400 hover:text-white"
                >
                  {copiedAddress === "eth" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            {/* Arbitrum address */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-neutral-400 font-mono">Arbitrum Settlement Vault</span>
                <span className="text-[8px] text-neutral-550 text-neutral-500 font-mono">L2 ERC-20 receiver</span>
              </div>
              <div className="flex items-center bg-black border border-neutral-900 rounded p-1">
                <input
                  type="text"
                  value={arbAddress}
                  onChange={(e) => setArbAddress(e.target.value)}
                  className="bg-transparent text-[10px] text-neutral-300 font-mono flex-1 focus:outline-none px-2 font-semibold"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(arbAddress, "arb")}
                  className="px-2 py-1 text-[9px] font-mono text-neutral-400 hover:text-white"
                >
                  {copiedAddress === "arb" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            {/* Polygon address */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-neutral-400 font-mono">Polygon Settlement Vault</span>
                <span className="text-[8px] text-neutral-550 text-neutral-500 font-mono">L2 ERC-20 receiver</span>
              </div>
              <div className="flex items-center bg-black border border-neutral-900 rounded p-1">
                <input
                  type="text"
                  value={polyAddress}
                  onChange={(e) => setPolyAddress(e.target.value)}
                  className="bg-transparent text-[10px] text-neutral-300 font-mono flex-1 focus:outline-none px-2 font-semibold"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(polyAddress, "poly")}
                  className="px-2 py-1 text-[9px] font-mono text-neutral-400 hover:text-white"
                >
                  {copiedAddress === "poly" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            {/* Save Action */}
            <div className="pt-4 border-t border-neutral-900 mt-6 flex justify-between items-center">
              <span className="text-[8px] text-neutral-500 font-mono uppercase tracking-wider flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" />
                <span>Addresses validated through cross-checksums</span>
              </span>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold transition-all shadow-md flex items-center gap-2"
              >
                {isSaved ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Settings Saved!</span>
                  </>
                ) : (
                  <span>Save Vault Addresses</span>
                )}
              </button>
            </div>

          </form>
        </div>

        {/* Auto Sweep rules configuration */}
        <div className="glass-card border border-neutral-900 rounded-xl p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-900 mb-6">
            <div className="flex items-center gap-2">
              <Sliders className="w-4.5 h-4.5 text-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Auto-Sweep Rules
              </h3>
            </div>
            <span className="text-[9px] font-mono text-neutral-500">Withdrawal parameters</span>
          </div>

          <div className="space-y-4 text-xs font-medium">
            
            {/* Toggle switch */}
            <div className="flex items-center justify-between p-3.5 rounded-lg bg-black border border-neutral-900/60 hover:border-neutral-850 transition-all select-none">
              <div>
                <h4 className="text-xs font-bold text-white">Enable Automated Sweeps</h4>
                <p className="text-[9px] text-neutral-500 mt-0.5">Funds will be auto-swept to configured vaults when conditions trigger</p>
              </div>
              <button
                type="button"
                onClick={() => setAutoSettle(!autoSettle)}
                className={`relative w-9 h-5 rounded-full p-0.5 transition-colors ${
                  autoSettle ? "bg-indigo-600" : "bg-neutral-800"
                }`}
              >
                <div 
                  className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    autoSettle ? "translate-x-4" : "translate-x-0"
                  }`} 
                />
              </button>
            </div>

            {/* Sweep Rules details */}
            {autoSettle && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-neutral-950 p-4 border border-neutral-900 rounded-lg">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-neutral-450 uppercase tracking-wider font-mono block">
                    Sweep Trigger Threshold (USD equivalent)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-xs font-bold">$</span>
                    <input
                      type="number"
                      value={sweepThreshold}
                      onChange={(e) => setSweepThreshold(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 bg-black border border-neutral-900 rounded text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-neutral-450 uppercase tracking-wider font-mono block">
                    Sweep Schedule Interval
                  </label>
                  <select
                    value={sweepSchedule}
                    onChange={(e) => setSweepSchedule(e.target.value)}
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
        </div>

      </div>

      {/* Right Column: Gas Sponsorship & Settlement Logs (5 Columns) */}
      <div className="lg:col-span-5 space-y-8">
        
        {/* Gasless routing sponsorship configurations */}
        <div className="glass-card border border-neutral-900 rounded-xl p-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-900 mb-5">
            <div className="flex items-center gap-2">
              <Settings className="w-4.5 h-4.5 text-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Gas Sponsorship
              </h3>
            </div>
            <span className="text-[9px] font-mono text-neutral-500">Relayer settings</span>
          </div>

          <div className="space-y-4 text-xs font-medium">
            {/* Toggle gas sponsorship */}
            <div className="flex items-center justify-between p-3 rounded bg-black border border-neutral-900 select-none">
              <div>
                <h4 className="text-[11px] font-bold text-white uppercase tracking-wider font-mono">Sponsor Gas Fees</h4>
                <p className="text-[9px] text-neutral-500 mt-0.5">Sponsor wallet fee for buyers to increase sales conversion</p>
              </div>
              <button
                type="button"
                onClick={() => setSponsorGas(!sponsorGas)}
                className={`relative w-8 h-4.5 rounded-full p-0.5 transition-colors shrink-0 ${
                  sponsorGas ? "bg-cyan-500" : "bg-neutral-800"
                }`}
              >
                <div 
                  className={`w-3.5 h-3.5 bg-white rounded-full transition-transform ${
                    sponsorGas ? "translate-x-3.5" : "translate-x-0"
                  }`} 
                />
              </button>
            </div>

            {sponsorGas && (
              <div className="space-y-4">
                {/* Monthly limit */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-neutral-450 uppercase tracking-wider font-mono block">
                    Monthly Sponsorship Cap (USD equivalent)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-xs font-bold">$</span>
                    <input
                      type="number"
                      value={gasCap}
                      onChange={(e) => setGasCap(e.target.value)}
                      className="w-full pl-6 pr-3 py-1.5 bg-black border border-neutral-900 rounded text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </div>

                {/* Sponsored networks */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-neutral-450 uppercase tracking-wider font-mono block">
                    Sponsored Networks
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(selectedChains).map(([chain, active]) => (
                      <button
                        type="button"
                        key={chain}
                        onClick={() => handleChainToggle(chain as keyof typeof selectedChains)}
                        className={`py-1 px-2.5 rounded font-mono text-[9px] font-bold text-left border flex items-center justify-between transition-colors ${
                          active 
                            ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" 
                            : "bg-black text-neutral-500 border-neutral-900 hover:border-neutral-800"
                        }`}
                      >
                        <span>{chain}</span>
                        <span>{active ? "ON" : "OFF"}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Settlements Sweep logs */}
        <div className="glass-card border border-neutral-900 rounded-xl p-5 shadow-xl flex flex-col justify-between min-h-[300px]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-900 mb-5">
              <div className="flex items-center gap-2">
                <Activity className="w-4.5 h-4.5 text-indigo-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Settlement History
                </h3>
              </div>
              <span className="text-[9px] font-mono text-neutral-500">Auto-sweeps</span>
            </div>

            {/* Logs List */}
            <div className="space-y-2.5 overflow-y-auto max-h-[160px] pr-1">
              {sweepLogs.map((log) => (
                <div key={log.id} className="p-3 bg-neutral-950 border border-neutral-900 rounded flex justify-between items-center text-[10px]">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white">Settle {log.id}</span>
                      <span className="text-[8px] font-mono text-neutral-500 font-bold">{log.date}</span>
                    </div>
                    <span className="text-[8px] font-mono text-neutral-500 block truncate mt-1">
                      Vault: {log.destination}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-emerald-450 font-bold block">
                      +{log.amount} {log.currency}
                    </span>
                    <span className="text-[8px] font-mono text-neutral-600 block mt-1">{log.network}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[8px] text-neutral-600 font-semibold leading-relaxed border-t border-neutral-900 pt-3 mt-4">
            Settlement records are immutable and logged under SHA-256 validator relays.
          </div>
        </div>

      </div>

    </div>
  )
}
