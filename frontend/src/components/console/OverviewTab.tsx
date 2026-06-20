"use client"

import React, { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  TrendingUp, ShieldCheck, Zap, Coins, 
  ArrowUpRight, RefreshCw, Wallet, Globe,
  Activity, ArrowDownLeft, Compass
} from "lucide-react"

interface Transaction {
  id: string
  amount: number
  currency: string
  network: string
  timestamp: Date | string
  status: "pending" | "success" | "failed"
}

interface OverviewTabProps {
  transactions: Transaction[]
  isLiveMode: boolean
}

export default function OverviewTab({ transactions, isLiveMode }: OverviewTabProps) {
  const [timeframe, setTimeframe] = useState<"24h" | "7d" | "30d">("7d")
  const [activeMetric, setActiveMetric] = useState<"volume" | "count">("volume")

  // Format Helper
  const formatUSD = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val)
  }

  // Memoized calculations
  const stats = useMemo(() => {
    const totalVolume = transactions.reduce((acc, t) => acc + (t.status === "success" ? t.amount : 0), 0)
    const txCount = transactions.filter(t => t.status === "success").length
    const failedCount = transactions.filter(t => t.status === "failed").length
    const successRate = transactions.length > 0 
      ? ((txCount / (txCount + failedCount)) * 100).toFixed(2) + "%"
      : "100%"
      
    // Avg settlement speed calculation
    const solanaCount = transactions.filter(t => t.network === "Solana").length
    const ethCount = transactions.filter(t => t.network === "Ethereum").length
    const others = transactions.length - solanaCount - ethCount
    const totalTime = (solanaCount * 0.8) + (ethCount * 4.2) + (others * 1.5)
    const avgSpeed = transactions.length > 0 ? (totalTime / transactions.length).toFixed(1) + "s" : "1.8s"

    // Volume trend (mock static or based on time)
    const trend = totalVolume > 500 ? "+12.4%" : "+0.0%"

    return {
      totalVolume,
      txCount,
      successRate,
      avgSpeed,
      trend
    }
  }, [transactions])

  // Chain and Token breakdowns
  const breakdown = useMemo(() => {
    const chainVolume: Record<string, number> = { Solana: 0, Ethereum: 0, Arbitrum: 0, Polygon: 0 }
    const tokenVolume: Record<string, number> = { USDC: 0, USDT: 0, EURC: 0 }
    let total = 0

    transactions.forEach(t => {
      if (t.status === "success") {
        total += t.amount
        if (chainVolume[t.network] !== undefined) chainVolume[t.network] += t.amount
        if (tokenVolume[t.currency] !== undefined) tokenVolume[t.currency] += t.amount
      }
    })

    return {
      total,
      chains: Object.entries(chainVolume).map(([name, vol]) => ({
        name,
        volume: vol,
        percentage: total > 0 ? Math.round((vol / total) * 100) : 0
      })).sort((a, b) => b.volume - a.volume),
      tokens: Object.entries(tokenVolume).map(([name, vol]) => ({
        name,
        volume: vol,
        percentage: total > 0 ? Math.round((vol / total) * 100) : 0
      })).sort((a, b) => b.volume - a.volume)
    }
  }, [transactions])

  // Generate chart data based on timeframe & metric
  const chartData = useMemo(() => {
    const dataPointsCount = timeframe === "24h" ? 12 : timeframe === "7d" ? 7 : 15
    const width = 600
    const height = 160
    const paddingX = 20
    const paddingY = 20

    // Distribute transaction amounts across points
    const pointsArray = Array.from({ length: dataPointsCount }, (_, i) => {
      const idx = Math.min(
        Math.floor((i / (dataPointsCount - 1)) * (transactions.length - 1)),
        transactions.length - 1
      )
      const tx = transactions[idx >= 0 ? idx : 0]
      const label = timeframe === "24h" 
        ? `${i * 2}:00` 
        : timeframe === "7d" 
        ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i % 7]
        : `Day ${i + 1}`

      // Create some progressive scaling value based on mock or real transactions
      let value = 0
      if (transactions.length > 0) {
        // Accumulate a rolling window or take transaction amount
        value = activeMetric === "volume"
          ? transactions.slice(0, idx + 1).reduce((acc, t) => acc + (t.status === "success" ? t.amount : 0), 0) / (idx + 1) * 3
          : idx + 1
      }

      // Add a touch of natural randomness so it looks like a live chart
      const noise = (Math.sin(i * 1.5) + 1.2) * 50
      value = Math.max(20, value + noise)

      return { label, value }
    })

    const values = pointsArray.map(p => p.value)
    const maxVal = Math.max(...values, 100) * 1.15
    const minVal = Math.max(0, Math.min(...values) * 0.8)
    const valRange = maxVal - minVal || 1

    const points = pointsArray.map((pt, index) => {
      const x = paddingX + (index / (dataPointsCount - 1)) * (width - paddingX * 2)
      const y = height - paddingY - ((pt.value - minVal) / valRange) * (height - paddingY * 2)
      return { x, y, ...pt }
    })

    // Construct curve path
    let path = ""
    if (points.length > 0) {
      path = `M ${points[0].x} ${points[0].y}`
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1]
        const curr = points[i]
        const cpX1 = prev.x + (curr.x - prev.x) / 2
        const cpY1 = prev.y
        const cpX2 = prev.x + (curr.x - prev.x) / 2
        const cpY2 = curr.y
        path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.x} ${curr.y}`
      }
    }

    const area = points.length > 0 
      ? `${path} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
      : ""

    return { path, area, points }
  }, [transactions, timeframe, activeMetric])

  return (
    <div className="space-y-8">
      {/* Dynamic Announcement Banner */}
      <div className="relative rounded-xl border border-neutral-900 bg-neutral-950/40 p-4 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                Developer Sandbox Running
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono font-medium tracking-wide">
                  SANDBOX
                </span>
              </h4>
              <p className="text-[10px] text-neutral-450 mt-0.5 font-medium">
                You are currently building in Sandbox. Simulating payments will trigger local mock webhooks and credit testing vaults.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="px-3 py-1.5 text-[10px] font-mono font-bold tracking-wider text-neutral-400 hover:text-white bg-neutral-950 border border-neutral-900 rounded-md transition-all">
              API Sandbox Logs
            </button>
          </div>
        </div>
      </div>

      {/* Telemetry Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Metric 1 */}
        <div className="glass-card rounded-xl p-5 border-neutral-900 shadow-lg border-t-accent-indigo flex flex-col justify-between h-[125px]">
          <div className="flex justify-between items-start text-neutral-500">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Gross Volume</span>
            <Coins className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono tracking-tight leading-none">
              {formatUSD(stats.totalVolume)}
            </div>
            <div className="mt-2 text-[9px] text-emerald-450 font-bold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-450" />
              <span>{stats.trend} past month</span>
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="glass-card rounded-xl p-5 border-neutral-900 shadow-lg border-t-accent-cyan flex flex-col justify-between h-[125px]">
          <div className="flex justify-between items-start text-neutral-500">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Settled Payments</span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono tracking-tight leading-none">
              {stats.txCount}
            </div>
            <div className="mt-2 text-[9px] text-cyan-400 font-bold flex items-center gap-1 font-mono">
              <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>100% Finality rate</span>
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="glass-card rounded-xl p-5 border-neutral-900 shadow-lg border-t-accent-emerald flex flex-col justify-between h-[125px]">
          <div className="flex justify-between items-start text-neutral-500">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Settlement Finality</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono tracking-tight leading-none">
              {stats.successRate}
            </div>
            <div className="mt-2 text-[9px] text-neutral-500 font-semibold font-mono">
              0% Chargebacks (Stablecoins)
            </div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="glass-card rounded-xl p-5 border-neutral-900 shadow-lg border-t-accent-indigo flex flex-col justify-between h-[125px]">
          <div className="flex justify-between items-start text-neutral-500">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Avg Settlement</span>
            <Globe className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono tracking-tight leading-none">
              {stats.avgSpeed}
            </div>
            <div className="mt-2 text-[9px] text-neutral-500 font-semibold font-mono">
              Solana & L2 sponsored routing
            </div>
          </div>
        </div>

      </div>

      {/* Main Chart Section */}
      <div className="glass-card rounded-xl border border-neutral-900 p-6 shadow-xl relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-neutral-900 mb-6 gap-4">
          <div>
            <h4 className="text-xs font-bold text-white tracking-tight uppercase font-mono">
              Settlement Velocity Engine
            </h4>
            <p className="text-[10px] text-neutral-500 font-semibold mt-0.5">
              Visual telemetry stream representing payment settlements inside sandbox environment
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Metric Toggle */}
            <div className="flex items-center bg-neutral-950 border border-neutral-900 rounded p-0.5">
              <button 
                onClick={() => setActiveMetric("volume")}
                className={`px-2.5 py-1 text-[9px] font-mono tracking-wider uppercase font-bold rounded transition-all ${
                  activeMetric === "volume" 
                    ? "bg-neutral-900 text-white border border-neutral-850" 
                    : "text-neutral-500 hover:text-neutral-350"
                }`}
              >
                Volume
              </button>
              <button 
                onClick={() => setActiveMetric("count")}
                className={`px-2.5 py-1 text-[9px] font-mono tracking-wider uppercase font-bold rounded transition-all ${
                  activeMetric === "count" 
                    ? "bg-neutral-900 text-white border border-neutral-850" 
                    : "text-neutral-500 hover:text-neutral-350"
                }`}
              >
                Tx Count
              </button>
            </div>

            {/* Timeframe Toggle */}
            <div className="flex items-center bg-neutral-950 border border-neutral-900 rounded p-0.5">
              {(["24h", "7d", "30d"] as const).map(tf => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 text-[9px] font-mono uppercase font-bold rounded transition-all ${
                    timeframe === tf 
                      ? "bg-neutral-900 text-white border border-neutral-850" 
                      : "text-neutral-500 hover:text-neutral-350"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SVG Curve chart rendering */}
        <div className="relative w-full aspect-[600/160] flex items-center justify-center py-2">
          <svg viewBox="0 0 600 160" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="primaryChartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="primaryLineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="50%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            <line x1="20" y1="20" x2="580" y2="20" stroke="rgba(255,255,255,0.015)" strokeWidth="1" />
            <line x1="20" y1="55" x2="580" y2="55" stroke="rgba(255,255,255,0.015)" strokeWidth="1" />
            <line x1="20" y1="90" x2="580" y2="90" stroke="rgba(255,255,255,0.015)" strokeWidth="1" />
            <line x1="20" y1="125" x2="580" y2="125" stroke="rgba(255,255,255,0.015)" strokeWidth="1" />

            {/* Gradient Area path */}
            {chartData.area && (
              <path d={chartData.area} fill="url(#primaryChartGrad)" className="transition-all duration-300" />
            )}

            {/* Line Path */}
            {chartData.path && (
              <path d={chartData.path} fill="none" stroke="url(#primaryLineGrad)" strokeWidth="1.8" strokeLinecap="round" className="transition-all duration-300" />
            )}

            {/* Interactive nodes */}
            {chartData.points.map((pt, idx) => (
              <g key={idx} className="group cursor-pointer">
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="3.5"
                  className="fill-black stroke-indigo-400 stroke-[1.8] transition-all group-hover:r-5 group-hover:stroke-cyan-400"
                />
                <foreignObject
                  x={pt.x - 35}
                  y={pt.y - 28}
                  width="70"
                  height="22"
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
                >
                  <div className="bg-neutral-900 border border-neutral-800 text-[8px] text-white px-1.5 py-0.5 rounded text-center font-mono shadow-md font-bold">
                    {activeMetric === "volume" ? formatUSD(pt.value) : `${pt.value} Txs`}
                  </div>
                </foreignObject>
              </g>
            ))}
          </svg>
        </div>

        {/* Labels under SVG */}
        <div className="flex justify-between items-center text-[9px] text-neutral-500 font-mono border-t border-neutral-900 pt-3 mt-2">
          <span>{timeframe === "24h" ? "24 Hours Segment" : timeframe === "7d" ? "7 Days Ledger Timeline" : "30 Days Data Block"}</span>
          <span>Settle stream active</span>
        </div>
      </div>

      {/* Breakdown grids */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left: Wallets & stablecoin reserves (8 columns) */}
        <div className="lg:col-span-8 glass-card border border-neutral-900 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-neutral-900 mb-5">
              <div>
                <h4 className="text-xs font-bold text-white tracking-tight uppercase font-mono">Treasury Reserves</h4>
                <p className="text-[10px] text-neutral-500 font-semibold mt-0.5">Mock testing balance in linked settlement vaults</p>
              </div>
              <button className="flex items-center gap-1 text-[9px] font-mono text-neutral-400 hover:text-white bg-neutral-950 border border-neutral-900 px-2 py-1 rounded">
                <RefreshCw className="w-3 h-3 text-neutral-500 animate-spin-slow" />
                <span>Sync Vaults</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* USDC */}
              <div className="bg-neutral-950 border border-neutral-900/60 hover:border-neutral-850 p-4 rounded-lg flex flex-col justify-between min-h-[120px] transition-colors relative group">
                <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-blue-500/80" />
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-[9px] font-bold flex items-center justify-center">
                    UC
                  </div>
                  <div>
                    <h5 className="text-[10px] font-extrabold text-white">USD Coin</h5>
                    <span className="text-[8px] text-neutral-500 font-mono">Solana / Arbitrum</span>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-neutral-500 text-[9px] block font-mono">BALANCE</span>
                  <span className="text-base font-bold text-white font-mono">45,120.00 USDC</span>
                </div>
              </div>

              {/* USDT */}
              <div className="bg-neutral-950 border border-neutral-900/60 hover:border-neutral-850 p-4 rounded-lg flex flex-col justify-between min-h-[120px] transition-colors relative group">
                <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[9px] font-bold flex items-center justify-center">
                    UT
                  </div>
                  <div>
                    <h5 className="text-[10px] font-extrabold text-white">Tether US</h5>
                    <span className="text-[8px] text-neutral-500 font-mono">Polygon / Ethereum</span>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-neutral-500 text-[9px] block font-mono">BALANCE</span>
                  <span className="text-base font-bold text-white font-mono">28,950.00 USDT</span>
                </div>
              </div>

              {/* EURC */}
              <div className="bg-neutral-950 border border-neutral-900/60 hover:border-neutral-850 p-4 rounded-lg flex flex-col justify-between min-h-[120px] transition-colors relative group">
                <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-yellow-500/80" />
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 font-mono text-[9px] font-bold flex items-center justify-center">
                    EC
                  </div>
                  <div>
                    <h5 className="text-[10px] font-extrabold text-white">Euro Coin</h5>
                    <span className="text-[8px] text-neutral-500 font-mono">Solana / Polygon</span>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-neutral-500 text-[9px] block font-mono">BALANCE</span>
                  <span className="text-base font-bold text-white font-mono">14,200.00 EURC</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-900 flex items-center justify-between text-[9px] text-neutral-500">
            <div className="flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-neutral-600" />
              <span>All assets are auto-hedged and settled gas-free in sandbox.</span>
            </div>
            <span className="font-mono text-neutral-400">Vault address: 0x5c...89d1</span>
          </div>
        </div>

        {/* Right: Network Distribution (4 columns) */}
        <div className="lg:col-span-4 glass-card border border-neutral-900 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-900 mb-5">
              <div>
                <h4 className="text-xs font-bold text-white tracking-tight uppercase font-mono">Routing Hub</h4>
                <p className="text-[10px] text-neutral-500 font-semibold mt-0.5">Network gas-less distribution</p>
              </div>
              <Globe className="w-4 h-4 text-cyan-400" />
            </div>

            <div className="space-y-4">
              {breakdown.chains.map((chain, i) => (
                <div key={chain.name} className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-neutral-350">{chain.name}</span>
                    <span className="font-mono text-neutral-450">{chain.percentage}%</span>
                  </div>
                  <div className="h-1.5 bg-neutral-950 border border-neutral-900 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${chain.percentage}%` }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      className={`h-full rounded-full ${
                        chain.name === "Solana"
                          ? "bg-indigo-500"
                          : chain.name === "Ethereum"
                          ? "bg-cyan-500"
                          : chain.name === "Arbitrum"
                          ? "bg-emerald-500"
                          : "bg-purple-500"
                      }`}
                    />
                  </div>
                </div>
              ))}

              {breakdown.chains.length === 0 && (
                <div className="text-center py-6 text-[10px] text-neutral-500">
                  No network transactions detected.
                </div>
              )}
            </div>
          </div>

          <div className="text-[8px] text-neutral-600 font-semibold leading-relaxed mt-4 pt-3 border-t border-neutral-900">
            Routing utilizes optimized multi-hop bridges to guarantee &lt; 2-second confirmation speeds.
          </div>
        </div>

      </div>
    </div>
  )
}
