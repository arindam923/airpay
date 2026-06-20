"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bell, CheckCircle2, X } from "lucide-react"

// Components imports
import Navbar from "@/components/Navbar"
import Hero from "@/components/Hero"
import InteractivePlayground from "@/components/InteractivePlayground"
import DashboardWidget from "@/components/DashboardWidget"
import Features from "@/components/Features"
import Footer from "@/components/Footer"

interface Transaction {
  id: string
  amount: number
  currency: string
  network: string
  timestamp: Date
  status: "pending" | "success" | "failed"
}

interface WebhookEvent {
  id: string
  event: string
  timestamp: Date
  payload: any
}

interface ToastNotification {
  id: string
  message: string
  type: string
}

export default function Home() {
  // Initial Mock Transactions
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: "tx_901", amount: 450, currency: "USDC", network: "Solana", timestamp: new Date(Date.now() - 600000), status: "success" },
    { id: "tx_902", amount: 125, currency: "USDT", network: "Arbitrum", timestamp: new Date(Date.now() - 480000), status: "success" },
    { id: "tx_903", amount: 80, currency: "EURC", network: "Polygon", timestamp: new Date(Date.now() - 360000), status: "success" },
    { id: "tx_904", amount: 1200, currency: "USDC", network: "Ethereum", timestamp: new Date(Date.now() - 240000), status: "success" },
    { id: "tx_905", amount: 250, currency: "USDC", network: "Solana", timestamp: new Date(Date.now() - 120000), status: "success" },
  ])

  // Initial Webhook Event
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([
    {
      id: "wh_01",
      event: "payment.succeeded",
      timestamp: new Date(Date.now() - 120000),
      payload: {
        id: "pay_905",
        object: "payment_intent",
        amount: 25000,
        currency: "usdc",
        status: "succeeded",
        network: "solana",
        transaction_hash: "3kF92JkKsa81HskWpP8J2K3S..."
      }
    }
  ])

  // Real-time Toast notifications
  const [toasts, setToasts] = useState<ToastNotification[]>([])

  const addToast = (message: string, type = "success") => {
    const id = "toast_" + Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      removeToast(id)
    }, 4500)
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  // Handle Payment success callback from hosted payment phone simulator
  const handlePaymentSuccess = (amount: number, currency: string, network: string) => {
    const newTxId = "tx_" + Math.random().toString(36).substring(2, 8)
    
    // 1. Add to active transactions log (which updates gross statistics and plots on SVG curve chart)
    const newTx: Transaction = {
      id: newTxId,
      amount,
      currency,
      network,
      timestamp: new Date(),
      status: "success"
    }

    setTransactions((prev) => [...prev, newTx])

    // 2. Trigger rich client-side toast notifier
    addToast(`Payment Succeeded: $${amount.toFixed(2)} ${currency} received on ${network}!`)
  }

  const addWebhookEvent = (event: WebhookEvent) => {
    setWebhookEvents((prev) => [...prev, event])
  }

  return (
    <main className="relative min-h-screen bg-black overflow-x-hidden">
      {/* Global Navbar */}
      <Navbar />

      {/* Hero Section */}
      <Hero />

      {/* Interactive Playground (Simulator + SDK integration + Webhook logs) */}
      <InteractivePlayground 
        onPaymentSuccess={handlePaymentSuccess}
        webhookEvents={webhookEvents}
        addWebhookEvent={addWebhookEvent}
      />

      {/* Analytics Dashboard Widget */}
      <DashboardWidget transactions={transactions} />

      {/* Marketing / Value Props Grid */}
      <Features />

      {/* Global Footer */}
      <Footer />

      {/* Interactive Toast Notifier Floating Portal */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
              className="pointer-events-auto bg-neutral-950 border border-neutral-900 rounded-lg p-4 shadow-xl flex items-start justify-between gap-3"
            >
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">Ledger Event</span>
                  </div>
                  <p className="text-[10px] text-neutral-450 mt-1 leading-relaxed font-semibold">
                    {toast.message}
                  </p>
                </div>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 text-slate-500 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </main>
  )
}
