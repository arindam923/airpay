"use client"

import React, { useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  TrendingUp, Activity, ShieldCheck, Zap,
  Coins, Wallet2, CheckCircle2 
} from "lucide-react"

interface Transaction {
  id: string
  amount: number
  currency: string
  network: string
  timestamp: Date
  status: "pending" | "success" | "failed"
}

interface DashboardWidgetProps {
  transactions: Transaction[]
}

export default function DashboardWidget({ transactions }: DashboardWidgetProps) {
  // Compute Stats
  const totalVolume = useMemo(() => {
    const sum = transactions.reduce((acc, t) => acc + t.amount, 0)
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(sum)
  }, [transactions])

  const successRate = "99.98%"

  const avgSpeed = useMemo(() => {
    const solanaCount = transactions.filter(t => t.network === "Solana").length
    const ethCount = transactions.filter(t => t.network === "Ethereum").length
    const others = transactions.length - solanaCount - ethCount
    
    const totalTime = (solanaCount * 0.8) + (ethCount * 4.2) + (others * 1.5)
    const avg = transactions.length > 0 ? (totalTime / transactions.length).toFixed(1) : "1.8"
    return `${avg}s`
  }, [transactions])

  // Custom SVG Chart Coordinates calculations
  const chartData = useMemo(() => {
    if (transactions.length === 0) return { path: "", area: "", points: [] }

    const width = 600
    const height = 180
    const paddingX = 30
    const paddingY = 20

    const amounts = transactions.map(t => t.amount)
    const maxVal = Math.max(...amounts, 100) * 1.12 // headroom
    const minVal = Math.max(0, Math.min(...amounts) * 0.8) // floor
    const valRange = maxVal - minVal || 1

    const points = transactions.map((t, index) => {
      const x = paddingX + (index / (transactions.length - 1)) * (width - paddingX * 2)
      const y = height - paddingY - ((t.amount - minVal) / valRange) * (height - paddingY * 2)
      return { x, y, ...t }
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
  }, [transactions])

  return (
    <section id="dashboard" className="py-24 relative overflow-hidden bg-black border-t border-neutral-900">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4">
          <div className="max-w-xl">
            <span className="text-xs font-mono font-bold tracking-widest text-neutral-500 uppercase">
              Operational Metrics
            </span>
            <h2 className="text-3xl font-extrabold text-white tracking-tight mt-3">
              Real-time Analytics
            </h2>
            <p className="mt-4 text-neutral-400 text-sm leading-relaxed font-medium">
              Monitor settlement velocity, gross payments volume, routing finality and transaction records updated live in sandbox.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-neutral-950 border border-neutral-900 text-[10px] text-neutral-400 font-mono">
            <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>Feed Enabled</span>
          </div>
        </div>

        {/* Core Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* LEFT: Stats Cards and Graph (8 Columns) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Stat Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              
              <div className="glass-card rounded-xl p-5 border-neutral-900 shadow-lg border-t-accent-indigo">
                <div className="flex justify-between items-start text-neutral-500 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Gross Volume</span>
                  <Coins className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-bold text-white font-mono tracking-tight">
                  {totalVolume}
                </div>
                <div className="mt-2 text-[9px] text-emerald-450 font-semibold flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-450" />
                  <span>Sandbox mock accumulation</span>
                </div>
              </div>

              <div className="glass-card rounded-xl p-5 border-neutral-900 shadow-lg border-t-accent-cyan">
                <div className="flex justify-between items-start text-neutral-500 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Success Rate</span>
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-2xl font-bold text-white font-mono tracking-tight">
                  {successRate}
                </div>
                <div className="mt-2 text-[9px] text-neutral-500 font-semibold">
                  Zero failed contract instances
                </div>
              </div>

              <div className="glass-card rounded-xl p-5 border-neutral-900 shadow-lg border-t-accent-emerald">
                <div className="flex justify-between items-start text-neutral-500 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Avg Settlement</span>
                  <Zap className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-white font-mono tracking-tight">
                  {avgSpeed}
                </div>
                <div className="mt-2 text-[9px] text-neutral-500 font-semibold">
                  Solana finality speeds
                </div>
              </div>

            </div>

            {/* SVG Interactive Chart Panel */}
            <div className="glass-card rounded-2xl p-6 border-neutral-900 shadow-2xl flex-1 flex flex-col justify-between min-h-[300px]">
              
              <div className="flex items-center justify-between pb-4 border-b border-neutral-900 mb-6">
                <div>
                  <h4 className="text-xs font-bold text-white">Settlement Velocity (USD equivalent)</h4>
                  <p className="text-[9px] text-neutral-500 font-medium">Visual graph representation of payment amounts</p>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] font-mono text-neutral-450">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  <span>Gross Value</span>
                </div>
              </div>

              {/* Chart SVG wrapper */}
              <div className="flex-1 w-full flex items-center justify-center py-4 relative">
                <div className="w-full aspect-[600/180]">
                  <svg 
                    viewBox="0 0 600 180" 
                    className="w-full h-full overflow-visible"
                  >
                    {/* Gradients definitions */}
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.12" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                      </linearGradient>
                      
                      <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="50%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#06b6d4" />
                      </linearGradient>
                    </defs>

                    {/* Chart Grid Lines */}
                    <line x1="30" y1="20" x2="570" y2="20" stroke="rgba(255,255,255,0.015)" strokeWidth="1" />
                    <line x1="30" y1="60" x2="570" y2="60" stroke="rgba(255,255,255,0.015)" strokeWidth="1" />
                    <line x1="30" y1="100" x2="570" y2="100" stroke="rgba(255,255,255,0.015)" strokeWidth="1" />
                    <line x1="30" y1="140" x2="570" y2="140" stroke="rgba(255,255,255,0.015)" strokeWidth="1" />

                    {/* Gradient Area path */}
                    <AnimatePresence>
                      {chartData.area && (
                        <path 
                          d={chartData.area} 
                          fill="url(#chartGradient)" 
                          className="transition-all duration-500 ease-out"
                        />
                      )}
                    </AnimatePresence>

                    {/* Core Line path */}
                    <AnimatePresence>
                      {chartData.path && (
                        <motion.path 
                          d={chartData.path} 
                          fill="none" 
                          stroke="url(#lineGrad)" 
                          strokeWidth="2" 
                          strokeLinecap="round"
                          className="transition-all duration-500 ease-out"
                        />
                      )}
                    </AnimatePresence>
                    
                    {/* Interactive nodes / points */}
                    {chartData.points.map((pt, i) => (
                      <g key={pt.id || i} className="group cursor-pointer">
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="3.5"
                          className="fill-black stroke-indigo-400 stroke-[1.8] transition-all duration-150 group-hover:r-5 group-hover:stroke-cyan-400 glow-indigo"
                        />
                        <foreignObject 
                          x={pt.x - 30} 
                          y={pt.y - 25} 
                          width="60" 
                          height="20" 
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
                        >
                          <div className="bg-neutral-900 border border-neutral-800 text-[8px] text-white px-1 py-0.5 rounded text-center font-mono shadow-md font-bold">
                            ${pt.amount}
                          </div>
                        </foreignObject>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>

              <div className="flex justify-between items-center text-[9px] text-neutral-500 font-mono pt-4 border-t border-neutral-900 mt-4">
                <span>Timeline sequence logs</span>
                <span>Values represented in USD equivalent</span>
              </div>

            </div>

          </div>

          {/* RIGHT: Live Ledger Feed (4 Columns) */}
          <div className="lg:col-span-4 flex flex-col">
            <div className="w-full flex-1 flex flex-col glass-card border-neutral-900 rounded-2xl p-5 shadow-2xl min-h-[420px]">
              
              <div className="flex items-center justify-between pb-3 border-b border-neutral-900 mb-5">
                <div>
                  <h4 className="text-xs font-bold text-white">Live Ledger Feed</h4>
                  <p className="text-[9px] text-neutral-500 font-medium">Real-time payment finality</p>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse glow-emerald" />
              </div>

              {/* Ledger Items Container */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[360px]">
                <AnimatePresence initial={false}>
                  {transactions.slice().reverse().map((tx) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, y: -10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ type: "spring" as const, stiffness: 350, damping: 25 }}
                      className="bg-neutral-950 border border-neutral-900 rounded-lg p-3.5 flex items-center justify-between hover:border-neutral-850 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {/* Custom Color badges per coin */}
                        <div className={`w-7 h-7 rounded flex items-center justify-center font-mono text-[10px] shrink-0 border ${
                          tx.currency === "USDC" 
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20" 
                            : tx.currency === "USDT"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                        }`}>
                          {tx.currency.substring(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white">${tx.amount}</span>
                            <span className="text-[9px] text-neutral-555 text-neutral-400 font-mono">{tx.currency}</span>
                          </div>
                          <span className="text-[9px] text-neutral-500 font-mono block mt-0.5">
                            {tx.network} network
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[9px] font-mono text-neutral-600 block">
                          {tx.id}
                        </span>
                        <div className="flex items-center gap-1 justify-end mt-1 text-[8px] text-emerald-400 font-bold uppercase tracking-wider">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                          <span>Settled</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Wallet Info Display */}
              <div className="mt-4 pt-4 border-t border-neutral-900 flex items-center justify-between text-[9px] text-neutral-500">
                <div className="flex items-center gap-1.5">
                  <Wallet2 className="w-3.5 h-3.5 text-neutral-650" />
                  <span>Settlement Treasury Vault</span>
                </div>
                <span className="font-mono text-neutral-400">0x5c...89d1</span>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
