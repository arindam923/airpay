"use client";

import {
  CHAINS,
  COIN_META,
  amountChips,
  coinsForChain,
  formatCoinAmount,
  formatUsd,
  type CheckoutConfig,
} from "./config";

const chipBase =
  "inline-flex items-center gap-1.5 rounded-full border-2 px-3.5 py-1.5 text-[13px] font-medium transition-all";

export function NetworkPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (chain: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[13px] font-medium text-ink-soft">Network</p>
        <span className="rounded-full border border-ink/25 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-ink-soft">
          Testnet
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {CHAINS.map((c) => {
          const selected = value === c.name;
          return (
            <button
              key={c.name}
              type="button"
              onClick={() => onChange(c.name)}
              aria-pressed={selected}
              className={`${chipBase} ${
                selected
                  ? "border-ink bg-sun shadow-[3px_3px_0_var(--color-ink)]"
                  : "border-ink/20 bg-cream hover:border-ink/50"
              }`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: c.color }}
              />
              {c.name}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[12px] text-ink-soft">
        Live testnet payments · Solana &amp; Bitcoin coming soon
      </p>
    </div>
  );
}

export function CoinPicker({
  chain,
  value,
  onChange,
}: {
  chain: string;
  value: string;
  onChange: (coin: string) => void;
}) {
  const coins = coinsForChain(chain);
  return (
    <div>
      <p className="mb-2 text-[13px] font-medium text-ink-soft">Coin</p>
      <div className="flex flex-wrap gap-2">
        {coins.map((symbol) => {
          const selected = value === symbol;
          const meta = COIN_META[symbol] ?? COIN_META.USDC;
          return (
            <button
              key={symbol}
              type="button"
              onClick={() => onChange(symbol)}
              aria-pressed={selected}
              className={`${chipBase} ${
                selected
                  ? "border-ink bg-cream shadow-[3px_3px_0_var(--color-ink)]"
                  : "border-ink/20 bg-cream hover:border-ink/50"
              }`}
            >
              <span
                className="flex h-[18px] w-[18px] items-center justify-center rounded-full text-[9px] font-bold text-white"
                style={{ backgroundColor: meta.color }}
              >
                {symbol[0]}
              </span>
              {symbol}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AmountBlock({
  cfg,
  text,
  onTextChange,
  coin,
  error,
}: {
  cfg: CheckoutConfig;
  text: string;
  onTextChange: (v: string) => void;
  coin: string;
  error: string | null;
}) {
  if (cfg.mode === "fixed") {
    return (
      <div className="rounded-2xl border-2 border-ink bg-paper px-5 py-4">
        <p className="text-[12.5px] text-ink-soft">Amount due</p>
        <div className="mt-1.5 flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
          <p className="text-[32px] font-semibold leading-none tracking-[-0.02em]">
            {formatUsd(cfg.amount)}
          </p>
          <p className="pb-0.5 text-[13px] font-medium text-ink-soft">
            ≈ {formatCoinAmount(cfg.amount, coin)} {coin}
          </p>
        </div>
      </div>
    );
  }

  const parsed = parseFloat(text);
  const valid = Number.isFinite(parsed) && parsed > 0 && error == null;
  const chips = amountChips(cfg);

  return (
    <div className="rounded-2xl border-2 border-ink bg-paper px-5 py-4">
      <label htmlFor="pay-amount" className="text-[12.5px] text-ink-soft">
        Amount to pay
      </label>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-[26px] font-semibold leading-none">$</span>
        <input
          id="pay-amount"
          inputMode="decimal"
          autoComplete="off"
          value={text}
          onChange={(e) => onTextChange(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder={(cfg.amount > 0 ? String(cfg.amount) : "0").replace(
            /\.0+$/,
            ""
          )}
          className="w-full min-w-0 bg-transparent text-[30px] font-semibold leading-none tracking-[-0.02em] outline-none placeholder:text-ink/25"
        />
      </div>

      <div className="mt-3.5 flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onTextChange(String(c))}
            className={`inline-flex rounded-full border-2 px-3 py-1 text-[12.5px] font-semibold transition-all ${
              parsed === c
                ? "border-ink bg-sun shadow-[2px_2px_0_var(--color-ink)]"
                : "border-ink/25 bg-cream hover:border-ink/60"
            }`}
          >
            {formatUsd(c)}
          </button>
        ))}
      </div>

      <p className="mt-3 text-[12.5px] text-ink-soft">
        {cfg.max != null
          ? `Pay what you like — between ${formatUsd(cfg.min)} and ${formatUsd(cfg.max)}`
          : `Pay what you like — minimum ${formatUsd(cfg.min)}`}
        {cfg.amount >= cfg.min && (cfg.max == null || cfg.amount <= cfg.max)
          ? ` · suggested ${formatUsd(cfg.amount)}`
          : ""}
      </p>

      {error && (
        <p className="mt-1.5 text-[12.5px] font-semibold text-coral-deep">{error}</p>
      )}

      {valid && (
        <p className="mt-1.5 text-[13px] font-medium text-ink">
          ≈ {formatCoinAmount(parsed, coin)} {coin}
        </p>
      )}
    </div>
  );
}
