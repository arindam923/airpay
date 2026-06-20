"use client"

import React from "react"
import { motion } from "framer-motion"
import { ArrowRight, ChevronRight, Play, Wallet, Shield, Zap } from "lucide-react"

export default function Hero() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.05,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 15,
      },
    },
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-32 pb-20 md:pt-44 md:pb-32 overflow-hidden grid-bg bg-black">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 radial-glow pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none animate-pulse-slow" />
      <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-cyan-500/4 rounded-full blur-3xl pointer-events-none animate-pulse-slow" style={{ animationDelay: "2s" }} />

      <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 items-center">
          
          {/* Text Content */}
          <motion.div
            className="lg:col-span-7 text-left"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Version Badge */}
            <motion.div variants={itemVariants} className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-neutral-950 border border-neutral-900 text-[10px] font-mono font-medium text-neutral-450 mb-10">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span>Multi-Chain SDK v2.4 Now Available</span>
              <ChevronRight className="w-3 h-3 text-neutral-600" />
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.08]"
            >
              The Stablecoin <br />
              <span className="text-gradient-primary">Payment Engine</span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mt-8 text-sm sm:text-base text-neutral-400 max-w-xl leading-relaxed font-medium"
            >
              Stripe-grade developer experience for stablecoin payments. Accept USDC, USDT, and EURC instantly on Solana, Arbitrum, Polygon, and Ethereum. Settle directly into your vaults in 2 seconds.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={itemVariants} className="mt-14 flex flex-wrap gap-4 items-center">
              <a
                href="#playground"
                className="flex items-center gap-2 px-5 py-3 bg-white hover:bg-neutral-200 text-black rounded-lg text-xs font-semibold shadow-sm transition-colors duration-150"
              >
                <span>Launch Interactive Demo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
              <a
                href="/docs"
                className="flex items-center gap-2 px-5 py-3 bg-neutral-950 hover:bg-neutral-900 border border-neutral-900 hover:border-neutral-800 text-neutral-350 rounded-lg text-xs font-semibold transition-colors duration-150"
              >
                <Play className="w-3 h-3 text-neutral-400 fill-neutral-400" />
                <span>Read API Reference</span>
              </a>
            </motion.div>

            {/* Stats row */}
            <motion.div
              variants={itemVariants}
              className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-6 pt-12 border-t border-neutral-900"
            >
              <div>
                <p className="text-2xl font-bold text-white font-mono tracking-tight">$4.2B+</p>
                <p className="text-[10px] text-neutral-500 mt-1 font-bold uppercase tracking-wider">Volume Settled</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-cyan-400 font-mono tracking-tight">&lt; 2.1s</p>
                <p className="text-[10px] text-neutral-500 mt-1 font-bold uppercase tracking-wider">Settlement Speed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white font-mono tracking-tight">99.99%</p>
                <p className="text-[10px] text-neutral-500 mt-1 font-bold uppercase tracking-wider">SDK Uptime</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-indigo-400 font-mono tracking-tight">0%</p>
                <p className="text-[10px] text-neutral-500 mt-1 font-bold uppercase tracking-wider">Chargebacks</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Visual Floating Cards Graphic */}
          <motion.div
            className="lg:col-span-5 relative flex justify-center items-center"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="w-full max-w-[440px] h-[500px] relative flex items-center justify-center">
              
              {/* Card 1: Live Settlement Block */}
              <motion.div
                className="absolute top-4 left-0 right-0 glass-card rounded-xl p-5 w-[85%] mx-auto z-20 shadow-xl border-t-accent-indigo"
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
              >
                <div className="flex items-center justify-between pb-3 border-b border-neutral-900 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                      <Zap className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Instant Settlement</h4>
                      <p className="text-[9px] text-neutral-500 font-medium">Transaction complete</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-semibold border border-emerald-500/20">
                    Success
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-400 font-medium">Gross Settlement:</span>
                    <span className="font-mono text-white font-semibold">$1,450.00 USDC</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-400 font-medium">Network Fee:</span>
                    <span className="font-mono text-cyan-400 font-semibold">$0.00 (Sponsored)</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-400 font-medium">Settled On:</span>
                    <span className="font-mono text-indigo-400 font-semibold">Solana Blockchain</span>
                  </div>
                </div>
              </motion.div>

              {/* Card 2: Gas Sponsor Badge */}
              <motion.div
                className="absolute bottom-2 left-2 md:-left-12 md:bottom-10 glass-card rounded-xl p-4 w-[200px] sm:w-[220px] z-30 shadow-lg border-t-accent-cyan"
                animate={{ y: [0, 6, 0] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0">
                    <Shield className="w-4.5 h-4.5 text-cyan-400" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">Gas-less Routing</h5>
                    <p className="text-[9px] text-neutral-400 font-medium mt-0.5">Fees auto-sponsored</p>
                  </div>
                </div>
              </motion.div>

              {/* Card 3: Wallet Connector Panel */}
              <motion.div
                className="absolute bottom-16 right-2 md:-right-12 md:bottom-20 glass-card rounded-xl p-4 w-[190px] sm:w-[210px] z-10 opacity-90 shadow-md animate-float border-t-accent-indigo"
                style={{ animationDelay: "2s" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[9px] font-mono text-neutral-500 font-bold">CONNECTED WALLET</span>
                  <Wallet className="w-3 h-3 text-indigo-400" />
                </div>
                <div className="font-mono text-[10px] text-white font-semibold mb-1.5">
                  sol...9aZ3xW
                </div>
                <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full w-[70%]" />
                </div>
              </motion.div>

              {/* Decorative Wireframe Ring */}
              <div className="absolute inset-0 border border-neutral-900 rounded-full pointer-events-none scale-105" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
