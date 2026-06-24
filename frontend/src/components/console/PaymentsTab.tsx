"use client"

import React, { useState, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Search, CheckCircle2, AlertTriangle, 
  Clock, ExternalLink, X, Terminal, Code, RefreshCw
} from "lucide-react"
import type { ConsoleTransaction } from "@/app/console/page"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787"

interface PaymentsTabProps {
  transactions: ConsoleTransaction[]
  isLoading?: boolean
  onRefresh?: () => void
}

interface PaymentDetail {
  id: string
  checkoutSessionId: string
  txHash: string
  buyerAddress?: string
  signature?: string
  amount: number
  feeAmount: number
  merchantAmount: number
  status: string
  blockchainStatus: string
  confirmations: number
  retryCount: number
  failureReason?: string
  webhookDelivered: boolean
  webhookDeliveryCount: number
  settledAt?: number
  createdAt: number
  productName: string
  currency: string
  network: string
  buyerEmail?: string
  merchantWalletAddress: string
  companyWalletAddress: string
}

export default function PaymentsTab({ transactions, isLoading, onRefresh }: PaymentsTabProps) {
  const [search, setSearch] = useState("")
  const [currencyFilter, setCurrencyFilter] = useState("All")
  const [networkFilter, setNetworkFilter] = useState("All")
  const [statusFilter, setStatusFilter] = useState("All")

  const [selectedTx, setSelectedTx] = useState<ConsoleTransaction | null>(null)
  const [detail, setDetail] = useState<PaymentDetail | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)

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
    })
  }, [transactions, search, currencyFilter, networkFilter, statusFilter])

  useEffect(() => {
    if (!selectedTx) {
      setDetail(null)
      return
    }
    let cancelled = false
    setIsLoadingDetail(true)
    fetch(`${API_URL}/api/merchant/payments/${selectedTx.id}`, {
      credentials: "include",
    })
      .then(r => r.ok ? r.json() : null)
      .then((data: PaymentDetail | null) => {
        if (!cancelled) setDetail(data)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoadingDetail(false) })
    return () => { cancelled = true }
  }, [selectedTx])

  const formatDate = (dateInput: Date | string | number | undefined) => {
    if (!dateInput) return "—"
    const date = typeof dateInput === "number" ? new Date(dateInput) 
      : typeof dateInput === "string" ? new Date(dateInput) 
      : dateInput
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    })
  }

  const getExplorerUrl = (network: string, hash?: string) => {
    if (!hash) return "#"
    if (network === "Solana") return `https://explorer.solana.com/tx/${hash}`
    if (network === "Ethereum") return `https://etherscan.io/tx/${hash}`
    if (network === "Arbitrum") return `https://arbiscan.io/tx/${hash}`
    if (network === "Polygon") return `https://polygonscan.com/tx/${hash}`
    return "#"
  }

  const getWebhookJson = () => {
    if (!detail) return ""
    const payload = {
      id: `evt_${detail.id.slice(-8)}`,
      object: "event",
      type: detail.status === "completed" || detail.status === "settled" ? "payment.succeeded" : "payment.failed",
      created: Math.floor(detail.createdAt / 1000),
      data: {
        object: "payment",
        id: detail.id,
        amount: detail.amount,
        feeAmount: detail.feeAmount,
        merchantAmount: detail.merchantAmount,
        currency: detail.currency,
        network: detail.network,
        status: detail.status,
        blockchainStatus: detail.blockchainStatus,
        confirmations: detail.confirmations,
        transactionHash: detail.txHash,
        buyer: {
          address: detail.buyerAddress,
          email: detail.buyerEmail,
        },
        productName: detail.productName,
      },
    }
    return JSON.stringify(payload, null, 2)
  }

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-950/20 p-4 border border-neutral-900 rounded-xl">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3">
          
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

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-black border border-neutral-900 text-[10px] text-neutral-400 font-mono rounded px-3 py-1.5 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="success">Settled</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>

        </div>

        <button
          onClick={onRefresh}
          type="button"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 rounded text-xs font-bold transition-all shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="glass-card border border-neutral-900 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-900 text-[9px] uppercase tracking-wider text-neutral-500 font-mono bg-neutral-950/50">
                <th className="py-3.5 px-5 font-bold">Payment ID</th>
                <th className="py-3.5 px-4 font-bold">Amount</th>
                <th className="py-3.5 px-4 font-bold">Product</th>
                <th className="py-3.5 px-4 font-bold">Customer</th>
                <th className="py-3.5 px-4 font-bold">Network</th>
                <th className="py-3.5 px-4 font-bold">TX Hash</th>
                <th className="py-3.5 px-4 font-bold">Status</th>
                <th className="py-3.5 px-5 font-bold text-right">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900/60 text-xs font-medium">
              {filteredTxs.map((tx) => (
                <tr 
                  key={tx.id} 
                  onClick={() => setSelectedTx(tx)}
                  className="hover:bg-neutral-950/70 transition-colors cursor-pointer group"
                >
                  <td className="py-4 px-5 font-mono text-white font-semibold text-[11px] group-hover:text-indigo-400 transition-colors">
                    {tx.id.slice(0, 12)}…
                  </td>
                  <td className="py-4 px-4 font-mono">
                    <span className="text-white font-bold">${tx.amount.toFixed(2)}</span>
                    <span className="text-[10px] text-neutral-500 ml-1 font-semibold">{tx.currency}</span>
                  </td>
                  <td className="py-4 px-4 text-neutral-350 truncate max-w-[160px]">
                    {tx.productName || "—"}
                  </td>
                  <td className="py-4 px-4 text-neutral-450 truncate max-w-[150px]">
                    {tx.customerEmail || "—"}
                  </td>
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
                  <td className="py-4 px-4 font-mono text-[10px] text-neutral-600 truncate max-w-[120px]">
                    {tx.txHash ? `${tx.txHash.slice(0, 8)}…${tx.txHash.slice(-4)}` : "—"}
                  </td>
                  <td className="py-4 px-4">
                    {tx.status === "success" ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold font-mono text-emerald-450 uppercase">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Settled</span>
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
                  <td className="py-4 px-5 text-right text-neutral-500 text-[10px] font-mono">
                    {formatDate(tx.timestamp)}
                  </td>
                </tr>
              ))}

              {filteredTxs.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="max-w-xs mx-auto">
                      <p className="text-sm font-bold text-white">No transactions found</p>
                      <p className="text-[11px] text-neutral-500 mt-1">
                        Payments appear here once a buyer completes a hosted checkout.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedTx && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTx(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
              className="relative w-full max-w-lg bg-neutral-950 border-l border-neutral-900 h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-neutral-900 mb-6">
                  <div>
                    <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest font-mono">
                      Payment Inspector
                    </h3>
                    <h2 className="text-sm font-bold text-white mt-1 font-mono">
                      {selectedTx.id}
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedTx(null)}
                    type="button"
                    className="p-1.5 text-neutral-500 hover:text-white rounded bg-neutral-900/60 border border-neutral-850 hover:border-neutral-800 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {isLoadingDetail && (
                  <div className="text-[10px] font-mono text-neutral-500 py-6 text-center">
                    Loading payment details…
                  </div>
                )}

                {detail && (
                  <>
                    <div className={`p-3.5 rounded-lg border mb-6 flex items-center justify-between ${
                      detail.status === "completed" || detail.status === "settled"
                        ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
                        : detail.status === "failed"
                        ? "bg-red-500/5 border-red-500/20 text-red-400"
                        : "bg-yellow-500/5 border-yellow-500/20 text-yellow-400"
                    }`}>
                      <div className="flex items-center gap-2">
                        {detail.status === "completed" || detail.status === "settled" ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : detail.status === "failed" ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : (
                          <Clock className="w-4 h-4" />
                        )}
                        <span className="text-[10px] font-extrabold uppercase font-mono tracking-wider">
                          Status: {detail.status} · {detail.blockchainStatus}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-semibold">
                        {detail.settledAt ? `Settled: ${formatDate(detail.settledAt)}` : `Created: ${formatDate(detail.createdAt)}`}
                      </span>
                    </div>

                    {detail.failureReason && (
                      <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5 mb-6 text-[10px] font-mono text-red-300">
                        <strong className="block mb-1 uppercase">Failure Reason</strong>
                        {detail.failureReason}
                      </div>
                    )}

                    <div className="space-y-4 mb-6">
                      <h4 className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider font-mono">
                        Payment Details
                      </h4>
                      <div className="grid grid-cols-2 gap-4 bg-neutral-950 p-4 border border-neutral-900 rounded-lg text-xs font-mono">
                        <div>
                          <span className="text-neutral-500 text-[9px] block">AMOUNT</span>
                          <span className="text-white font-bold">${(detail.amount / 100).toFixed(2)} {detail.currency}</span>
                        </div>
                        <div>
                          <span className="text-neutral-500 text-[9px] block">PRODUCT</span>
                          <span className="text-white font-bold truncate block">{detail.productName}</span>
                        </div>
                        <div>
                          <span className="text-neutral-500 text-[9px] block">NETWORK</span>
                          <span className="text-white font-bold">{detail.network}</span>
                        </div>
                        <div>
                          <span className="text-neutral-500 text-[9px] block">FEE</span>
                          <span className="text-white font-bold">${(detail.feeAmount / 100).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-neutral-500 text-[9px] block">YOU RECEIVE</span>
                          <span className="text-emerald-400 font-bold">${(detail.merchantAmount / 100).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-neutral-500 text-[9px] block">CONFIRMATIONS</span>
                          <span className="text-white font-bold">{detail.confirmations}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-neutral-500 text-[9px] block">CUSTOMER</span>
                          <span className="text-white font-bold">{detail.buyerEmail || "—"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 mb-6">
                      <h4 className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider font-mono flex items-center justify-between">
                        <span>Ledger Metadata</span>
                        <a
                          href={getExplorerUrl(detail.network, detail.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 hover:underline text-[9px]"
                        >
                          <span>Explorer</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </h4>
                      <div className="space-y-2.5 bg-neutral-950 p-4 border border-neutral-900 rounded-lg text-[10px] font-mono">
                        <div className="flex justify-between">
                          <span className="text-neutral-500">TX Hash</span>
                          <span className="text-neutral-300 truncate max-w-[280px] select-all font-semibold">{detail.txHash}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Buyer Wallet</span>
                          <span className="text-neutral-300 truncate max-w-[280px] select-all font-semibold">{detail.buyerAddress || "—"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Merchant Vault</span>
                          <span className="text-neutral-300 truncate max-w-[280px] select-all font-semibold">{detail.merchantWalletAddress}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Webhook</span>
                          <span className="text-emerald-450 font-bold">
                            {detail.webhookDelivered ? `Delivered (${detail.webhookDeliveryCount}×)` : "Pending"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5 text-neutral-500" />
                          <span>Webhook Payload</span>
                        </h4>
                      </div>

                      <div className="relative rounded-lg overflow-hidden border border-neutral-900 bg-black p-3.5 font-mono text-[9px] leading-relaxed text-neutral-350">
                        <div className="absolute top-2 right-2">
                          <Code className="w-3.5 h-3.5 text-neutral-700" />
                        </div>
                        <pre className="overflow-x-auto whitespace-pre">
                          {getWebhookJson()}
                        </pre>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="text-[8px] text-neutral-600 font-semibold leading-relaxed border-t border-neutral-900 pt-4 mt-6">
                Live payment data from the AirPay ledger. Finality is recorded after on-chain confirmation.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
