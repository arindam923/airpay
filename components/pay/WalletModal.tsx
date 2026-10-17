"use client";

import { useEffect } from "react";
import { useConnect } from "wagmi";

const walletGlyphs: Record<string, string> = {
  injected: "🦊",
  metaMask: "🦊",
  walletConnect: "🔗",
  coinbaseWallet: "🔵",
};

function connectorGlyph(id: string, name: string): string {
  return walletGlyphs[id] ?? walletGlyphs[name.toLowerCase()] ?? "👛";
}

export default function WalletModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { connect, connectors, error, isPending, reset } = useConnect();

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const usable = connectors.filter((c) => c.id !== "injected" || c.ready !== false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Connect a wallet"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[380px] rounded-[24px] border-2 border-ink bg-cream p-6 shadow-[7px_7px_0_var(--color-ink)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-sans text-[19px] font-semibold tracking-[-0.02em]">
            Connect a wallet
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-paper text-[14px] font-semibold transition-colors hover:bg-sun"
          >
            ✕
          </button>
        </div>
        <p className="mt-1.5 text-[13px] text-ink-soft">
          Testnet only — no real funds move.
        </p>

        <div className="mt-5 space-y-2.5">
          {usable.length === 0 && (
            <p className="rounded-2xl border-2 border-dashed border-ink/30 px-4 py-4 text-center text-[13px] text-ink-soft">
              No browser wallet detected. Install{" "}
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-violet hover:underline"
              >
                MetaMask
              </a>{" "}
              and reload this page.
            </p>
          )}
          {usable.map((connector) => (
            <button
              key={connector.uid}
              type="button"
              disabled={isPending}
              onClick={() => connect({ connector }, { onSuccess: onClose })}
              className="flex w-full items-center gap-3 rounded-2xl border-2 border-ink bg-paper px-4 py-3.5 text-left shadow-[3px_3px_0_var(--color-ink)] transition-all hover:-translate-y-0.5 hover:bg-sun disabled:pointer-events-none disabled:opacity-60"
            >
              <span className="text-[20px] leading-none">
                {connectorGlyph(connector.id, connector.name)}
              </span>
              <span className="flex-1 text-[14.5px] font-semibold">
                {connector.name === "Injected" ? "Browser wallet" : connector.name}
              </span>
              {isPending && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink" />
              )}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-4 rounded-xl border-2 border-coral/60 bg-coral/10 px-3 py-2 text-[12.5px] font-medium text-coral-deep">
            {error.message.includes("User rejected") || error.message.includes("rejected")
              ? "Connection request rejected."
              : error.message}
          </p>
        )}
      </div>
    </div>
  );
}
