"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { parseAbi, type Hex } from "viem";
import {
  useAccount,
  useBalance,
  useDisconnect,
  usePublicClient,
  useReadContract,
  useSendTransaction,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { AmountBlock, CoinPicker, NetworkPicker } from "./Pickers";
import WalletModal from "./WalletModal";
import Confetti from "./Confetti";
import {
  coinsForChain,
  demoConfig,
  formatCoinAmount,
  formatUsd,
  parseCheckoutConfig,
  paymentUri,
  type CheckoutConfig,
} from "./config";
import { testnetByName, testnetByKey } from "@/lib/chains";
import {
  DEFAULT_APPEARANCE,
  appearanceToCssVars,
  logoShapeClass,
  safeBackgroundImage,
  type CheckoutAppearance,
} from "@/lib/checkout-appearance";
import type { PublicLink } from "@/lib/links";
import { usdToUnits } from "@/lib/amounts";
import { friendlyTxError } from "@/lib/errors";
import { preflightPayment } from "@/lib/preflight";
import { SETTLEMENT_ABI, refFor } from "@/lib/settlement/abi";
import type { PublicIntent, PublicInvoiceDetail } from "@/lib/api-types";
import { copyText, shortWallet } from "@/components/dashboard/utils";
import { orpcClient } from "@/lib/orpc/client";

const ERC20_ABI = parseAbi([
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
]);

type Phase = "loading" | "checkout" | "processing" | "success" | "invalid";
type Method = "wallet" | "qr";

interface Receipt {
  amount: number;
  coin: string;
  chain: string;
  merchant: string;
  title: string;
  tx: string;
  explorer: string | null;
  time: string;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function isHash(v: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(v.trim());
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Brand({
  showBranding,
  brandName,
  logoUrl,
}: {
  showBranding: boolean;
  brandName: string;
  logoUrl: string;
}) {
  return (
    <header className="mx-auto flex w-full max-w-[var(--co-width)] items-center justify-between px-5 pt-7">
      {showBranding ? (
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md border-[length:var(--co-bw)] border-ink bg-violet font-sans text-[13px] font-semibold text-[var(--co-accent-text)] shadow-[var(--co-shadow-sm)]">
            A
          </span>
          <span className="font-sans text-[15px] font-semibold tracking-[-0.01em]">
            AirPay
          </span>
        </Link>
      ) : (
        <span className="flex items-center gap-2">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-7 w-7 rounded-md object-cover" />
          )}
          <span className="font-sans text-[15px] font-semibold tracking-[-0.01em]">
            {brandName || "Checkout"}
          </span>
        </span>
      )}
      <span className="flex items-center gap-1.5 text-[12px] font-medium text-ink-soft">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <rect x="2" y="5" width="8" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
          <path d="M4 5V3.5a2 2 0 014 0V5" stroke="currentColor" strokeWidth="1.4" />
        </svg>
        Secure checkout
      </span>
    </header>
  );
}

function InvoiceBreakdown({ invoice }: { invoice: PublicInvoiceDetail }) {
  return (
    <div className="mt-5 rounded-2xl border-[length:var(--co-bw)] border-dashed border-ink/30 px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-ink-soft">
          Invoice {invoice.number}
        </span>
        {invoice.dueAt != null && (
          <span className="text-[11.5px] text-ink-soft">
            Due{" "}
            {new Date(invoice.dueAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        )}
      </div>

      <div className="mt-2.5 space-y-1.5">
        {invoice.items.map((it) => (
          <div key={it.id} className="flex items-baseline justify-between gap-4 text-[13px]">
            <span className="min-w-0 flex-1 truncate text-ink">
              <span className="text-ink-soft">×{it.quantity} </span>
              {it.description}
            </span>
            <span className="shrink-0 font-medium">{formatUsd(it.amountUsd)}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 space-y-1 border-t border-ink/15 pt-2.5 text-[13px]">
        <div className="flex items-center justify-between">
          <span className="text-ink-soft">Subtotal</span>
          <span className="font-medium">{formatUsd(invoice.subtotalUsd)}</span>
        </div>
        {invoice.taxUsd > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-ink-soft">Tax</span>
            <span className="font-medium">{formatUsd(invoice.taxUsd)}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-1 text-[15px] font-semibold">
          <span>Total due</span>
          <span>{formatUsd(invoice.totalUsd)}</span>
        </div>
      </div>
    </div>
  );
}

function Skeleton({ style }: { style?: CSSProperties }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-5" style={style}>
      <div className="w-full max-w-[var(--co-width)] animate-pulse rounded-[var(--co-radius)] border-[length:var(--co-bw)] border-ink bg-cream p-6 shadow-[var(--co-shadow)]">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-ink/10" />
          <div className="flex-1">
            <div className="h-3.5 w-32 rounded bg-ink/10" />
            <div className="mt-2 h-3 w-48 rounded bg-ink/10" />
          </div>
        </div>
        <div className="mt-6 h-24 rounded-2xl bg-ink/10" />
        <div className="mt-5 h-9 w-full rounded-full bg-ink/10" />
        <div className="mt-3 h-9 w-full rounded-full bg-ink/10" />
        <div className="mt-6 h-12 w-full rounded-full bg-ink/10" />
      </div>
    </div>
  );
}

async function createIntentApi(
  cfg: CheckoutConfig,
  amount: number,
  chain: string,
  coin: string,
  invoiceId?: string | null,
): Promise<PublicIntent> {
  const res = await fetch("/api/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug: cfg.slug,
      title: cfg.title,
      merchant: cfg.merchant,
      mode: cfg.mode,
      amount,
      min: cfg.min,
      max: cfg.max,
      chain,
      coin,
      invoiceId: invoiceId ?? null,
    }),
  });
  const data = (await res.json()) as { intent?: PublicIntent; error?: string };
  if (!res.ok || !data.intent) throw new Error(data.error ?? "Could not create payment intent.");
  return data.intent;
}

async function submitTxApi(intentId: string, txHash: string, payer?: string): Promise<PublicIntent> {
  const res = await fetch(`/api/payments/${intentId}/submitted`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ txHash, payer }),
  });
  const data = (await res.json()) as { intent?: PublicIntent; error?: string };
  if (!res.ok || !data.intent) throw new Error(data.error ?? "Could not record transaction.");
  return data.intent;
}

async function getIntentApi(intentId: string): Promise<PublicIntent | null> {
  const res = await fetch(`/api/payments/${intentId}`);
  if (!res.ok) return null;
  const data = (await res.json()) as { intent?: PublicIntent };
  return data.intent ?? null;
}

/** Content equality for volatile fields — keeps poll results from churning state refs. */
function sameIntent(a: PublicIntent | null, b: PublicIntent): boolean {
  if (!a) return false;
  return (
    a.status === b.status &&
    a.txHash === b.txHash &&
    a.confirmations === b.confirmations &&
    a.payer === b.payer &&
    a.error === b.error &&
    a.confirmedAt === b.confirmedAt &&
    a.explorerTx === b.explorerTx &&
    a.expiresAt === b.expiresAt
  );
}

export default function HostedCheckout({
  receiver,
  link = null,
  invoice = null,
  invoiceId = null,
  appearance = null,
  settlementContract = null,
  initialIntent = null,
  successUrl = null,
}: {
  receiver: string;
  link?: PublicLink | null;
  invoice?: PublicInvoiceDetail | null;
  invoiceId?: string | null;
  appearance?: CheckoutAppearance | null;
  /** Settlement contract for this chain, when payments route through it. */
  settlementContract?: string | null;
  /** Pre-created intent (hosted checkout session): skip on-demand creation. */
  initialIntent?: PublicIntent | null;
  successUrl?: string | null;
  cancelUrl?: string | null;
}) {
  const look = appearance ?? DEFAULT_APPEARANCE;
  // Settlement payments must be sent via a contract call (payNative/payToken),
  // which a QR code can't express — so the QR method is not offered.
  const settlementMode = !!settlementContract;
  const availableMethods: Method[] = settlementMode
    ? ["wallet"]
    : look.methods.length
      ? look.methods
      : ["wallet"];
  const [phase, setPhase] = useState<Phase>("loading");
  const [cfg, setCfg] = useState<CheckoutConfig | null>(null);
  const [amountText, setAmountText] = useState("");
  const [chain, setChain] = useState("");
  const [coin, setCoin] = useState("");
  const [method, setMethod] = useState<Method>(availableMethods[0]);
  const [intent, setIntent] = useState<PublicIntent | null>(null);
  const [qrHash, setQrHash] = useState("");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [copied, setCopied] = useState(false);

  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const net = testnetByName(chain);
  const wrongNetwork = isConnected && net != null && chainId !== net.chainId;

  const bgImage = safeBackgroundImage(look.backgroundImage);
  const rootStyle = {
    ...appearanceToCssVars(look),
    ...(bgImage ? { backgroundImage: bgImage } : {}),
  } as CSSProperties;
  const brandLabel = look.brandName || (cfg?.merchant ?? "");

  // When the checkout is driven by a stored link, only offer the pairs the
  // merchant enabled during onboarding.
  const allowedChainNames = link
    ? Object.keys(link.allowed).map((k) => testnetByKey(k)?.name ?? k)
    : undefined;
  const allowedCoinsFor = (chainName: string): string[] | undefined => {
    if (!link) return undefined;
    const key = testnetByName(chainName)?.key;
    return key ? link.allowed[key] : undefined;
  };

  const liveAmount = cfg ? (cfg.mode === "fixed" ? cfg.amount : parseFloat(amountText)) : NaN;
  let needUnits = 0n;
  if (coin && Number.isFinite(liveAmount) && liveAmount > 0) {
    try {
      needUnits = usdToUnits(liveAmount, coin);
    } catch {
      needUnits = 0n;
    }
  }

  const { data: ethBal } = useBalance({
    address,
    chainId: net?.chainId,
    query: { enabled: !!address && coin === "ETH" && !!net },
  });
  const { data: usdcBal } = useReadContract({
    address: net?.usdc,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: net?.chainId,
    query: { enabled: !!address && coin === "USDC" && !!net },
  });

  const balanceUnits: bigint | undefined = coin === "ETH" ? ethBal?.value : (usdcBal as bigint | undefined);
  const insufficient = balanceUnits != null && needUnits > 0n && balanceUnits < needUnits;

  useEffect(() => {
    if (link) {
      const parsed: CheckoutConfig = {
        slug: link.slug,
        title: link.title,
        merchant: link.merchant,
        mode: link.mode,
        amount: link.amountUsd,
        min: link.min,
        max: link.max,
        chain: link.chainName,
        coin: link.coin,
      };
      queueMicrotask(() => {
        setCfg(parsed);
        setAmountText(
          parsed.mode === "flex" && parsed.amount > 0 ? String(parsed.amount) : ""
        );
        setChain(parsed.chain);
        setCoin(parsed.coin);
        setPhase("checkout");
      });
      return;
    }
    // Hosted checkout sessions supply a pre-created intent; never fall back to
    // query-string/demo parsing in that case.
    if (initialIntent) return;
    const search = window.location.search;
    const parts = window.location.pathname.split("/").filter(Boolean);
    const slug = parts.length > 0 && parts[parts.length - 1] !== "pay" ? parts[parts.length - 1] : "";
    const parsed =
      search.length > 1
        ? parseCheckoutConfig(window.location.pathname, search)
        : demoConfig(slug);
    queueMicrotask(() => {
      if (!parsed) {
        setPhase("invalid");
        return;
      }
      setCfg(parsed);
      setAmountText(
        parsed.mode === "flex" && parsed.amount > 0 ? String(parsed.amount) : ""
      );
      setChain(parsed.chain);
      setCoin(parsed.coin);
      setPhase("checkout");
    });
  }, [link, initialIntent]);

  // Initialise straight from a pre-created checkout-session intent.
  useEffect(() => {
    if (!initialIntent) return;
    const parsed: CheckoutConfig = {
      slug: "checkout",
      title: initialIntent.title,
      merchant: initialIntent.merchant,
      mode: "fixed",
      amount: initialIntent.amountUsd,
      min: 0,
      max: null,
      chain: initialIntent.chainName,
      coin: initialIntent.token,
    };
    queueMicrotask(() => {
      setCfg(parsed);
      setAmountText("");
      setChain(parsed.chain);
      setCoin(parsed.coin);
      setIntent(initialIntent);
      setPhase("checkout");
    });
  }, [initialIntent]);

  // Return the payer to the merchant's success URL once the payment confirms.
  useEffect(() => {
    if (phase !== "success" || !successUrl) return;
    try {
      const target = new URL(successUrl, window.location.origin);
      if (intent) target.searchParams.set("payment_intent", intent.id);
      window.location.assign(target.toString());
    } catch {
      // Ignore malformed URLs — the inline receipt remains visible.
    }
  }, [phase, successUrl, intent]);

  // Mark a sent invoice as viewed the first time its checkout page loads.
  useEffect(() => {
    if (!invoice || invoice.status !== "sent") return;
    void Promise.resolve(
      orpcClient.invoices.markViewed({ slug: invoice.slug }),
    ).catch(() => {});
  }, [invoice]);

  // Poll while a QR intent is waiting for an (auto-detected) transaction.
  useEffect(() => {
    if (!intent || intent.status !== "awaiting_payment" || phase === "processing") return;
    let stopped = false;
    let busy = false;
    const poll = async () => {
      if (busy) return;
      busy = true;
      try {
        const fresh = await getIntentApi(intent.id);
        if (stopped || !fresh) return;
        setIntent((prev) => (sameIntent(prev, fresh) ? prev : fresh));
        if (fresh.status === "submitted" || fresh.status === "confirming" || fresh.status === "confirmed") {
          setPhase("processing");
        } else if (fresh.status === "expired") {
          setIntent(null);
          setPayError("Payment window expired. Try again.");
        }
      } finally {
        busy = false;
      }
    };
    const timer = window.setInterval(() => void poll(), 2000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [intent, phase]);

  // Poll status while processing.
  useEffect(() => {
    if (phase !== "processing" || !intent) return;
    let stopped = false;
    let busy = false;
    const poll = async () => {
      if (busy) return;
      busy = true;
      try {
        const fresh = await getIntentApi(intent.id);
        if (stopped || !fresh) return;
        setIntent((prev) => (sameIntent(prev, fresh) ? prev : fresh));
        if (fresh.status === "confirmed") {
          setReceipt({
            amount: fresh.amountUsd,
            coin: fresh.token,
            chain: fresh.chainName,
            merchant: fresh.merchant,
            title: fresh.title,
            tx: fresh.txHash ?? "",
            explorer: fresh.explorerTx,
            time: formatTime(fresh.confirmedAt ?? Date.now()),
          });
          setPhase("success");
        } else if (fresh.status === "failed" || fresh.status === "expired") {
          setIntent(null);
          setPhase("checkout");
          setPayError(fresh.error ?? "Payment could not be verified.");
        }
      } finally {
        busy = false;
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 1500);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [phase, intent]);

  if (phase === "loading") return <Skeleton style={rootStyle} />;

  if (phase === "invalid" || !cfg) {
    return (
      <div className="flex min-h-screen flex-col bg-paper text-ink" style={rootStyle}>
        <Brand
          showBranding={look.showBranding}
          brandName={look.brandName}
          logoUrl={look.logoUrl}
        />
        <main className="mx-auto flex w-full max-w-[460px] flex-1 items-center px-5 py-10">
          <div className="w-full rounded-[var(--co-radius)] border-[length:var(--co-bw)] border-ink bg-cream p-7 text-center shadow-[var(--co-shadow)]">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-[length:var(--co-bw)] border-ink bg-coral">
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
                <path d="M10 5.5v5M10 14h.01" stroke="#191410" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </span>
            <h1 className="mt-5 font-sans text-[24px] font-semibold tracking-[-0.02em]">
              This link isn&apos;t valid
            </h1>
            <p className="mx-auto mt-3 max-w-[34ch] text-[14.5px] leading-[1.55] text-ink-soft">
              The payment link is incomplete or has expired. Ask the merchant to
              send you a fresh link.
            </p>
            <Link
              href="/"
              className="mt-7 inline-flex h-12 items-center justify-center rounded-[var(--co-btn-radius)] border-[length:var(--co-bw)] border-ink bg-cream px-7 text-[14.5px] font-semibold shadow-[var(--co-shadow-sm)] transition-all hover:-translate-y-0.5 hover:bg-sun hover:text-[#191410]"
            >
              Go to AirPay
            </Link>
          </div>
        </main>
        {look.showBranding && (
          <footer className="pb-7 text-center text-[12.5px] text-ink-soft">
            Powered by{" "}
            <Link href="/" className="font-semibold text-violet hover:underline">
              AirPay
            </Link>
          </footer>
        )}
      </div>
    );
  }

  const amountNum = liveAmount;

  const amountError: string | null =
    cfg.mode === "flex"
      ? amountText.trim() === ""
        ? null
        : !Number.isFinite(amountNum) || amountNum <= 0
          ? "Enter a valid amount"
          : amountNum < cfg.min
            ? `Minimum is ${formatUsd(cfg.min)}`
            : cfg.max != null && amountNum > cfg.max
              ? `Maximum is ${formatUsd(cfg.max)}`
              : null
      : null;

  const amountReady =
    cfg.mode === "fixed"
      ? cfg.amount > 0
      : amountText.trim() !== "" &&
        Number.isFinite(amountNum) &&
        amountNum > 0 &&
        amountError == null;

  const receiverReady = /^0x[0-9a-fA-F]{40}$/.test(receiver);

  // A QR intent becomes stale if the payer edits amount/network/coin after
  // starting it — a fresh intent is created on the next click instead.
  const qrIntentStale =
    intent != null &&
    intent.status === "awaiting_payment" &&
    (intent.amountUsd !== liveAmount ||
      intent.chainName !== chain ||
      intent.token !== coin);
  const activeQrIntent = qrIntentStale ? null : intent;

  const payWithWallet = async () => {
    if (!address || !net) return;
    setPayError(null);
    if (chainId !== net.chainId) {
      try {
        await switchChainAsync({ chainId: net.chainId });
      } catch {
        setPayError(`Please switch your wallet to ${net.name} testnet.`);
        return;
      }
    }
    setPaying(true);
    try {
      // Create the intent first: the settlement destination (contract +
      // merchantId) is only known once the server resolves the merchant.
      const created = initialIntent ?? (await createIntentApi(cfg, amountNum, chain, coin, invoiceId));
      const units = BigInt(created.expectedUnits);
      const merchantId = created.merchantId as Hex | null;
      const settlement = merchantId ? { merchantId, ref: refFor(created.id) } : null;

      // Pre-flight: verify balance + gas + on-chain simulation BEFORE the
      // wallet opens, so MetaMask never shows "failed to simulate".
      const pf = await preflightPayment({
        net,
        account: address,
        receiver: created.receiver as `0x${string}`,
        token: coin === "ETH" ? "ETH" : "USDC",
        units,
        settlement,
      });
      if (!pf.ok) {
        setPayError(pf.error);
        return;
      }

      let hash: `0x${string}`;
      if (settlement && coin === "ETH") {
        hash = await writeContractAsync({
          chainId: net.chainId,
          address: created.receiver as `0x${string}`,
          abi: SETTLEMENT_ABI,
          functionName: "payNative",
          args: [settlement.merchantId, settlement.ref],
          value: units,
        });
      } else if (settlement) {
        // USDC: approve the settlement contract, wait for it to land, then
        // settle in a second call.
        const approveHash = await writeContractAsync({
          chainId: net.chainId,
          address: net.usdc,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [created.receiver as `0x${string}`, units],
        });
        await publicClient?.waitForTransactionReceipt({ hash: approveHash });
        hash = await writeContractAsync({
          chainId: net.chainId,
          address: created.receiver as `0x${string}`,
          abi: SETTLEMENT_ABI,
          functionName: "payToken",
          args: [settlement.merchantId, net.usdc, units, settlement.ref],
        });
      } else if (coin === "ETH") {
        hash = await sendTransactionAsync({
          chainId: net.chainId,
          to: created.receiver as `0x${string}`,
          value: units,
        });
      } else {
        hash = await writeContractAsync({
          chainId: net.chainId,
          address: net.usdc,
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [created.receiver as `0x${string}`, units],
        });
      }
      const submitted = await submitTxApi(created.id, hash, address);
      setIntent(submitted);
      setPhase("processing");
    } catch (err) {
      setPayError(friendlyTxError(err, "wallet-pay"));
    } finally {
      setPaying(false);
    }
  };

  const startQrPayment = async () => {
    if (!amountReady || !Number.isFinite(amountNum) || amountNum <= 0) return;
    setPayError(null);
    setPaying(true);
    try {
      const created = initialIntent ?? (await createIntentApi(cfg, amountNum, chain, coin, invoiceId));
      setIntent(created);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Could not start payment.");
    } finally {
      setPaying(false);
    }
  };

  const confirmQrTx = async () => {
    if (!activeQrIntent || !isHash(qrHash)) return;
    setPayError(null);
    setPaying(true);
    try {
      const submitted = await submitTxApi(activeQrIntent.id, qrHash.trim());
      setIntent(submitted);
      setPhase("processing");
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Could not record transaction.");
    } finally {
      setPaying(false);
    }
  };

  const onPrimary = () => {
    setPayError(null);
    if (method === "qr") {
      if (!activeQrIntent) {
        void startQrPayment();
        return;
      }
      void confirmQrTx();
      return;
    }
    if (!isConnected) {
      setWalletModalOpen(true);
      return;
    }
    void payWithWallet();
  };

  const doCopy = async (text: string) => {
    if (await copyText(text)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  };

  const merchantRow = (
    <div className="flex items-center gap-3">
      {look.showAvatar && (
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden border-[length:var(--co-bw)] border-ink bg-violet text-[14px] font-bold text-[var(--co-accent-text)] ${logoShapeClass(look.logoShape)}`}
        >
          {look.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={look.logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(brandLabel || cfg.merchant)
          )}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-[14.5px] font-semibold">{brandLabel || cfg.merchant}</p>
        <p className="truncate text-[13px] text-ink-soft">{cfg.title}</p>
      </div>
    </div>
  );

  const expectedCoinStr =
    amountReady && Number.isFinite(amountNum) && amountNum > 0
      ? `${formatCoinAmount(amountNum, coin)} ${coin}`
      : "—";

  const steps = [
    {
      label:
        method === "qr"
          ? intent?.txHash
            ? "Payment detected"
            : "Waiting for your transaction"
          : "Approval in your wallet",
    },
    { label: `Broadcasting to ${intent?.chainName ?? chain}` },
    { label: "Confirmation on-chain" },
  ];

  const procStep = !intent?.txHash
    ? 0
    : intent.status === "submitted" || intent.status === "confirming" || intent.status === "confirmed"
      ? 2
      : 1;

  const primaryLabel = (() => {
    if (method === "qr") {
      if (!receiverReady) return "Merchant not configured";
      if (!amountReady) return "Enter an amount to continue";
      if (paying) return null;
      return activeQrIntent ? "Confirm transaction" : "I've sent the payment";
    }
    if (!receiverReady) return "Merchant not configured";
    if (paying) return null;
    if (!isConnected) return "Connect wallet";
    if (wrongNetwork) return `Switch to ${net?.name} testnet`;
    if (!amountReady) return "Enter an amount to continue";
    if (insufficient) return `Insufficient ${coin} balance`;
    return `Pay ${formatUsd(Number.isFinite(amountNum) ? amountNum : 0)}`;
  })();

  const primaryDisabled =
    paying ||
    !receiverReady ||
    (method === "qr"
      ? !amountReady || (!!activeQrIntent && !isHash(qrHash))
      : !isConnected
        ? false
        : !amountReady || insufficient);

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink" style={rootStyle}>
      <Brand
        showBranding={look.showBranding}
        brandName={look.brandName}
        logoUrl={look.logoUrl}
      />

      <main className="mx-auto w-full max-w-[var(--co-width)] flex-1 px-5 py-6">
        {phase === "checkout" && (
          <div className="rounded-[var(--co-radius)] border-[length:var(--co-bw)] border-ink bg-cream p-6 shadow-[var(--co-shadow)]">
            {look.headline && (
              <p className="mb-3 text-[15px] font-semibold tracking-[-0.01em]">{look.headline}</p>
            )}
            {merchantRow}
            {look.subtext && (
              <p className="mt-3 text-[13px] leading-[1.5] text-ink-soft">{look.subtext}</p>
            )}

            <div className="mt-5">
              {invoice ? (
                <InvoiceBreakdown invoice={invoice} />
              ) : (
                <AmountBlock
                  cfg={cfg}
                  text={amountText}
                  onTextChange={setAmountText}
                  coin={coin}
                  error={amountError}
                />
              )}
            </div>

            <div className="mt-5 space-y-4">
              <NetworkPicker
                value={chain}
                chains={allowedChainNames}
                showTestnetBadge={look.showTestnetBadge}
                onChange={(next) => {
                  setChain(next);
                  const available = allowedCoinsFor(next) ?? coinsForChain(next);
                  if (!available.includes(coin)) setCoin(available[0]);
                }}
              />
              <CoinPicker
                chain={chain}
                value={coin}
                onChange={setCoin}
                coins={allowedCoinsFor(chain)}
              />
            </div>

            <div className="mt-5 rounded-2xl border-[length:var(--co-bw)] border-dashed border-ink/30 px-4 py-3.5 text-[13.5px]">
              <div className="flex items-center justify-between py-1">
                <span className="text-ink-soft">You pay</span>
                <span className="font-semibold">{expectedCoinStr}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-ink-soft">Network</span>
                <span className="flex items-center gap-1.5 font-medium">
                  {net?.name ?? chain}
                  {look.showTestnetBadge && (
                    <span className="rounded-full border border-ink/25 px-1.5 py-px text-[10px] font-semibold uppercase text-ink-soft">
                      testnet
                    </span>
                  )}
                </span>
              </div>
              {look.showFeeRow && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-ink-soft">Network fee</span>
                  <span className="font-semibold text-ink">
                    Gas paid in your wallet
                  </span>
                </div>
              )}
            </div>

            {!receiverReady && (
              <p className="mt-4 rounded-xl border-[length:var(--co-bw)] border-coral/60 bg-coral/10 px-3 py-2 text-[12.5px] font-medium text-coral-deep">
                Merchant address not configured. Set RECEIVER_ADDRESS in .env.local.
              </p>
            )}

            {availableMethods.length > 1 && (
              <div>
                <p className="mb-2 text-[13px] font-medium text-ink-soft">Pay with</p>
                <div className="flex gap-1 rounded-[var(--co-btn-radius)] border-[length:var(--co-bw)] border-ink bg-paper p-1">
                  {availableMethods.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMethod(value)}
                      aria-pressed={method === value}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-[var(--co-btn-radius)] px-4 py-2 text-[13.5px] font-semibold transition-all ${
                        method === value
                          ? "bg-violet text-[var(--co-accent-text)] shadow-[var(--co-shadow-sm)]"
                          : "text-ink-soft hover:text-ink"
                      }`}
                    >
                      {value === "wallet" ? (
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                          <rect x="1.5" y="3" width="11" height="8.5" rx="1.8" stroke="currentColor" strokeWidth="1.5" />
                          <path d="M9 6.75h2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                          <rect x="1.5" y="1.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
                          <rect x="8" y="1.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
                          <rect x="1.5" y="8" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
                          <path d="M8 8h2v2H8zM11 11h1.5v1.5H11z" fill="currentColor" />
                        </svg>
                      )}
                      {value === "wallet" ? "Wallet" : "QR code"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {method === "qr" && (
              <div className="mt-5 rounded-2xl border-[length:var(--co-bw)] border-ink bg-paper px-4 py-4">
                <div className="mx-auto w-fit rounded-xl border-[length:var(--co-bw)] border-ink/15 bg-white p-2.5">
                  <QRCodeSVG
                    value={
                      receiverReady
                        ? amountReady && amountNum > 0
                          ? paymentUri(chain, coin, amountNum, receiver)
                          : `ethereum:${receiver}`
                        : "https://airpay.app"
                    }
                    size={156}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#191410"
                  />
                </div>
                <p className="mt-3 flex items-center justify-center gap-1.5 text-[12.5px] font-medium text-ink-soft">
                  <span className="h-2 w-2 animate-pulse-dot rounded-full bg-coral" />
                  Scan with any wallet — or send manually below
                </p>

                <div className="mt-3.5 space-y-0.5">
                  <div className="flex items-center justify-between py-1 text-[13.5px]">
                    <span className="text-ink-soft">Amount</span>
                    <span className="font-semibold">{expectedCoinStr}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 text-[13.5px]">
                    <span className="text-ink-soft">Network</span>
                    <span className="font-medium">{net?.name ?? chain} testnet</span>
                  </div>
                  <div className="flex items-center gap-2 py-1 text-[13.5px]">
                    <span className="shrink-0 text-ink-soft">Send to</span>
                    <span className="min-w-0 flex-1 truncate text-right font-mono text-[12px]">
                      {receiver}
                    </span>
                    <button
                      type="button"
                      onClick={() => doCopy(receiver)}
                      className={`shrink-0 rounded-[var(--co-btn-radius)] border-[length:var(--co-bw)] border-ink px-2.5 py-1 text-[11px] font-semibold text-[#191410] transition-colors ${
                        copied ? "bg-mint" : "bg-sun hover:bg-sun/70"
                      }`}
                    >
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                {activeQrIntent && (
                  <div className="mt-4 border-t border-ink/15 pt-3.5">
                    <label htmlFor="qr-tx" className="text-[12.5px] font-medium text-ink-soft">
                      Paste the transaction hash after sending
                    </label>
                    <input
                      id="qr-tx"
                      value={qrHash}
                      onChange={(e) => setQrHash(e.target.value.trim())}
                      placeholder="0x…"
                      spellCheck={false}
                      autoComplete="off"
                      className="mt-1.5 w-full rounded-xl border-[length:var(--co-bw)] border-ink/25 bg-cream px-3 py-2 font-mono text-[12px] outline-none focus:border-ink"
                    />
                    <p className="mt-1.5 text-[11.5px] text-ink-soft">
                      We verify every transaction on-chain before confirming.
                    </p>
                  </div>
                )}
              </div>
            )}

            {method === "wallet" && isConnected && address && (
              <div className="mt-5 flex items-center gap-3 rounded-2xl border-[length:var(--co-bw)] border-ink bg-paper px-4 py-3">
                <span className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-violet to-sky" />
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[13px] font-medium">
                    {shortWallet(address)}
                  </p>
                  <p className="text-[11.5px] text-ink-soft">
                    {wrongNetwork
                      ? `Wrong network — switch to ${net?.name}`
                      : `Connected · ${net?.name ?? "network"} testnet`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => disconnect()}
                  className="text-[12.5px] font-semibold text-coral-deep hover:underline"
                >
                  Disconnect
                </button>
              </div>
            )}

            {payError && (
              <p className="mt-4 rounded-xl border-[length:var(--co-bw)] border-coral/60 bg-coral/10 px-3 py-2 text-[12.5px] font-medium text-coral-deep">
                {payError}
              </p>
            )}

            <button
              type="button"
              onClick={onPrimary}
              disabled={primaryDisabled}
              className="mt-1 flex h-13 w-full items-center justify-center gap-2 rounded-[var(--co-btn-radius)] bg-violet text-[15.5px] font-semibold text-[var(--co-accent-text)] shadow-[var(--co-shadow-sm)] transition-all hover:-translate-y-0.5 hover:bg-violet-deep disabled:pointer-events-none disabled:opacity-45"
            >
              {paying ? (
                <span className="h-4 w-4 animate-spin rounded-full border-[length:var(--co-bw)] border-[var(--co-accent-text)]/40 border-t-[var(--co-accent-text)]" />
              ) : (
                primaryLabel ?? "Continue"
              )}
            </button>

            <p className="mt-4 text-center text-[12px] leading-[1.5] text-ink-soft">
              {settlementMode
                ? `Testnet payment — settled on-chain via AirPay for ${cfg.merchant}. No real funds move.`
                : `Testnet payment — funds settle directly to ${cfg.merchant} on EVM testnets. No real funds move.`}
            </p>
          </div>
        )}

        {phase === "processing" && intent && (
          <div className="rounded-[var(--co-radius)] border-[length:var(--co-bw)] border-ink bg-cream p-6 shadow-[var(--co-shadow)]">
            {merchantRow}
            <p className="mt-5 text-[30px] font-semibold leading-none tracking-[-0.02em]">
              {formatUsd(intent.amountUsd)}
            </p>
            <p className="mt-1.5 text-[13.5px] text-ink-soft">
              {formatCoinAmount(intent.amountUsd, intent.token)} {intent.token} on{" "}
              {intent.chainName} testnet
            </p>

            <div className="mt-6 flex flex-col gap-0">
              {steps.map((s, i) => (
                <div key={s.label} className="flex gap-3.5">
                  <div className="flex flex-col items-center">
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[length:var(--co-bw)] border-ink text-[11px] font-bold ${
                        i < procStep
                          ? "bg-mint"
                          : i === procStep
                            ? "bg-sun"
                            : "bg-cream"
                      }`}
                    >
                      {i < procStep ? (
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M2 6.5l2.5 2.5L10 3.5"
                            stroke="#191410"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : i === procStep ? (
                        <span className="h-3 w-3 animate-spin rounded-full border-[length:var(--co-bw)] border-ink/30 border-t-ink" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-ink/30" />
                      )}
                    </span>
                    {i < 2 && (
                      <span
                        className={`w-0.5 flex-1 ${i < procStep ? "bg-mint" : "bg-ink/15"}`}
                      />
                    )}
                  </div>
                  <p
                    className={`pb-6 text-[14px] ${
                      i <= procStep ? "font-medium text-ink" : "text-ink-soft/70"
                    }`}
                  >
                    {s.label}
                    {i === 2 && intent.status === "confirming" && (
                      <span className="ml-1.5 text-ink-soft">
                        ({Math.min(intent.confirmations, intent.requiredConfirmations)}/
                        {intent.requiredConfirmations})
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>

            <p className="text-center text-[12px] text-ink-soft">
              Do not close this window.
            </p>
          </div>
        )}

        {phase === "success" && receipt && (
          <>
            <Confetti />
            <div className="animate-success-in rounded-[var(--co-radius)] border-[length:var(--co-bw)] border-ink bg-cream p-6 shadow-[var(--co-shadow)]">
            <div className="flex flex-col items-center pt-2 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full border-[length:var(--co-bw)] border-ink bg-mint shadow-[var(--co-shadow-sm)]">
                <svg width="26" height="26" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3 8.5l3.5 3.5L13 5"
                    stroke="#191410"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <h1 className="mt-4 font-sans text-[26px] font-semibold tracking-[-0.02em]">
                Payment confirmed
              </h1>
              <p className="mt-2 text-[34px] font-semibold leading-none tracking-[-0.02em]">
                {formatUsd(receipt.amount)}
              </p>
              <p className="mt-2 text-[13.5px] text-ink-soft">
                {formatCoinAmount(receipt.amount, receipt.coin)} {receipt.coin} on{" "}
                {receipt.chain} testnet
              </p>
            </div>

            <div className="mt-6 rounded-2xl border-[length:var(--co-bw)] border-ink bg-paper">
              {[
                ["Paid to", receipt.merchant],
                ["For", receipt.title],
                ["Network", `${receipt.chain} testnet`],
                ["Completed", receipt.time],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center justify-between gap-4 border-b border-ink/10 px-4 py-2.5 text-[13.5px] last:border-0"
                >
                  <span className="shrink-0 text-ink-soft">{k}</span>
                  <span className="truncate font-medium">{v}</span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 border-b border-ink/10 px-4 py-2.5">
                <span className="shrink-0 text-[13.5px] text-ink-soft">Tx hash</span>
                <span className="flex min-w-0 items-center gap-2">
                  <code className="truncate font-mono text-[11.5px]">
                    {receipt.tx}
                  </code>
                  <button
                    type="button"
                    onClick={() => doCopy(receipt.tx)}
                    className={`shrink-0 rounded-[var(--co-btn-radius)] border-[length:var(--co-bw)] border-ink px-2.5 py-1 text-[11px] font-semibold text-[#191410] transition-colors ${
                      copied ? "bg-mint" : "bg-sun hover:bg-sun/70"
                    }`}
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </span>
              </div>
            </div>

            {receipt.explorer && (
              <a
                href={receipt.explorer}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex h-11 w-full items-center justify-center rounded-[var(--co-btn-radius)] border-[length:var(--co-bw)] border-ink bg-paper text-[13.5px] font-semibold transition-colors hover:bg-sun hover:text-[#191410]"
              >
                View on block explorer ↗
              </a>
            )}

            <button
              type="button"
              onClick={() => {
                setReceipt(null);
                setIntent(null);
                setQrHash("");
                setPayError(null);
                setPhase("checkout");
              }}
              className="mt-3 h-12 w-full rounded-[var(--co-btn-radius)] border-[length:var(--co-bw)] border-ink bg-cream text-[14.5px] font-semibold shadow-[var(--co-shadow-sm)] transition-all hover:-translate-y-0.5 hover:bg-sun hover:text-[#191410]"
            >
              Make another payment
             </button>
           </div>
          </>
        )}
      </main>

      <WalletModal open={walletModalOpen} onClose={() => setWalletModalOpen(false)} />

      {look.footerNote && (
        <p className="mx-auto w-full max-w-[var(--co-width)] px-5 pb-2 text-center text-[12px] leading-[1.5] text-ink-soft">
          {look.footerNote}
        </p>
      )}

      {look.showBranding && (
        <footer className="pb-7 text-center text-[12.5px] text-ink-soft">
          Powered by{" "}
          <Link href="/" className="font-semibold text-violet hover:underline">
            AirPay
          </Link>
        </footer>
      )}
    </div>
  );
}
