"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CHAINS } from "@/components/pay/config";
import type { AccountType, CompleteOnboardingInput } from "@/lib/schemas/onboarding";
import { useOnboarding, type OnboardingState } from "./useOnboarding";

interface Invite {
  email: string;
  role: "admin" | "member";
}

const WALLET_RE = /^0x[0-9a-fA-F]{40}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const field =
  "h-10 w-full rounded-lg border border-d-edge bg-d-raised px-3.5 text-[13.5px] text-d-ink placeholder:text-d-muted/60 focus:border-d-accent focus:outline-none";

export default function OnboardingWizard() {
  const { data, isLoading, complete, isSaving } = useOnboarding();
  if (isLoading || !data) return <WizardSkeleton />;
  return <WizardBody initial={data} complete={complete} isSaving={isSaving} />;
}

function WizardSkeleton() {
  return (
    <div className="mx-auto max-w-[560px] animate-pulse rounded-2xl border border-d-edge bg-d-panel p-6">
      <div className="h-4 w-40 rounded bg-d-raised" />
      <div className="mt-3 h-3 w-64 rounded bg-d-raised" />
      <div className="mt-6 h-28 rounded-xl bg-d-raised" />
      <div className="mt-4 h-10 w-full rounded-lg bg-d-raised" />
    </div>
  );
}

function WizardBody({
  initial,
  complete,
  isSaving,
}: {
  initial: OnboardingState;
  complete: (input: CompleteOnboardingInput) => Promise<{ ok: boolean; invited: number }>;
  isSaving: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [accountType, setAccountType] = useState<AccountType>(
    initial.accountType ?? "individual",
  );
  const [invites, setInvites] = useState<Invite[]>([]);
  const [chains, setChains] = useState<string[]>(initial.enabledChains);
  const [assets, setAssets] = useState<Record<string, string[]>>(initial.enabledAssets);
  const [wallet, setWallet] = useState(initial.payoutWallet);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const toggleChain = (key: string, coins: string[]) => {
    setChains((prev) => {
      if (prev.includes(key)) {
        setAssets((a) => {
          const next = { ...a };
          delete next[key];
          return next;
        });
        return prev.filter((k) => k !== key);
      }
      setAssets((a) => ({ ...a, [key]: a[key] ?? [coins[0]] }));
      return [...prev, key];
    });
  };

  const toggleAsset = (chain: string, coin: string) => {
    setAssets((prev) => {
      const current = prev[chain] ?? [];
      const next = current.includes(coin)
        ? current.filter((c) => c !== coin)
        : [...current, coin];
      return { ...prev, [chain]: next };
    });
  };

  const networksValid =
    chains.length > 0 && chains.every((c) => (assets[c]?.length ?? 0) > 0);
  const invitesValid = invites.every((i) => i.email.trim() === "" || EMAIL_RE.test(i.email.trim()));
  const walletValid = WALLET_RE.test(wallet.trim());

  const canFinish = networksValid && walletValid && invitesValid && !isSaving;

  const submit = async () => {
    setError(null);
    const payload: CompleteOnboardingInput = {
      accountType,
      enabledChains: chains,
      enabledAssets: Object.fromEntries(
        chains.map((c) => [c, assets[c] ?? []]),
      ) as Record<string, ("USDC" | "ETH")[]>,
      payoutWallet: wallet.trim(),
      invites:
        accountType === "team"
          ? invites
              .filter((i) => i.email.trim() !== "")
              .map((i) => ({ email: i.email.trim(), role: i.role }))
          : [],
    };
    try {
      const res = await complete(payload);
      setDone(true);
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 700);
      if (res.invited > 0) {
        // no-op: invites are best-effort and reported on the success screen
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-[560px] rounded-2xl border border-d-edge bg-d-panel p-8 text-center d-card">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-d-success/15">
          <svg width="20" height="20" viewBox="0 0 12 12" fill="none">
            <path d="M2 6.5l2.5 2.5L10 3.5" stroke="#3fb950" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="mt-4 text-[18px] font-medium text-d-ink">You&apos;re all set</h2>
        <p className="mt-1.5 text-[13px] text-d-muted">Taking you to your dashboard…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[560px]">
      <StepBar step={step} />

      <div className="rounded-2xl border border-d-edge bg-d-panel p-6 d-card">
        {step === 0 && (
          <AccountStep
            accountType={accountType}
            setAccountType={setAccountType}
            invites={invites}
            setInvites={setInvites}
          />
        )}
        {step === 1 && (
          <NetworksStep
            chains={chains}
            assets={assets}
            onToggleChain={toggleChain}
            onToggleAsset={toggleAsset}
          />
        )}
        {step === 2 && (
          <WalletStep
            wallet={wallet}
            setWallet={setWallet}
            chains={chains}
            assets={assets}
          />
        )}

        {error && (
          <p className="mt-4 rounded-lg border border-d-failed/40 bg-d-failed/10 px-3.5 py-2.5 text-[12.5px] font-medium text-d-failed">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="h-10 rounded-lg border border-d-edge px-4 text-[13px] font-medium text-d-ink transition-colors hover:bg-d-raised"
            >
              Back
            </button>
          ) : (
            <span />
          )}

          {step < 2 ? (
            <button
              type="button"
              disabled={step === 0 && !invitesValid}
              onClick={() => setStep((s) => s + 1)}
              className="d-glow h-10 rounded-lg bg-d-accent px-5 text-[13px] font-medium text-cream transition-colors hover:bg-d-accent-deep disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              disabled={!canFinish}
              onClick={submit}
              className="d-glow h-10 rounded-lg bg-d-accent px-5 text-[13px] font-medium text-cream transition-colors hover:bg-d-accent-deep disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Saving…" : "Finish setup"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepBar({ step }: { step: number }) {
  const labels = ["Account", "Networks", "Payout"];
  return (
    <div className="mb-5 flex items-center gap-2">
      {labels.map((label, i) => (
        <div key={label} className="flex flex-1 items-center gap-2">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11.5px] font-semibold ${
              i <= step
                ? "border-d-accent bg-d-accent text-cream"
                : "border-d-edge bg-d-raised text-d-muted"
            }`}
          >
            {i + 1}
          </span>
          <span
            className={`text-[12.5px] font-medium ${
              i <= step ? "text-d-ink" : "text-d-muted"
            }`}
          >
            {label}
          </span>
          {i < labels.length - 1 && (
            <span className="mx-1 hidden h-px flex-1 bg-d-edge sm:block" />
          )}
        </div>
      ))}
    </div>
  );
}

function AccountStep({
  accountType,
  setAccountType,
  invites,
  setInvites,
}: {
  accountType: AccountType;
  setAccountType: (t: AccountType) => void;
  invites: Invite[];
  setInvites: (i: Invite[]) => void;
}) {
  const options: { value: AccountType; title: string; body: string }[] = [
    { value: "individual", title: "Individual", body: "Just me — I'll manage payments myself." },
    { value: "team", title: "Team", body: "Invite teammates to help run the account." },
  ];

  return (
    <div>
      <h2 className="text-[16px] font-medium text-d-ink">How will you use AirPay?</h2>
      <p className="mt-1 text-[12.5px] text-d-muted">
        This sets up who can access your workspace. You can change it later.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((opt) => {
          const selected = accountType === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setAccountType(opt.value)}
              aria-pressed={selected}
              className={`rounded-xl border p-4 text-left transition-colors ${
                selected
                  ? "border-d-accent bg-d-accent/10"
                  : "border-d-edge bg-d-raised hover:border-d-muted/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[13.5px] font-medium text-d-ink">{opt.title}</span>
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                    selected ? "border-d-accent bg-d-accent" : "border-d-edge"
                  }`}
                >
                  {selected && <span className="h-1.5 w-1.5 rounded-full bg-cream" />}
                </span>
              </div>
              <p className="mt-1.5 text-[12px] leading-[1.5] text-d-muted">{opt.body}</p>
            </button>
          );
        })}
      </div>

      {accountType === "team" && (
        <div className="mt-5 rounded-xl border border-d-edge bg-d-raised/50 p-4">
          <p className="text-[12.5px] font-medium text-d-ink">Invite teammates (optional)</p>
          <p className="mt-0.5 text-[11.5px] text-d-muted">
            You can also invite people later from Settings.
          </p>
          <div className="mt-3 space-y-2">
            {invites.map((inv, i) => {
              const invalid = inv.email.trim() !== "" && !EMAIL_RE.test(inv.email.trim());
              return (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <input
                    value={inv.email}
                    onChange={(e) =>
                      setInvites(
                        invites.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)),
                      )
                    }
                    placeholder="teammate@company.com"
                    className={`${field} flex-1 ${invalid ? "border-d-failed" : ""}`}
                  />
                  <select
                    value={inv.role}
                    onChange={(e) =>
                      setInvites(
                        invites.map((x, j) =>
                          j === i ? { ...x, role: e.target.value as Invite["role"] } : x,
                        ),
                      )
                    }
                    className="h-10 rounded-lg border border-d-edge bg-d-raised px-3 text-[13.5px] text-d-ink focus:border-d-accent focus:outline-none"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setInvites(invites.filter((_, j) => j !== i))}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-d-edge text-d-muted transition-colors hover:bg-d-raised hover:text-d-ink"
                    aria-label="Remove invite"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => setInvites([...invites, { email: "", role: "member" }])}
              className="text-[12.5px] font-medium text-d-accent transition-colors hover:text-d-ink"
            >
              + Add teammate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NetworksStep({
  chains,
  assets,
  onToggleChain,
  onToggleAsset,
}: {
  chains: string[];
  assets: Record<string, string[]>;
  onToggleChain: (key: string, coins: string[]) => void;
  onToggleAsset: (chain: string, coin: string) => void;
}) {
  return (
    <div>
      <h2 className="text-[16px] font-medium text-d-ink">Where should payments settle?</h2>
      <p className="mt-1 text-[12.5px] text-d-muted">
        Enable the networks and assets you want to accept. Payers only see what you enable.
      </p>

      <div className="mt-4 space-y-3">
        {CHAINS.map((c) => {
          const enabled = chains.includes(c.key);
          return (
            <div
              key={c.key}
              className={`rounded-xl border p-3.5 transition-colors ${
                enabled ? "border-d-accent/60 bg-d-accent/5" : "border-d-edge bg-d-raised"
              }`}
            >
              <button
                type="button"
                onClick={() => onToggleChain(c.key, c.coins)}
                aria-pressed={enabled}
                className="flex w-full items-center justify-between"
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold text-white"
                    style={{ backgroundColor: c.color }}
                  >
                    {c.glyph}
                  </span>
                  <span className="text-[13.5px] font-medium text-d-ink">{c.name}</span>
                </span>
                <span
                  className={`flex h-5 w-9 items-center rounded-full border px-0.5 transition-colors ${
                    enabled ? "border-d-accent bg-d-accent" : "border-d-edge bg-d-panel"
                  }`}
                >
                  <span
                    className={`h-3.5 w-3.5 rounded-full bg-cream transition-transform ${
                      enabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </span>
              </button>

              {enabled && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-d-edge-soft pt-3">
                  {c.coins.map((coin) => {
                    const on = (assets[c.key] ?? []).includes(coin);
                    return (
                      <button
                        key={coin}
                        type="button"
                        onClick={() => onToggleAsset(c.key, coin)}
                        aria-pressed={on}
                        className={`rounded-full border px-3 py-1 text-[12.5px] font-medium transition-colors ${
                          on
                            ? "border-d-accent bg-d-accent/15 text-d-ink"
                            : "border-d-edge text-d-muted hover:border-d-muted/50"
                        }`}
                      >
                        {coin}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!chains.length && (
        <p className="mt-3 text-[12px] text-d-muted">Enable at least one network to continue.</p>
      )}
    </div>
  );
}

function WalletStep({
  wallet,
  setWallet,
  chains,
  assets,
}: {
  wallet: string;
  setWallet: (v: string) => void;
  chains: string[];
  assets: Record<string, string[]>;
}) {
  const valid = WALLET_RE.test(wallet.trim());
  const names = chains.map((k) => CHAINS.find((c) => c.key === k)?.name ?? k);
  return (
    <div>
      <h2 className="text-[16px] font-medium text-d-ink">Where should we send your funds?</h2>
      <p className="mt-1 text-[12.5px] text-d-muted">
        One EVM address receives payouts on every enabled network. Non-custodial — funds go
        straight to you.
      </p>

      <div className="mt-4">
        <label className="mb-1.5 block text-[12px] font-medium text-d-muted" htmlFor="payout-wallet">
          Payout wallet address
        </label>
        <input
          id="payout-wallet"
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          placeholder="0x…"
          autoComplete="off"
          spellCheck={false}
          className={`${field} font-mono ${wallet.trim() !== "" && !valid ? "border-d-failed" : ""}`}
        />
        {wallet.trim() !== "" && !valid && (
          <p className="mt-1.5 text-[11.5px] font-medium text-d-failed">
            Enter a valid 0x address (40 hex characters).
          </p>
        )}
      </div>

      <div className="mt-5 rounded-xl border border-d-edge bg-d-raised/50 p-4">
        <p className="text-[12px] font-medium text-d-muted">Summary</p>
        <div className="mt-2 space-y-1.5">
          {chains.map((k) => (
            <div key={k} className="flex items-center justify-between text-[12.5px]">
              <span className="text-d-ink">{names[chains.indexOf(k)]}</span>
              <span className="font-mono text-d-muted">{(assets[k] ?? []).join(", ")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
