"use client"

import React, { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Search, Filter, CheckCircle2, AlertTriangle, 
  Clock, ExternalLink, X, Plus, Terminal,
  Cpu, ArrowUpRight, HelpCircle, Code
} from "lucide-react"

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

interface PaymentsTabProps {
  transactions: Transaction[]
  onSimulatePayment: (amount: number, currency: string, network: string, status: "success" | "failed", email: string) => void
}

export default function PaymentsTab({ transactions, onSimulatePayment }: PaymentsTabProps) {
  // Filter States
  const [search, setSearch] = useState("")
  const [currencyFilter, setCurrencyFilter] = useState("All")
  const [networkFilter, setNetworkFilter] = useState("All")
  const [statusFilter, setStatusFilter] = useState("All")

  // UI Interactive States
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
  const [showSimulator, setShowSimulator] = useState(false)

  // Simulator Form States
  const [simAmount, setSimAmount] = useState("150")
  const [simCurrency, setSimCurrency] = useState("USDC")
  const [simNetwork, setSimNetwork] = useState("Solana")
  const [simStatus, setSimStatus] = useState<"success" | "failed">("success")
  const [simEmail, setSimEmail] = useState("merchant@sandbox.io")

  // Filtered Transactions
  const filteredTxs = useMemo(() => {
    return transactions.filter(tx => {
      const matchesSearch = 
        tx.id.toLowerCase().includes(search.toLowerCase()) ||
        (tx.customerEmail && tx.customerEmail.toLowerCase().includes(search.toLowerCase())) ||
        (tx.txHash && tx.txHash.toLowerCase().includes(search.toLowerCase()))
      
      const matchesCurrency = currencyFilter === "All" || tx.currency === currencyFilter
      const matchesNetwork = networkFilter === "All" || tx.network === networkFilter
      const matchesStatus = statusFilter === "All" || tx.status === statusFilter

      return matchesSearch && matchesCurrency && matchesNetwork && matchesStatus
    }).reverse() // show latest first
  }, [transactions, search, currencyFilter, networkFilter, statusFilter])

  // Handle Simulation submit
  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault()
    const amountVal = parseFloat(simAmount) || 0.0
    if (amountVal <= 0) return

    onSimulatePayment(amountVal, simCurrency, simNetwork, simStatus, simEmail)
    setShowSimulator(false)
    
    // reset simulator amount
    setSimAmount("150")
  }

  // Helper formats
  const formatDate = (dateInput: Date | string) => {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    })
  }

  // Simulated JSON Webhook payload generator
  const getSimulatedWebhookJson = (tx: Transaction) => {
    const payload = {
      id: `evt_${Math.random().toString(36).substring(2, 9)}`,
      object: "event",
      type: tx.status === "success" ? "payment.succeeded" : "payment.failed",
      created: Math.floor(new Date(tx.timestamp).getTime() / 1000),
      data: {
        object: "payment_intent",
        id: tx.id,
        amount: Math.round(tx.amount * 100),
        currency: tx.currency.toLowerCase(),
        network: tx.network.toLowerCase(),
        status: tx.status === "success" ? "succeeded" : "failed",
        transaction_hash: tx.txHash || "0x000000000000000000000",
        customer: {
          email: tx.customerEmail || "anonymous@wallet.xyz"
        },
        vault_routing: {
          gas_sponsored: true,
          relayer_speed_ms: 1840
        }
      }
    }
    return JSON.stringify(payload, null, 2)
  }

  return (
    <div className="space-y-6">
      
      {/* Table Filters & Header Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-950/20 p-4 border border-neutral-900 rounded-xl">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3">
          
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
            <input 
              type="text" 
              placeholder="Search ID, email, hash..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-black border border-neutral-900 rounded text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 font-mono transition-colors"
            />
          </div>

          {/* Currency select */}
          <div className="relative">
            <select
              value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value)}
              className="w-full bg-black border border-neutral-900 text-[10px] text-neutral-400 font-mono rounded px-3 py-1.5 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
            >
              <option value="All">All Coins</option>
              <option value="USDC">USDC</option>
              <option value="USDT">USDT</option>
              <option value="EURC">EURC</option>
            </select>
          </div>

          {/* Network select */}
          <div className="relative">
            <select
              value={networkFilter}
              onChange={(e) => setNetworkFilter(e.target.value)}
              className="w-full bg-black border border-neutral-900 text-[10px] text-neutral-400 font-mono rounded px-3 py-1.5 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
            >
              <option value="All">All Networks</option>
              <option value="Solana">Solana</option>
              <option value="Arbitrum">Arbitrum</option>
              <option value="Polygon">Polygon</option>
              <option value="Ethereum">Ethereum</option>
            </select>
          </div>

          {/* Status select */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-black border border-neutral-900 text-[10px] text-neutral-400 font-mono rounded px-3 py-1.5 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="success">Success</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>

        </div>

        {/* Action Button */}
        <button
          onClick={() => setShowSimulator(true)}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold transition-all shadow-md shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Simulate Payment</span>
        </button>
      </div>

      {/* Database Table view */}
      <div className="glass-card border border-neutral-900 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-900 text-[9px] uppercase tracking-wider text-neutral-500 font-mono bg-neutral-950/50">
                <th className="py-3.5 px-5 font-bold">Payment ID</th>
                <th className="py-3.5 px-4 font-bold">Amount</th>
                <th className="py-3.5 px-4 font-bold">Customer</th>
                <th className="py-3.5 px-4 font-bold">Network</th>
                <th className="py-3.5 px-4 font-bold">TX Hash</th>
                <th className="py-3.5 px-4 font-bold">Status</th>
                <th className="py-3.5 px-5 font-bold text-right">Settled At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900/60 text-xs font-medium">
              {filteredTxs.map((tx) => (
                <tr 
                  key={tx.id} 
                  onClick={() => setSelectedTx(tx)}
                  className="hover:bg-neutral-950/70 transition-colors cursor-pointer group"
                >
                  {/* ID */}
                  <td className="py-4 px-5 font-mono text-white font-semibold text-[11px] group-hover:text-indigo-400 transition-colors">
                    {tx.id}
                  </td>
                  {/* Amount */}
                  <td className="py-4 px-4 font-mono">
                    <span className="text-white font-bold">${tx.amount.toFixed(2)}</span>
                    <span className="text-[10px] text-neutral-500 ml-1 font-semibold">{tx.currency}</span>
                  </td>
                  {/* Customer email */}
                  <td className="py-4 px-4 text-neutral-450 truncate max-w-[150px]">
                    {tx.customerEmail || "sandbox-terminal"}
                  </td>
                  {/* Network */}
                  <td className="py-4 px-4 text-neutral-400">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        tx.network === "Solana" ? "bg-indigo-500" :
                        tx.network === "Ethereum" ? "bg-cyan-500" :
                        tx.network === "Arbitrum" ? "bg-emerald-500" : "bg-purple-500"
                      }`} />
                      {tx.network}
                    </span>
                  </td>
                  {/* Hash */}
                  <td className="py-4 px-4 font-mono text-[10px] text-neutral-600 truncate max-w-[120px]">
                    {tx.txHash || "0x00...000"}
                  </td>
                  {/* Status */}
                  <td className="py-4 px-4">
                    {tx.status === "success" ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold font-mono text-emerald-450 uppercase">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Success</span>
                      </span>
                    ) : tx.status === "failed" ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold font-mono text-red-500 uppercase">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Failed</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold font-mono text-yellow-500 uppercase">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pending</span>
                      </span>
                    )}
                  </td>
                  {/* Date */}
                  <td className="py-4 px-5 text-right text-neutral-500 text-[10px] font-mono">
                    {formatDate(tx.timestamp)}
                  </td>
                </tr>
              ))}

              {filteredTxs.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="max-w-xs mx-auto">
                      <p className="text-sm font-bold text-white">No transactions found</p>
                      <p className="text-[11px] text-neutral-500 mt-1">
                        Try modifying your filter options or trigger a mock transaction using the simulator.
                      </p>
                      <button
                        onClick={() => setShowSimulator(true)}
                        className="mt-4 inline-flex items-center gap-1 px-3 py-1.5 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 rounded text-[10px] font-mono font-bold"
                      >
                        Launch Payment Simulator
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Payment Simulator Modal Overlay */}
      <AnimatePresence>
        {showSimulator && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSimulator(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-md bg-neutral-950 border border-neutral-900 rounded-xl p-6 shadow-2xl z-10"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowSimulator(false)}
                className="absolute top-4 right-4 p-1.5 text-neutral-500 hover:text-white rounded bg-neutral-900/60 border border-neutral-850 hover:border-neutral-800 transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <Cpu className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider font-mono">
                  Stablecoin Transaction Simulator
                </h3>
              </div>
              <p className="text-[10px] text-neutral-500 font-semibold mb-6">
                Broadcast simulated stablecoin deposits to mock your checkout integrations and trigger webhook delivery logic.
              </p>

              <form onSubmit={handleSimulate} className="space-y-4">
                {/* Amount */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider font-mono block">
                    Settlement Amount (USD equivalent)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-xs font-bold">$</span>
                    <input
                      type="number"
                      value={simAmount}
                      onChange={(e) => setSimAmount(e.target.value)}
                      placeholder="Amount"
                      className="w-full pl-7 pr-3 py-2 bg-black border border-neutral-900 rounded text-xs font-bold text-white focus:outline-none focus:border-indigo-500 font-mono"
                      required
                    />
                  </div>
                  {/* Shortcuts */}
                  <div className="flex gap-2 pt-1.5">
                    {["10", "50", "150", "500", "1200"].map(val => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setSimAmount(val)}
                        className="px-2 py-0.5 text-[9px] font-mono bg-neutral-900 border border-neutral-850 text-neutral-400 hover:text-white hover:border-neutral-700 rounded transition-all"
                      >
                        ${val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Coin & Chain */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider font-mono block">
                      Stablecoin Asset
                    </label>
                    <select
                      value={simCurrency}
                      onChange={(e) => setSimCurrency(e.target.value)}
                      className="w-full bg-black border border-neutral-900 text-xs text-white font-mono rounded px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="USDC">USDC</option>
                      <option value="USDT">USDT</option>
                      <option value="EURC">EURC</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider font-mono block">
                      Settlement Chain
                    </label>
                    <select
                      value={simNetwork}
                      onChange={(e) => setSimNetwork(e.target.value)}
                      className="w-full bg-black border border-neutral-900 text-xs text-white font-mono rounded px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="Solana">Solana</option>
                      <option value="Arbitrum">Arbitrum</option>
                      <option value="Polygon">Polygon</option>
                      <option value="Ethereum">Ethereum</option>
                    </select>
                  </div>
                </div>

                {/* Customer Email */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider font-mono block">
                    Customer Account Email
                  </label>
                  <input
                    type="email"
                    value={simEmail}
                    onChange={(e) => setSimEmail(e.target.value)}
                    placeholder="email@customer.com"
                    className="w-full px-3 py-2 bg-black border border-neutral-900 rounded text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    required
                  />
                </div>

                {/* Sim Outcome status */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider font-mono block">
                    Simulation Output
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="simStatus"
                        checked={simStatus === "success"}
                        onChange={() => setSimStatus("success")}
                        className="accent-indigo-500 text-indigo-500 cursor-pointer"
                      />
                      <span className="text-xs text-neutral-300 font-medium">Succeed Payment</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="simStatus"
                        checked={simStatus === "failed"}
                        onChange={() => setSimStatus("failed")}
                        className="accent-indigo-500 text-indigo-500 cursor-pointer"
                      />
                      <span className="text-xs text-neutral-300 font-medium text-red-400">Trigger Rejection</span>
                    </label>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full py-2.5 mt-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded transition-colors shadow-md"
                >
                  Generate Simulated Event
                </button>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Slide-out Ledger Inspector Drawer (right side panel) */}
      <AnimatePresence>
        {selectedTx && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTx(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            {/* Panel Body */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
              className="relative w-full max-w-lg bg-neutral-950 border-l border-neutral-900 h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-neutral-900 mb-6">
                  <div>
                    <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest font-mono">
                      Telemetry Node Inspector
                    </h3>
                    <h2 className="text-sm font-bold text-white mt-1 font-mono">
                      {selectedTx.id}
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedTx(null)}
                    className="p-1.5 text-neutral-500 hover:text-white rounded bg-neutral-900/60 border border-neutral-850 hover:border-neutral-800 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Status bar */}
                <div className={`p-3.5 rounded-lg border mb-6 flex items-center justify-between ${
                  selectedTx.status === "success" 
                    ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
                    : selectedTx.status === "failed"
                    ? "bg-red-500/5 border-red-500/20 text-red-400"
                    : "bg-yellow-500/5 border-yellow-500/20 text-yellow-400"
                }`}>
                  <div className="flex items-center gap-2">
                    {selectedTx.status === "success" ? (
                      <CheckCircle2 className="w-4.5 h-4.5" />
                    ) : selectedTx.status === "failed" ? (
                      <AlertTriangle className="w-4.5 h-4.5" />
                    ) : (
                      <Clock className="w-4.5 h-4.5" />
                    )}
                    <span className="text-[10px] font-extrabold uppercase font-mono tracking-wider">
                      Ledger Finality: {selectedTx.status}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-semibold">
                    Settled: {formatDate(selectedTx.timestamp)}
                  </span>
                </div>

                {/* Info block */}
                <div className="space-y-4 mb-6">
                  <h4 className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider font-mono">
                    Overview Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4 bg-neutral-950 p-4 border border-neutral-900 rounded-lg text-xs font-mono">
                    <div>
                      <span className="text-neutral-500 text-[9px] block">AMOUNT</span>
                      <span className="text-white font-bold">${selectedTx.amount.toFixed(2)} {selectedTx.currency}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 text-[9px] block">ROUTING NETWORK</span>
                      <span className="text-white font-bold">{selectedTx.network}</span>
                    </div>
                    <div className="pt-2">
                      <span className="text-neutral-500 text-[9px] block">GAS SPONSORSHIP</span>
                      <span className="text-cyan-400 font-bold">100% Sponsored</span>
                    </div>
                    <div className="pt-2">
                      <span className="text-neutral-500 text-[9px] block">CUSTOMER ACCOUNT</span>
                      <span className="text-white font-bold truncate block max-w-[150px]">{selectedTx.customerEmail || "N/A"}</span>
                    </div>
                  </div>
                </div>

                {/* Blockchain Info */}
                <div className="space-y-4 mb-6">
                  <h4 className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider font-mono flex items-center justify-between">
                    <span>Ledger Metadata</span>
                    <a
                      href={`https://explorer.solana.com/tx/${selectedTx.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 hover:underline text-[9px]"
                    >
                      <span>Explorer Link</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </h4>
                  <div className="space-y-2.5 bg-neutral-950 p-4 border border-neutral-900 rounded-lg text-[10px] font-mono">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">TX Hash</span>
                      <span className="text-neutral-300 truncate max-w-[240px] select-all font-semibold">{selectedTx.txHash || "0x0"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Sender Wallet</span>
                      <span className="text-neutral-300 truncate max-w-[240px] select-all font-semibold">{selectedTx.senderAddress || "0x...abc"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Gas Cost (Sponsored)</span>
                      <span className="text-emerald-450 font-bold">$0.00 (Sponsored by AirPay Relayer)</span>
                    </div>
                  </div>
                </div>

                {/* Webhook Stream logs */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Webhook Log Stream</span>
                    </h4>
                    <span className="text-[8px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 font-bold uppercase tracking-wider">
                      200 OK
                    </span>
                  </div>

                  <div className="relative rounded-lg overflow-hidden border border-neutral-900 bg-black p-3.5 font-mono text-[9px] leading-relaxed text-neutral-350">
                    <div className="absolute top-2 right-2">
                      <Code className="w-3.5 h-3.5 text-neutral-700" />
                    </div>
                    <pre className="overflow-x-auto whitespace-pre">
                      {getSimulatedWebhookJson(selectedTx)}
                    </pre>
                  </div>
                </div>

              </div>

              <div className="text-[8px] text-neutral-600 font-semibold leading-relaxed border-t border-neutral-900 pt-4 mt-6">
                Securely signed with TLS 1.3 relays. Finality state updates are recorded in local memory vaults.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
