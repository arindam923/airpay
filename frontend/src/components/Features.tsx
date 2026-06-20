"use client"

import React from "react"
import { motion } from "framer-motion"
import { 
  Zap, ShieldAlert, Shuffle, Code2, Coins, Lock, 
  ChevronRight, ArrowRight 
} from "lucide-react"

export default function Features() {
  const features = [
    {
      icon: Zap,
      title: "Sub-Second Settlements",
      description: "Direct-to-vault payouts. Bypass traditional clearing delays to achieve instant liquidity finality.",
      badge: "Fastest",
      iconColor: "text-amber-400",
      borderColor: "group-hover:border-amber-500/30"
    },
    {
      icon: ShieldAlert,
      title: "Zero Chargeback Risk",
      description: "Cryptographic consensus guarantees payment intents. Protect your business from fraudulent chargebacks.",
      badge: "Irreversible",
      iconColor: "text-rose-400",
      borderColor: "group-hover:border-rose-500/30"
    },
    {
      icon: Coins,
      title: "Sponsored Gas Relay",
      description: "AirPay gas sponsoring sponsors layer-2 and Solana network fees out-of-the-box for friction-free checkouts.",
      badge: "Exclusive",
      iconColor: "text-emerald-450 text-emerald-400",
      borderColor: "group-hover:border-emerald-500/30"
    },
    {
      icon: Shuffle,
      title: "Smart Chain Routing",
      description: "Multi-path execution contracts dynamically navigate Polygon, Arbitrum, Solana, and Ethereum.",
      iconColor: "text-blue-400",
      borderColor: "group-hover:border-blue-500/30"
    },
    {
      icon: Code2,
      title: "Developer First SDK",
      description: "Type-safe libraries across JavaScript, Go, Python, and Rust. Robust logs, CLI toolkits, and mock sandboxes.",
      iconColor: "text-indigo-450 text-indigo-400",
      borderColor: "group-hover:border-indigo-500/30"
    },
    {
      icon: Lock,
      title: "Non-Custodial Vaults",
      description: "P2P rails settle directly to your corporate vaults. AirPay never holds your assets, eliminating custodian risk.",
      iconColor: "text-cyan-400",
      borderColor: "group-hover:border-cyan-500/30"
    }
  ]

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.08
      }
    }
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 80,
        damping: 15
      }
    }
  }

  return (
    <section id="features" className="py-24 relative overflow-hidden bg-black border-t border-neutral-900">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Section Header */}
        <div className="max-w-2xl mb-20">
          <span className="text-xs font-mono font-bold tracking-widest text-neutral-500 uppercase">
            Product Infrastructure
          </span>
          <h2 className="text-3xl font-extrabold text-white tracking-tight mt-3">
            Built for Enterprise Scale
          </h2>
          <p className="mt-4 text-neutral-400 text-sm leading-relaxed font-medium">
            Accepting digital payments should not require holding volatile gas tokens. AirPay abstracts blockchain ledger rails into a single type-safe API checkout session.
          </p>
        </div>

        {/* Asymmetric Cards Grid */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {features.map((feat, index) => {
            const IconComponent = feat.icon
            return (
              <motion.div
                key={index}
                variants={cardVariants}
                className="group relative rounded-2xl p-6 glass-card glass-card-hover flex flex-col justify-between aspect-[4/3] overflow-hidden"
              >
                <div className="relative z-10">
                  {/* Badge */}
                  {feat.badge && (
                    <span className="absolute right-0 top-0 text-[8px] font-mono font-bold px-2 py-0.5 rounded border border-neutral-800 bg-neutral-950 text-neutral-500">
                      {feat.badge}
                    </span>
                  )}

                  {/* Icon Box */}
                  <div className={`w-10 h-10 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center transition-all duration-200 ${feat.borderColor}`}>
                    <IconComponent className={`w-4 h-4 ${feat.iconColor}`} />
                  </div>

                  {/* Text */}
                  <h3 className="text-sm font-bold text-white mt-6 group-hover:text-white transition-colors">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-neutral-400 mt-2 leading-relaxed font-medium">
                    {feat.description}
                  </p>
                </div>

                {/* Explore link */}
                <div className="relative z-10 flex items-center gap-1 mt-6 text-[9px] font-mono text-neutral-500 group-hover:text-white transition-colors duration-150 cursor-pointer">
                  <span>Explore documentation</span>
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Call to Action bar */}
        <div className="mt-16 bg-neutral-955 border border-neutral-900 rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg bg-neutral-950">
          <div className="max-w-md">
            <h4 className="text-sm font-bold text-white">Scale your billing infrastructure</h4>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed font-medium">
              Create an developer credentials keys, read step-by-step guides, or launch custom checkout sessions in sandbox.
            </p>
          </div>
          <a 
            href="#playground"
            className="flex items-center gap-2 px-4.5 py-3 bg-white text-black hover:bg-neutral-200 font-bold rounded-lg text-xs transition-colors shrink-0"
          >
            <span>Get Api Credentials</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

      </div>
    </section>
  )
}
