"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Wallet, ArrowRight, CheckCircle2, ShieldCheck,
  RefreshCw, AlertTriangle, Clock, ExternalLink,
  ChevronLeft, Wallet2, Zap, Copy, Check, Coins
} from "lucide-react"
import { useUnifiedWallet, SolanaWalletProviderWrapper } from "@/components/WalletProvider"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787"

const networkExplorers: Record<string, string> = {
  Solana: "https://solscan.io/tx/",
  Arbitrum: "https://arbiscan.io/tx/",
  Polygon: "https://polygonscan.com/tx/",
  Ethereum: "https://etherscan.io/tx/",
}

type Step = "loading" | "connect" | "review" | "pay" | "processing" | "success" | "error"
type NetworkType = "Solana" | "Ethereum" | "Arbitrum" | "Polygon"

interface CheckoutSession {
  id: string
  productName: string
  amount: number
  feeAmount: number
  merchantAmount: number
  currency: string
  network: string
  feeType: string
  collectEmail: boolean
  merchantWalletAddress: string
  companyWalletAddress: string
  status: string
  expiresAt: number
}

function CheckoutPageInner() {
  const params = useParams()
  const sessionId = params.sessionId as string

  const {
    connected,
    connecting,
    walletAddress,
    walletType,
    network: connectedNetwork,
    connect,
    disconnect,
    sendTransaction,
  } = useUnifiedWallet()

  const [step, setStep] = useState<Step>("loading")
  const [session, setSession] = useState<CheckoutSession | null>(null)
  const [error, setError] = useState("")
  const [buyerEmail, setBuyerEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [txHash, setTxHash] = useState("")
  const [isCopied, setIsCopied] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<any>(null)
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkType | null>(null)

  // Fetch session
  useEffect(() => {
    if (!sessionId) return
    fetch(`${API_URL}/api/checkout/${sessionId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Session not found or expired")
        return res.json()
      })
      .then((data) => {
        setSession(data)
        const network = data.network as NetworkType
        setSelectedNetwork(network)

        // Check if already connected to correct network
        if (connected && connectedNetwork === network) {
          setStep("review")
        } else {
          setStep("connect")
        }
      })
      .catch((err) => {
        setError(err.message)
        setStep("error")
      })
  }, [sessionId, connected, connectedNetwork])

  // Poll payment status
  const pollPaymentStatus = useCallback((paymentId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/api/checkout/payment/${paymentId}/status`)
        const data = await res.json()
        setPaymentStatus(data)

        if (data.blockchainStatus === "confirmed" || data.blockchainStatus === "finalized") {
          setStep("success")
          clearInterval(interval)
        } else if (data.blockchainStatus === "failed") {
          setError(data.failureReason || "Payment failed")
          setStep("error")
          clearInterval(interval)
        }
      } catch (err) {
        console.error("Error polling payment status:", err)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const handleConnect = async () => {
    if (!session) return
    const network = session.network as NetworkType
    await connect(network)
  }

  const handlePay = async () => {
    if (!session || !connected) return
    setIsSubmitting(true)
    setStep("pay")

    try {
      const { txHash, feeTxHash } = await sendTransaction({
        network: session.network as NetworkType,
        currency: session.currency,
        merchantWallet: session.merchantWalletAddress,
        companyWallet: session.companyWalletAddress,
        merchantAmount: session.merchantAmount,
        feeAmount: session.feeAmount,
      })

      setTxHash(txHash)
      setStep("processing")

      // Confirm payment with backend
      const res = await fetch(`${API_URL}/api/checkout/${session.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txHash,
          feeTxHash,
          buyerAddress: walletAddress,
          signature: txHash,
          buyerEmail: session.collectEmail ? buyerEmail : undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to confirm payment")
      }

      const data = await res.json()
      pollPaymentStatus(data.id)
    } catch (err: any) {
      setError(err.message || "Payment failed")
      setStep("error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatAmount = (cents: number) => {
    return (cents / 100).toFixed(2)
  }

  const timeLeft = () => {
    if (!session) return 0
    const diff = session.expiresAt - Date.now()
    return Math.max(0, Math.floor(diff / 1000))
  }

  const [secondsLeft, setSecondsLeft] = useState(0)
  useEffect(() => {
    if (!session) return
    const interval = setInterval(() => {
      setSecondsLeft(timeLeft())
    }, 1000)
    return () => clearInterval(interval)
  }, [session])

  const handleCopyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const isEvmNetwork = (network: string) => {
    return network === "Ethereum" || network === "Arbitrum" || network === "Polygon"
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 radial-glow pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-8 h-8 rounded bg-neutral-950 border border-neutral-850 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="font-extrabold text-sm tracking-tight text-white font-mono">
              Air<span className="text-indigo-400">Pay</span>
            </span>
          </div>
          <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
            Hosted Checkout
          </p>
        </div>

        {/* Card */}
        <div className="glass-card border border-neutral-900 rounded-xl shadow-xl overflow-hidden">
          <div className="h-1 bg-indigo-500" />

          <div className="p-6">
            <AnimatePresence mode="wait">
              {/* STEP: LOADING */}
              {step === "loading" && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-12 space-y-4"
                >
                  <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                  <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                    Loading Checkout Session...
                  </p>
                </motion.div>
              )}

              {/* STEP: ERROR */}
              {step === "error" && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center py-8 space-y-4"
                >
                  <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-7 h-7 text-red-400" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                      Checkout Error
                    </h3>
                    <p className="text-[10px] text-neutral-500 mt-2 font-mono">{error}</p>
                  </div>
                  <button onClick={() => window.location.reload()} className="px-4 py-2 bg-neutral-950 border border-neutral-900 hover:border-neutral-700 text-white rounded text-[10px] font-mono font-bold transition-all">
                    Try Again
                  </button>
                </motion.div>
              )}

              {/* STEP: CONNECT WALLET */}
              {step === "connect" && session && (
                <motion.div
                  key="connect"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* Session Info */}
                  <div className="text-center space-y-1">
                    <span className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest block">
                      Merchant Invoice
                    </span>
                    <h2 className="text-base font-bold text-white font-mono">
                      {session.productName}
                    </h2>

                    {session.feeType === "on_top" ? (
                      <div className="space-y-1 mt-2">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-2xl font-bold font-mono text-white">
                            ${formatAmount(session.amount)}
                          </span>
                          <span className="text-[10px] font-mono text-neutral-500 bg-neutral-950 border border-neutral-900 px-2 py-0.5 rounded">
                            {session.currency}
                          </span>
                        </div>
                        <div className="text-[9px] font-mono text-neutral-500">
                          Item ${formatAmount(session.merchantAmount)} + Fee ${formatAmount(session.feeAmount)}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1 mt-2">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-2xl font-bold font-mono text-white">
                            ${formatAmount(session.amount)}
                          </span>
                          <span className="text-[10px] font-mono text-neutral-500 bg-neutral-950 border border-neutral-900 px-2 py-0.5 rounded">
                            {session.currency}
                          </span>
                        </div>
                        <div className="text-[9px] font-mono text-neutral-500">
                          Includes ${formatAmount(session.feeAmount)} platform fee
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-center gap-1 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      <span className="text-[9px] font-mono text-neutral-500">{session.network}</span>
                    </div>
                  </div>

                  {/* Timer */}
                  <div className="flex items-center justify-center gap-2 text-[9px] font-mono text-neutral-500 bg-neutral-950 border border-neutral-900 rounded py-1.5">
                    <Clock className="w-3 h-3" />
                    <span>Expires in {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}</span>
                  </div>

                  {/* Wallet Connection */}
                  <div className="bg-neutral-950 border border-neutral-900 rounded-lg p-4 text-center space-y-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto">
                      <Wallet2 className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                        Connect Your Wallet
                      </h4>
                      <p className="text-[9px] text-neutral-500 mt-1 font-mono">
                        {isEvmNetwork(session.network)
                          ? "Connect with MetaMask or another EVM wallet"
                          : "Connect with Phantom, Solflare, or other Solana wallets"
                        }
                      </p>
                    </div>

                    {isEvmNetwork(session.network) ? (
                      <button
                        onClick={handleConnect}
                        disabled={connecting}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 text-white text-xs font-bold rounded transition-colors flex items-center justify-center gap-2"
                      >
                        {connecting ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Connecting...</span>
                          </>
                        ) : (
                          <>
                            <Coins className="w-3.5 h-3.5" />
                            <span>Connect MetaMask</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="flex justify-center">
                        <WalletMultiButton className="!bg-indigo-600 hover:!bg-indigo-500 !text-white !text-xs !font-bold !rounded !py-2 !px-4 !transition-colors" />
                      </div>
                    )}
                  </div>

                  {/* Email (if required) */}
                  {session.collectEmail && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono block">
                        Your Email
                      </label>
                      <input
                        type="email"
                        value={buyerEmail}
                        onChange={(e) => setBuyerEmail(e.target.value)}
                        placeholder="receipt@example.com"
                        className="w-full px-3 py-2.5 bg-black border border-neutral-900 rounded text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                  )}
                </motion.div>
              )}

              {/* STEP: REVIEW */}
              {step === "review" && session && (
                <motion.div
                  key="review"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <button onClick={() => { disconnect(); setStep("connect") }} className="text-neutral-500 hover:text-white transition-colors">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono">
                      Review Payment
                    </span>
                  </div>

                  {/* Connected Wallet Info */}
                  <div className="flex items-center gap-3 bg-neutral-950 border border-neutral-900 rounded-lg p-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] font-mono text-white font-bold">
                        {walletType === "evm" ? "EVM Wallet" : "Solana Wallet"}
                      </span>
                      <span className="text-[9px] font-mono text-neutral-500 block">
                        {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                      </span>
                    </div>
                    <button onClick={disconnect} className="text-[9px] text-red-400 hover:text-red-300 font-mono">
                      Disconnect
                    </button>
                  </div>

                  <div className="bg-neutral-950 border border-neutral-900 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono text-neutral-500">Product</span>
                      <span className="text-[10px] font-mono text-white font-bold">{session.productName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono text-neutral-500">Network</span>
                      <span className="text-[10px] font-mono text-cyan-400 font-bold">{session.network}</span>
                    </div>

                    {session.feeType === "on_top" ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono text-neutral-500">Item price</span>
                          <span className="text-[10px] font-mono text-white font-bold">${formatAmount(session.merchantAmount)} {session.currency}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono text-neutral-500">Platform fee (2%)</span>
                          <span className="text-[10px] font-mono text-white">${formatAmount(session.feeAmount)}</span>
                        </div>
                        <div className="border-t border-neutral-900 pt-2 flex justify-between items-center">
                          <span className="text-[10px] font-mono text-neutral-400 font-bold">Total you pay</span>
                          <span className="text-[10px] font-mono text-white font-bold">${formatAmount(session.amount)} {session.currency}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono text-neutral-500">You pay</span>
                          <span className="text-[10px] font-mono text-white font-bold">${formatAmount(session.amount)} {session.currency}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono text-neutral-500">Platform fee (2%, deducted)</span>
                          <span className="text-[10px] font-mono text-white">${formatAmount(session.feeAmount)}</span>
                        </div>
                        <div className="border-t border-neutral-900 pt-2 flex justify-between items-center">
                          <span className="text-[10px] font-mono text-neutral-400 font-bold">Merchant receives</span>
                          <span className="text-[10px] font-mono text-emerald-400 font-bold">${formatAmount(session.merchantAmount)}</span>
                        </div>
                      </>
                    )}

                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono text-neutral-500">To</span>
                      <span className="text-[10px] font-mono text-white truncate max-w-[140px]">{session.merchantWalletAddress}</span>
                    </div>
                    {buyerEmail && (
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono text-neutral-500">Email</span>
                        <span className="text-[10px] font-mono text-white">{buyerEmail}</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handlePay}
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white text-xs font-bold rounded transition-colors shadow-md flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <span>Pay ${formatAmount(session.amount)}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </motion.div>
              )}

              {/* STEP: PAY (Processing) */}
              {step === "pay" && (
                <motion.div
                  key="pay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center py-10 space-y-5"
                >
                  <div className="relative flex items-center justify-center">
                    <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin" />
                    <Wallet className="w-4.5 h-4.5 text-white absolute" />
                  </div>
                  <div className="text-center">
                    <h4 className="font-bold text-white text-[12px] uppercase font-mono tracking-wider">
                      Sign in Wallet
                    </h4>
                    <p className="text-[9px] text-neutral-500 mt-1.5 font-mono max-w-[240px] mx-auto leading-relaxed">
                      Please confirm the transaction in your wallet...
                    </p>
                  </div>
                </motion.div>
              )}

              {/* STEP: PROCESSING */}
              {step === "processing" && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center py-10 space-y-5"
                >
                  <div className="relative flex items-center justify-center">
                    <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin" />
                    <ShieldCheck className="w-4.5 h-4.5 text-white absolute" />
                  </div>
                  <div className="text-center">
                    <h4 className="font-bold text-white text-[12px] uppercase font-mono tracking-wider">
                      Confirming Payment
                    </h4>
                    <p className="text-[9px] text-neutral-500 mt-1.5 font-mono max-w-[240px] mx-auto leading-relaxed">
                      Validating transaction on {session?.network}...
                    </p>
                  </div>
                  {paymentStatus && (
                    <div className="text-[9px] font-mono text-neutral-500 text-center">
                      Status: {paymentStatus.blockchainStatus}
                      <br />
                      Confirmations: {paymentStatus.confirmations}
                      <br />
                      Retries: {paymentStatus.retryCount}
                    </div>
                  )}
                </motion.div>
              )}

              {/* STEP: SUCCESS */}
              {step === "success" && session && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center py-8 space-y-5"
                >
                  <div className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg border-2 border-emerald-500 bg-emerald-500/10 text-emerald-400 animate-pulse">
                    <ShieldCheck className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div className="text-center">
                    <h4 className="font-bold text-white text-sm uppercase font-mono tracking-wider">
                      Payment Settled!
                    </h4>
                    <p className="text-[10px] text-neutral-450 mt-2 font-mono max-w-[240px] mx-auto leading-relaxed">
                      Received ${formatAmount(session.amount)} {session.currency} on {session.network}.
                    </p>
                  </div>

                  <div className="w-full bg-neutral-950 border border-neutral-900 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-mono text-neutral-500">Tx Hash</span>
                      <div className="flex items-center gap-1">
                        <a
                          href={`${networkExplorers[session.network]}${txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                        >
                          <span className="truncate max-w-[120px]">{txHash}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <button
                          onClick={() => handleCopyAddress(txHash)}
                          className="p-1 text-neutral-500 hover:text-white rounded"
                        >
                          {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-mono text-neutral-500">From</span>
                      <span className="text-[9px] font-mono text-white truncate max-w-[140px]">{walletAddress}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-mono text-neutral-500">Fee</span>
                      <span className="text-[9px] font-mono text-white">${formatAmount(session.feeAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-mono text-neutral-500">Merchant gets</span>
                      <span className="text-[9px] font-mono text-emerald-400 font-bold">${formatAmount(session.merchantAmount)}</span>
                    </div>
                  </div>

                  <a href="/" className="px-4 py-2 bg-neutral-950 border border-neutral-900 hover:border-neutral-700 text-white rounded text-[10px] font-mono font-bold transition-all">
                    Return to Home
                  </a>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-[8px] text-neutral-600 font-mono font-semibold uppercase">
            Powered by AirPay Relayer Engine
          </p>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <SolanaWalletProviderWrapper>
      <CheckoutPageInner />
    </SolanaWalletProviderWrapper>
  )
}
