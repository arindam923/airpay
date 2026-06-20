"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Cpu, LayoutDashboard, Coins, Key, Link2, 
  Wallet2, LogOut, ShieldAlert, CpuIcon, CheckCircle2,
  Menu, X, Sparkles, Activity, Bell, ShieldCheck
} from "lucide-react"

// Components imports
import { useAuth } from "@/components/AuthProvider"
import { authClient } from "@/lib/auth-client"
import OverviewTab from "@/components/console/OverviewTab"
import PaymentsTab from "@/components/console/PaymentsTab"
import ApiKeysTab from "@/components/console/ApiKeysTab"
import CheckoutTab from "@/components/console/CheckoutTab"
import SettlementsTab from "@/components/console/SettlementsTab"

interface Transaction {
  id: string
  amount: number
  currency: string
  network: string
  timestamp: Date | string
  status: "pending" | "success" | "failed"
  customerEmail?: string
  txHash?: string
  senderAddress?: string
}

type TabType = "overview" | "payments" | "keys" | "checkout" | "settlements"

export default function ConsolePage() {
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>("overview")
  const [isLiveMode, setIsLiveMode] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [sandboxBypass, setSandboxBypass] = useState(false)

  // Local storage synced mock transaction state
  const [transactions, setTransactions] = useState<Transaction[]>([])
  
  // Custom Toast notifications
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: string }>>([])

  // Load transactions from localStorage or initialize with mock data
  useEffect(() => {
    const saved = localStorage.getItem("airpay_console_transactions")
    if (saved) {
      try {
        setTransactions(JSON.parse(saved))
      } catch (e) {
        initMockData()
      }
    } else {
      initMockData()
    }
  }, [])

  const initMockData = () => {
    const defaultTxs: Transaction[] = [
      { id: "tx_901", amount: 450, currency: "USDC", network: "Solana", timestamp: new Date(Date.now() - 3600000 * 2), status: "success", customerEmail: "alicia@phantom.me", txHash: "4kF92JkKsa81HskWpP8J2K3S9aHskq12", senderAddress: "8x4KjJda923HskKsJ28skaKsaP2J83skKlsHskW1" },
      { id: "tx_902", amount: 125, currency: "USDT", network: "Arbitrum", timestamp: new Date(Date.now() - 3600000 * 1.5), status: "success", customerEmail: "bob@metamask.io", txHash: "0x8fa9238bcde2e93b118bfa92381eefc23", senderAddress: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F" },
      { id: "tx_903", amount: 80, currency: "EURC", network: "Polygon", timestamp: new Date(Date.now() - 3600000 * 0.8), status: "success", customerEmail: "charlie@ledger.xyz", txHash: "0xb7d3a2e92c8d5j3s1m5d6f8g9h2jk1s9a2k8d5j", senderAddress: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F" },
      { id: "tx_904", amount: 1200, currency: "USDC", network: "Ethereum", timestamp: new Date(Date.now() - 3600000 * 0.4), status: "success", customerEmail: "daisy@coinbase.com", txHash: "0x9ef23c8dfa891e4a3b8d91c28b7e4f2a3cde5f6a", senderAddress: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F" },
      { id: "tx_905", amount: 250, currency: "USDC", network: "Solana", timestamp: new Date(Date.now() - 3600000 * 0.1), status: "success", customerEmail: "ethan@solflare.org", txHash: "5jK3hSkW2kF92JkKsa81HskWpP8J2K3S9aHskq12", senderAddress: "8x4KjJda923HskKsJ28skaKsaP2J83skKlsHskW1" }
    ]
    setTransactions(defaultTxs)
    localStorage.setItem("airpay_console_transactions", JSON.stringify(defaultTxs))
  }

  // Toast Helpers
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

  // Simulate payment callback handler
  const handleSimulatePayment = (
    amount: number, 
    currency: string, 
    network: string, 
    status: "success" | "failed", 
    email: string
  ) => {
    const randomHex = Math.random().toString(16).substring(2, 14)
    const randomTxHash = network === "Solana" 
      ? `5jK${randomHex}WpP8J2K3S` 
      : `0x${randomHex}eefc23b8fa923`

    const newTx: Transaction = {
      id: "tx_" + Math.random().toString(36).substring(2, 7),
      amount,
      currency,
      network,
      timestamp: new Date(),
      status,
      customerEmail: email,
      txHash: randomTxHash,
      senderAddress: network === "Solana" ? "sol...8x9d2s" : "0x71...8976F"
    }

    const updated = [...transactions, newTx]
    setTransactions(updated)
    localStorage.setItem("airpay_console_transactions", JSON.stringify(updated))

    if (status === "success") {
      addToast(`Simulated Payment Succeeded: $${amount.toFixed(2)} ${currency} received on ${network}!`)
    } else {
      addToast(`Simulated Payment Rejected: $${amount.toFixed(2)} ${currency} failed on ${network}.`, "error")
    }
  }

  // Session verification block
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center space-y-4">
        <div className="relative flex items-center justify-center">
          <Cpu className="w-8 h-8 text-indigo-500 animate-pulse" />
          <div className="w-12 h-12 border border-dashed border-indigo-500/35 rounded-full absolute animate-spin-slow" />
        </div>
        <span className="text-[10px] font-mono text-neutral-450 uppercase tracking-widest">
          Loading console vaults...
        </span>
      </div>
    )
  }

  // If user is not authenticated and they haven't chosen to bypass using sandbox mode
  if (!user && !sandboxBypass) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 radial-glow pointer-events-none" />
        <div className="w-full max-w-md bg-neutral-950 border border-neutral-900 rounded-xl p-6 shadow-2xl space-y-6 relative z-10 text-center">
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-indigo-400" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-extrabold text-white uppercase tracking-wider font-mono">
              Protected Workspace
            </h2>
            <p className="text-[11px] text-neutral-450 leading-relaxed font-semibold">
              The AirPay Developer Console requires a validated session. Accessing live payments, secret keys, and webhook relay feeds is encrypted.
            </p>
          </div>

          <div className="space-y-3 pt-4 border-t border-neutral-900">
            <a
              href="/sign-in"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded transition-colors shadow-md flex items-center justify-center"
            >
              Sign In to Your Account
            </a>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-900" />
              </div>
              <div className="relative flex justify-center text-[9px] font-mono uppercase">
                <span className="bg-neutral-950 px-2.5 text-neutral-500">or explore sandbox</span>
              </div>
            </div>

            <button
              onClick={() => setSandboxBypass(true)}
              className="w-full py-2.5 bg-neutral-950 hover:bg-neutral-900 border border-neutral-900 hover:border-neutral-800 text-neutral-350 text-xs font-bold rounded transition-colors"
            >
              Enter Sandbox Mode (Bypass Auth)
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Active user representation (real or mock fallback)
  const activeUser = user || {
    email: "sandbox-developer@airpay.io",
    name: "Sandbox Developer"
  }

  // Sidebar menus
  const sidebarItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "payments", label: "Payments Ledger", icon: Coins },
    { id: "keys", label: "API Credentials", icon: Key },
    { id: "checkout", label: "Checkout Links", icon: Link2 },
    { id: "settlements", label: "Settlement Vaults", icon: Wallet2 }
  ] as const

  return (
    <div className={`min-h-screen bg-black text-slate-100 flex flex-col md:flex-row font-sans selection:bg-indigo-500/30 selection:text-indigo-200 ${
      isLiveMode ? "theme-live" : "theme-sandbox"
    }`}>
      {/* Global Toast Floating Portal */}
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
                <div className="w-7 h-7 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0 mt-0.5">
                  {toast.type === "success" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-450" />
                  ) : (
                    <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-white uppercase font-mono">Ledger Event</span>
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

      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-neutral-900 bg-neutral-950/20 shrink-0 flex flex-col justify-between p-5 md:h-screen md:sticky md:top-0 z-40">
        
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center justify-between">
            <a href="/" className="flex items-center gap-2.5 group">
              <div className="flex items-center justify-center w-8 h-8 rounded bg-neutral-950 border border-neutral-850">
                <Cpu className="w-4 h-4 text-neutral-350" />
              </div>
              <span className="font-extrabold text-sm tracking-tight text-white font-mono">
                Air<span className="text-indigo-400 font-medium">Pay</span>
              </span>
            </a>
            
            {/* Mobile menu toggle */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-1.5 text-neutral-450 hover:text-white transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Sandbox vs Live mode switch toggle */}
          <div className="p-3 bg-neutral-950 border border-neutral-900 rounded-lg space-y-2.5">
            <div className="flex justify-between items-center text-[9px] font-mono font-bold text-neutral-500">
              <span>ENVIRONMENT STATE</span>
              <span className={isLiveMode ? "text-emerald-400" : "text-indigo-400"}>
                {isLiveMode ? "PRODUCTION" : "SANDBOX"}
              </span>
            </div>
            
            {/* Slider Switch */}
            <div className="flex bg-black border border-neutral-900 rounded p-0.5 relative">
              <button 
                onClick={() => {
                  setIsLiveMode(false)
                  addToast("Switched to Sandbox developer testing environment.")
                }}
                className={`flex-1 py-1 text-[8px] font-mono uppercase tracking-wider font-bold rounded z-10 transition-colors ${
                  !isLiveMode ? "text-white" : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                Sandbox
              </button>
              <button 
                onClick={() => {
                  setIsLiveMode(true)
                  addToast("Switched to Production environment. Live credentials loaded.", "success")
                }}
                className={`flex-1 py-1 text-[8px] font-mono uppercase tracking-wider font-bold rounded z-10 transition-colors ${
                  isLiveMode ? "text-white" : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                Production
              </button>
              
              {/* Highlight background slider */}
              <motion.div 
                className={`absolute top-0.5 bottom-0.5 rounded ${
                  isLiveMode ? "bg-emerald-600/20 border border-emerald-500/30" : "bg-indigo-600/20 border border-indigo-500/30"
                }`}
                style={{ width: "calc(50% - 3px)" }}
                animate={{ x: isLiveMode ? "100%" : "0%" }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
              />
            </div>
          </div>

          {/* Navigation Links */}
          <nav className={`md:flex flex-col gap-1.5 ${isMobileMenuOpen ? "flex" : "hidden md:flex"}`}>
            {sidebarItems.map(item => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id)
                    setIsMobileMenuOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded text-[10px] uppercase font-mono tracking-wider font-bold transition-all border ${
                    isActive 
                      ? isLiveMode 
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20 glow-emerald" 
                        : "bg-indigo-500/10 text-indigo-300 border-indigo-500/20 glow-indigo"
                      : "bg-transparent text-neutral-450 hover:text-white border-transparent hover:bg-neutral-950/60"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${
                    isActive 
                      ? isLiveMode ? "text-emerald-400" : "text-indigo-400" 
                      : "text-neutral-550 text-neutral-500"
                  }`} />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Footer info (User card) */}
        <div className={`pt-4 border-t border-neutral-900 mt-6 md:flex flex-col gap-3 ${isMobileMenuOpen ? "flex" : "hidden md:flex"}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-850 flex items-center justify-center text-[10px] text-indigo-400 font-mono font-bold">
              {activeUser.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <h5 className="text-[10px] font-bold text-white leading-none truncate">{activeUser.name}</h5>
              <span className="text-[8px] font-mono text-neutral-500 truncate block mt-1">{activeUser.email}</span>
            </div>
          </div>

          <button
            onClick={() => {
              if (user) {
                authClient.signOut()
              } else {
                setSandboxBypass(false)
              }
            }}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-neutral-950 hover:bg-neutral-900 border border-neutral-900 hover:border-neutral-800 text-neutral-400 hover:text-white rounded text-[9px] font-mono font-bold transition-colors"
          >
            <LogOut className="w-3 h-3 text-neutral-550" />
            <span>Sign Out Workspace</span>
          </button>
        </div>

      </aside>

      {/* Main Panel Content Stage */}
      <main className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto max-h-screen">
        
        {/* Dynamic Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-neutral-900 gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight uppercase font-mono">
              {activeTab === "overview" && "Console Overview"}
              {activeTab === "payments" && "Payments Ledger"}
              {activeTab === "keys" && "API Credentials"}
              {activeTab === "checkout" && "Hosted Checkouts"}
              {activeTab === "settlements" && "Settlement Vaults"}
            </h1>
            <p className="text-[10px] text-neutral-450 mt-1 font-semibold">
              {activeTab === "overview" && "Analytical hub for stablecoin settlement rates and velocity streams."}
              {activeTab === "payments" && "Detailed transaction record database and real-time event broadcaster."}
              {activeTab === "keys" && "Configure client secret credentials, webhooks events, and code playgrounds."}
              {activeTab === "checkout" && "Generate Hosted Checkout Links and simulate live mobile transactions."}
              {activeTab === "settlements" && "Manage multi-chain wallet vault receivers and gasrelayer properties."}
            </p>
          </div>

          {/* Quick Environment status node */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-neutral-950 border border-neutral-900 text-[9px] font-mono text-neutral-400 font-bold uppercase select-none">
              <span className={`w-1.5 h-1.5 rounded-full ${
                isLiveMode ? "bg-emerald-500 glow-emerald" : "bg-indigo-500 glow-indigo animate-pulse"
              }`} />
              <span>{isLiveMode ? "Production Network" : "Local Sandbox Relayer"}</span>
            </div>
          </div>
        </div>

        {/* Tab Router Switch Panels */}
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              {activeTab === "overview" && (
                <OverviewTab 
                  transactions={transactions} 
                  isLiveMode={isLiveMode} 
                />
              )}
              {activeTab === "payments" && (
                <PaymentsTab 
                  transactions={transactions} 
                  onSimulatePayment={handleSimulatePayment} 
                />
              )}
              {activeTab === "keys" && (
                <ApiKeysTab 
                  isLiveMode={isLiveMode} 
                />
              )}
              {activeTab === "checkout" && (
                <CheckoutTab />
              )}
              {activeTab === "settlements" && (
                <SettlementsTab />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

      </main>
    </div>
  )
}
