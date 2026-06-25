"use client"

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react"

// Solana imports
import { Connection, PublicKey, Transaction, SystemProgram, clusterApiUrl } from "@solana/web3.js"
import { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { useWallet as useSolanaWallet, useConnection as useSolanaConnection, WalletProvider as SolanaWalletProvider } from "@solana/wallet-adapter-react"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets"

// EVM imports
import { createPublicClient, createWalletClient, http, parseUnits, encodeFunctionData } from "viem"
import { mainnet, arbitrum, polygon } from "viem/chains"

import "@solana/wallet-adapter-react-ui/styles.css"

const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.mainnet-beta.solana.com"
const EVM_RPC = {
  Ethereum: process.env.NEXT_PUBLIC_ETH_RPC || "https://eth.llamarpc.com",
  Arbitrum: process.env.NEXT_PUBLIC_ARB_RPC || "https://arb1.arbitrum.io/rpc",
  Polygon: process.env.NEXT_PUBLIC_POLYGON_RPC || "https://polygon.llamarpc.com",
}

// ERC20 ABI for transfer function
const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const

// Token addresses (mainnet)
const TOKEN_ADDRESSES: Record<string, Record<string, string>> = {
  Solana: {
    USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    EURC: "",
  },
  Ethereum: {
    USDC: "0xA0b86a33E6441e3C2BE68c5e0c48b3D3e7E6f9C2",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    EURC: "0x1aBaEA1f7C830bD89Acc67e4b8E4D8d6E4c5e4E7",
  },
  Arbitrum: {
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1c0b69FCbb9",
    EURC: "0x1aBaEA1f7C830bD89Acc67e4b8E4D8d6E4c5e4E7",
  },
  Polygon: {
    USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    EURC: "0x1aBaEA1f7C830bD89Acc67e4b8E4D8d6E4c5e4E7",
  },
}

type NetworkType = "Solana" | "Ethereum" | "Arbitrum" | "Polygon"

type WalletType = "solana" | "evm"

interface TransactionResult {
  txHash: string
  feeTxHash?: string
}

interface UnifiedWalletContextType {
  // Connection state
  connected: boolean
  connecting: boolean
  walletAddress: string | null
  walletType: WalletType | null
  network: NetworkType | null

  // Actions
  connect: (network: NetworkType) => void
  disconnect: () => void
  sendTransaction: (params: TransactionParams) => Promise<TransactionResult>
}

interface TransactionParams {
  network: NetworkType
  currency: string
  merchantWallet: string
  companyWallet: string
  merchantAmount: number
  feeAmount: number
}

const UnifiedWalletContext = createContext<UnifiedWalletContextType>({
  connected: false,
  connecting: false,
  walletAddress: null,
  walletType: null,
  network: null,
  connect: () => {},
  disconnect: () => {},
  sendTransaction: async () => ({ txHash: "" }),
})

export function useUnifiedWallet() {
  return useContext(UnifiedWalletContext)
}

// Solana connection
const solanaConnection = new Connection(SOLANA_RPC, "confirmed")

// EVM clients
function getEvmClient(network: NetworkType) {
  if (network === "Solana") throw new Error("Cannot create EVM client for Solana")
  const rpc = EVM_RPC[network] || EVM_RPC.Ethereum
  const chain = network === "Arbitrum" ? arbitrum : network === "Polygon" ? polygon : mainnet

  return createPublicClient({
    chain,
    transport: http(rpc),
  })
}

function getEvmWalletClient(network: NetworkType) {
  if (network === "Solana") throw new Error("Cannot create EVM client for Solana")
  const rpc = EVM_RPC[network] || EVM_RPC.Ethereum
  const chain = network === "Arbitrum" ? arbitrum : network === "Polygon" ? polygon : mainnet

  return createWalletClient({
    chain,
    transport: http(rpc),
  })
}

// EVM Wallet State (managed outside of wagmi for simplicity)
let evmWalletState = {
  address: null as string | null,
  connected: false,
  network: null as NetworkType | null,
}

export function UnifiedWalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState({
    connected: false,
    connecting: false,
    walletAddress: null as string | null,
    walletType: null as WalletType | null,
    network: null as NetworkType | null,
  })

  // Solana wallet hooks
  const solanaWallet = useSolanaWallet()
  const solanaConnection = useSolanaConnection()

  // Check if Solana is connected
  useEffect(() => {
    if (solanaWallet.connected && solanaWallet.publicKey) {
      setState((prev) => ({
        ...prev,
        connected: true,
        walletAddress: solanaWallet.publicKey?.toString() || null,
        walletType: "solana",
        network: "Solana",
      }))
    } else if (state.walletType === "solana" && !solanaWallet.connected) {
      setState((prev) => ({
        ...prev,
        connected: false,
        walletAddress: null,
        walletType: null,
        network: null,
      }))
    }
  }, [solanaWallet.connected, solanaWallet.publicKey])

  // Check EVM connection (MetaMask)
  const checkEvmConnection = useCallback(async (network: NetworkType) => {
    if (typeof window === "undefined" || !window.ethereum) return false

    try {
      const accounts = await window.ethereum.request({ method: "eth_accounts" })
      if (accounts && accounts.length > 0) {
        evmWalletState = {
          address: accounts[0],
          connected: true,
          network,
        }
        setState({
          connected: true,
          connecting: false,
          walletAddress: accounts[0],
          walletType: "evm",
          network,
        })
        return true
      }
    } catch (err) {
      console.error("EVM connection check failed:", err)
    }
    return false
  }, [])

  const connect = useCallback(
    async (network: NetworkType) => {
      setState((prev) => ({ ...prev, connecting: true }))

      if (network === "Solana") {
        // Solana wallet connect handled by adapter
        // The modal will show
        return
      }

      // EVM connection
      if (typeof window === "undefined" || !window.ethereum) {
        alert("Please install MetaMask or another EVM wallet")
        setState((prev) => ({ ...prev, connecting: false }))
        return
      }

      try {
        // Switch to correct network
        const chainId =
          network === "Arbitrum" ? "0xa4b1" : network === "Polygon" ? "0x89" : "0x1"

        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId }],
          })
        } catch (switchError: any) {
          // If network not added, user needs to add it manually
          console.error("Failed to switch network:", switchError)
        }

        // Request accounts
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        })

        if (accounts && accounts.length > 0) {
          evmWalletState = {
            address: accounts[0],
            connected: true,
            network,
          }
          setState({
            connected: true,
            connecting: false,
            walletAddress: accounts[0],
            walletType: "evm",
            network,
          })
        }
      } catch (err) {
        console.error("EVM connection failed:", err)
        setState((prev) => ({ ...prev, connecting: false }))
      }
    },
    [checkEvmConnection]
  )

  const disconnect = useCallback(() => {
    if (state.walletType === "solana") {
      solanaWallet.disconnect()
    } else {
      // EVM disconnect - just clear state
      evmWalletState = { address: null, connected: false, network: null }
    }
    setState({
      connected: false,
      connecting: false,
      walletAddress: null,
      walletType: null,
      network: null,
    })
  }, [state.walletType, solanaWallet.disconnect])

  const sendTransaction = useCallback(
    async (params: TransactionParams): Promise<TransactionResult> => {
      if (params.network === "Solana") {
        return sendSolanaTransaction(params)
      } else {
        return sendEvmTransaction(params)
      }
    },
    []
  )

  // Send Solana transaction
  const sendSolanaTransaction = async (params: TransactionParams): Promise<TransactionResult> => {
    if (!solanaWallet.publicKey || !solanaWallet.signTransaction) {
      throw new Error("Solana wallet not connected")
    }

    const mint = new PublicKey(TOKEN_ADDRESSES.Solana[params.currency] || TOKEN_ADDRESSES.Solana.USDC)
    const merchantWallet = new PublicKey(params.merchantWallet)
    const companyWallet = new PublicKey(params.companyWallet)
    const sender = solanaWallet.publicKey

    // Get token accounts
    const senderTokenAccount = await getAssociatedTokenAddress(mint, sender)
    const merchantTokenAccount = await getAssociatedTokenAddress(mint, merchantWallet)
    const companyTokenAccount = await getAssociatedTokenAddress(mint, companyWallet)

    const transaction = new Transaction()

    // Merchant transfer
    const merchantAmount = Math.round(params.merchantAmount * 1000000 / 100)
    transaction.add(
      createTransferInstruction(senderTokenAccount, merchantTokenAccount, sender, merchantAmount)
    )

    // Fee transfer
    const feeAmount = Math.round(params.feeAmount * 1000000 / 100)
    transaction.add(
      createTransferInstruction(senderTokenAccount, companyTokenAccount, sender, feeAmount)
    )

    const signed = await solanaWallet.signTransaction(transaction)
    const signature = await solanaConnection.connection.sendRawTransaction(signed.serialize())

    return { txHash: signature }
  }

  // Send EVM transaction
  const sendEvmTransaction = async (params: TransactionParams): Promise<TransactionResult> => {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("No EVM wallet found")
    }

    const tokenAddress = TOKEN_ADDRESSES[params.network]?.[params.currency]
    if (!tokenAddress) {
      throw new Error(`Token ${params.currency} not supported on ${params.network}`)
    }

    const merchantAmount = parseUnits((params.merchantAmount / 100).toString(), 6)
    const feeAmount = parseUnits((params.feeAmount / 100).toString(), 6)

    const accounts = await window.ethereum.request({ method: "eth_accounts" })
    const from = accounts[0]

    if (!from) {
      throw new Error("No EVM account connected")
    }

    // Encode transfer data for merchant
    const merchantData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [params.merchantWallet as `0x${string}`, merchantAmount],
    })

    // Encode transfer data for company
    const companyData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [params.companyWallet as `0x${string}`, feeAmount],
    })

    // Send both transactions (for simplicity, we'll do them sequentially)
    // In production, you might want to batch them or use a multi-call contract
    const merchantTx = await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [
        {
          from,
          to: tokenAddress,
          data: merchantData,
        },
      ],
    })

    // Wait for merchant tx to be mined
    await new Promise((resolve) => setTimeout(resolve, 3000))

    const feeTx = await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [
        {
          from,
          to: tokenAddress,
          data: companyData,
        },
      ],
    })

    return { txHash: merchantTx, feeTxHash: feeTx }
  }

  return (
    <UnifiedWalletContext.Provider
      value={{
        connected: state.connected,
        connecting: state.connecting,
        walletAddress: state.walletAddress,
        walletType: state.walletType,
        network: state.network,
        connect,
        disconnect,
        sendTransaction,
      }}
    >
      {children}
    </UnifiedWalletContext.Provider>
  )
}

// Solana wallet provider wrapper
export function SolanaWalletProviderWrapper({ children }: { children: ReactNode }) {
  const wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()]

  return (
    <SolanaWalletProvider wallets={wallets} autoConnect>
      <WalletModalProvider>
        {children}
      </WalletModalProvider>
    </SolanaWalletProvider>
  )
}

// Extend window type for Ethereum
declare global {
  interface Window {
    ethereum?: any
  }
}
