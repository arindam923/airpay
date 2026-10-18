"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "../PageHeader";
import { Card, CardHeader } from "../ui/Card";
import Toggle from "../ui/Toggle";
import Skeleton from "../ui/Skeleton";
import { orpcClient } from "@/lib/orpc/client";
import { CHAINS } from "@/components/pay/config";
import CheckoutAppearanceEditor from "@/components/dashboard/CheckoutAppearanceEditor";
import type { CheckoutAppearance } from "@/lib/checkout-appearance";

const WALLET_RE = /^0x[0-9a-fA-F]{40}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type PayoutMode = "all" | "per_network";
type EmailProvider = "platform" | "resend" | "smtp" | "google";

interface EmailConfigView {
  provider: EmailProvider;
  fromName: string;
  fromEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  hasResendKey: boolean;
  hasSmtpPass: boolean;
  googleSubject: string | null;
  hasGoogle: boolean;
  lastTestStatus: "sent" | "failed" | null;
  lastTestAt: number | null;
  lastTestError: string | null;
  platformFrom: string;
  googleAvailable: boolean;
}

const EMPTY_EMAIL: EmailConfigView = {
  provider: "platform",
  fromName: "",
  fromEmail: "",
  smtpHost: "",
  smtpPort: 465,
  smtpSecure: true,
  smtpUser: "",
  hasResendKey: false,
  hasSmtpPass: false,
  googleSubject: null,
  hasGoogle: false,
  lastTestStatus: null,
  lastTestAt: null,
  lastTestError: null,
  platformFrom: "invoices@airpay.dev",
  googleAvailable: false,
};

interface SettingsRow {
  workspaceName?: string;
  payoutMode?: PayoutMode;
  payoutWallet?: string;
  payoutAddresses?: Record<string, string> | null;
  enabledChains?: string[];
  enabledAssets?: Record<string, string[]> | null;
  emailPayouts?: boolean;
  emailFailures?: boolean;
  emailProduct?: boolean;
  invoiceReplyTo?: string;
  checkoutAppearance?: CheckoutAppearance | null;
  email?: EmailConfigView;
}

const inputClass =
  "h-10 w-full rounded-lg border border-d-edge bg-d-raised px-3.5 text-[13.5px] text-d-ink placeholder:text-d-muted/60 focus:border-d-accent focus:outline-none";

const labelClass = "mb-1.5 block text-[12px] font-medium text-d-muted";

function chainName(key: string): string {
  return CHAINS.find((c) => c.key === key)?.name ?? key;
}

export default function SettingsPage() {
  // `/dashboard/settings?email=…` deep link returned by the Google OAuth flow.
  const searchParams = useSearchParams();
  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await orpcClient.settings.get()) as SettingsRow,
  });

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Settings"
          description="Workspace, payout destinations, and sender email."
        />
        <Card>
          <div className="flex flex-col gap-5 p-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-10 w-full max-w-md rounded-lg" />
              </div>
            ))}
          </div>
        </Card>
      </>
    );
  }

  return <SettingsForm initial={data ?? {}} emailResult={searchParams.get("email")} />;
}

const GOOGLE_NOTICES: Record<string, { kind: "ok" | "err"; text: string }> = {
  google_connected: {
    kind: "ok",
    text: "Google connected — invoices will now be sent from your Gmail.",
  },
  google_failed: { kind: "err", text: "Google sign-in failed. Please try again." },
  google_denied: { kind: "err", text: "Google access was declined." },
  google_no_token: {
    kind: "err",
    text: "Google didn't grant offline access. Connect again to retry.",
  },
  google_unavailable: {
    kind: "err",
    text: "Google connect isn't available on this deployment (missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).",
  },
};

function SettingsForm({
  initial,
  emailResult,
}: {
  initial: SettingsRow;
  emailResult: string | null;
}) {
  const queryClient = useQueryClient();

  const [workspace, setWorkspace] = useState(initial.workspaceName ?? "");
  const [chains, setChains] = useState<string[]>(initial.enabledChains ?? []);
  const [assets, setAssets] = useState<Record<string, string[]>>(initial.enabledAssets ?? {});
  const [payoutMode, setPayoutMode] = useState<PayoutMode>(initial.payoutMode ?? "all");
  const [payoutWallet, setPayoutWallet] = useState(initial.payoutWallet ?? "");
  const [addresses, setAddresses] = useState<Record<string, string>>(
    initial.payoutAddresses ?? {},
  );
  const [emailPayouts, setEmailPayouts] = useState(initial.emailPayouts ?? true);
  const [emailFailures, setEmailFailures] = useState(initial.emailFailures ?? true);
  const [emailProduct, setEmailProduct] = useState(initial.emailProduct ?? false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [dismissedNotice, setDismissedNotice] = useState(false);

  const notice =
    emailResult && !dismissedNotice
      ? (GOOGLE_NOTICES[emailResult] ?? { kind: "err" as const, text: "Google connect failed." })
      : null;

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

  const save = useMutation({
    mutationFn: async () =>
      await orpcClient.settings.update({
        workspaceName: workspace.trim(),
        payoutMode,
        payoutWallet: payoutWallet.trim(),
        payoutAddresses: Object.fromEntries(
          Object.entries(addresses)
            .filter(([, v]) => WALLET_RE.test(v.trim()))
            .map(([k, v]) => [k, v.trim()]),
        ),
        enabledChains: chains,
        enabledAssets: Object.fromEntries(chains.map((c) => [c, assets[c] ?? []])),
        emailPayouts,
        emailFailures,
        emailProduct,
      }),
    onSuccess: () => {
      setError("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Could not save settings.");
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace.trim()) {
      setError("Workspace name is required.");
      return;
    }
    if (chains.length === 0) {
      setError("Enable at least one network.");
      return;
    }
    const missingAsset = chains.find((c) => (assets[c]?.length ?? 0) === 0);
    if (missingAsset) {
      setError(`Pick at least one asset for ${chainName(missingAsset)}.`);
      return;
    }
    if (payoutMode === "all") {
      if (!WALLET_RE.test(payoutWallet.trim())) {
        setError("Enter a valid 0x wallet address (40 hex characters).");
        return;
      }
    } else {
      const missing = chains.find((c) => !WALLET_RE.test((addresses[c] ?? "").trim()));
      if (missing) {
        setError(`Add a destination address for ${chainName(missing)}.`);
        return;
      }
    }
    setError("");
    save.mutate();
  };

  return (
    <>
      <PageHeader
        title="Settings"
        description="Workspace, payout destinations, and sender email."
      />

      {notice && (
        <div
          className={`mb-4 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-[13px] font-medium ${
            notice.kind === "ok"
              ? "border-d-success/40 bg-d-success/10 text-d-ink"
              : "border-d-failed/40 bg-d-failed/10 text-d-ink"
          }`}
        >
          <span>{notice.text}</span>
          <button
            type="button"
            onClick={() => setDismissedNotice(true)}
            className="text-d-muted transition-colors hover:text-d-ink"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {saved && (
        <div className="mb-4 rounded-2xl border border-d-success/40 bg-d-success/10 px-4 py-3 text-[13px] font-medium text-d-ink">
          Settings saved.
        </div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-4">
        <Card>
          <CardHeader title="Workspace" description="Shown on invoices and receipts." />
          <div className="p-5">
            <label className="block max-w-[380px]">
              <span className={labelClass}>Workspace name</span>
              <input
                value={workspace}
                onChange={(e) => setWorkspace(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Networks & assets"
            description="What customers can pay with. Payers only see what you enable."
          />
          <div className="space-y-3 p-5">
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
                    onClick={() => toggleChain(c.key, c.coins)}
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
                            onClick={() => toggleAsset(c.key, coin)}
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
            {chains.length === 0 && (
              <p className="text-[12px] text-d-muted">Enable at least one network.</p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Payout destinations"
            description="Non-custodial — payments go straight to your wallet, never through AirPay."
          />
          <div className="space-y-4 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <ModeToggle value={payoutMode} onChange={setPayoutMode} />
              <p className="text-[11.5px] text-d-muted">
                {payoutMode === "all"
                  ? "One EVM address receives funds on every network you enabled."
                  : "Route each network to its own address."}
              </p>
            </div>

            {payoutMode === "all" ? (
              <label className="block max-w-[460px]">
                <span className={labelClass}>Destination address</span>
                <input
                  value={payoutWallet}
                  onChange={(e) => setPayoutWallet(e.target.value)}
                  placeholder="0x…"
                  spellCheck={false}
                  autoComplete="off"
                  className={`${inputClass} font-mono text-[13px]`}
                />
                <span className="mt-1.5 block text-[11.5px] leading-[1.5] text-d-muted">
                  Same address works on every EVM network. Existing invoices and links keep
                  the address they were created with.
                </span>
              </label>
            ) : (
              <div className="space-y-3">
                {chains.length === 0 && (
                  <p className="text-[12px] text-d-muted">
                    Enable a network above to add its destination.
                  </p>
                )}
                {chains.map((key) => (
                  <label key={key} className="block">
                    <span className={labelClass}>{chainName(key)}</span>
                    <input
                      value={addresses[key] ?? ""}
                      onChange={(e) =>
                        setAddresses((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      placeholder="0x…"
                      spellCheck={false}
                      autoComplete="off"
                      className={`${inputClass} max-w-[460px] font-mono text-[13px]`}
                    />
                  </label>
                ))}
                <p className="text-[11.5px] leading-[1.5] text-d-muted">
                  Every enabled network needs a destination. Existing invoices and links keep
                  the address they were created with.
                </p>
              </div>
            )}
          </div>
        </Card>

        <CheckoutAppearanceEditor initial={initial.checkoutAppearance ?? null} />

        <EmailSenderCard initial={initial} />

        <Card>
          <CardHeader title="Notifications" description="Emails sent to your account address." />
          <div className="p-5">
            <div>
              {[
                {
                  label: "Payment confirmed",
                  desc: "When a payment on a link or invoice confirms on-chain.",
                  on: emailPayouts,
                  set: setEmailPayouts,
                },
                {
                  label: "Payment failures",
                  desc: "Instant alert when a payment fails to confirm.",
                  on: emailFailures,
                  set: setEmailFailures,
                },
                {
                  label: "Product updates",
                  desc: "New features and changelog, once a month.",
                  on: emailProduct,
                  set: setEmailProduct,
                },
              ].map(({ label, desc, on, set }) => (
                <div
                  key={label}
                  className="flex items-center justify-between border-b border-d-edge-soft/60 py-3.5 last:border-0"
                >
                  <div>
                    <p className="text-[13px] font-medium text-d-ink">{label}</p>
                    <p className="text-[11.5px] text-d-muted">{desc}</p>
                  </div>
                  <Toggle on={on} onChange={set} label={label} />
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={save.isPending}
            className="d-glow h-10 rounded-lg bg-d-accent px-5 text-[13px] font-medium text-cream transition-colors hover:bg-d-accent-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {save.isPending ? "Saving…" : "Save changes"}
          </button>
          {error && <p className="text-[12.5px] font-medium text-d-failed">{error}</p>}
        </div>
      </form>
    </>
  );
}

function ModeToggle({
  value,
  onChange,
}: {
  value: PayoutMode;
  onChange: (v: PayoutMode) => void;
}) {
  const options: { value: PayoutMode; label: string }[] = [
    { value: "all", label: "One for all networks" },
    { value: "per_network", label: "Per network" },
  ];
  return (
    <div className="flex gap-1 rounded-lg border border-d-edge bg-d-raised p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1 text-[12px] font-medium transition-colors ${
            value === o.value ? "bg-d-ink text-d-bg" : "text-d-muted hover:text-d-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const PROVIDER_OPTIONS: { value: EmailProvider; label: string }[] = [
  { value: "platform", label: "AirPay default" },
  { value: "resend", label: "Resend" },
  { value: "smtp", label: "SMTP" },
  { value: "google", label: "Google (Gmail)" },
];

function EmailSenderCard({ initial }: { initial: SettingsRow }) {
  const queryClient = useQueryClient();
  const cfg = initial.email ?? EMPTY_EMAIL;

  const [provider, setProvider] = useState<EmailProvider>(cfg.provider);
  const [fromName, setFromName] = useState(cfg.fromName);
  const [fromEmail, setFromEmail] = useState(cfg.fromEmail);
  const [apiKey, setApiKey] = useState("");
  const [smtpHost, setSmtpHost] = useState(cfg.smtpHost);
  const [smtpPort, setSmtpPort] = useState(String(cfg.smtpPort || 465));
  const [smtpSecure, setSmtpSecure] = useState(cfg.smtpSecure);
  const [smtpUser, setSmtpUser] = useState(cfg.smtpUser);
  const [smtpPass, setSmtpPass] = useState("");
  const [replyTo, setReplyTo] = useState(initial.invoiceReplyTo ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [testInfo, setTestInfo] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["settings"] });

  const saveEmail = useMutation({
    mutationFn: async (opts: { disconnectGoogle?: boolean } = {}) =>
      await orpcClient.settings.updateEmail({
        provider: opts.disconnectGoogle ? "platform" : provider,
        fromName: fromName.trim(),
        fromEmail: fromEmail.trim(),
        resendApiKey: apiKey.trim() || undefined,
        smtpHost: smtpHost.trim(),
        smtpPort: Number(smtpPort) || 465,
        smtpSecure,
        smtpUser: smtpUser.trim(),
        smtpPass: smtpPass.trim() || undefined,
        replyTo: replyTo.trim(),
        disconnectGoogle: opts.disconnectGoogle ?? false,
      }),
    onSuccess: () => {
      setError("");
      setSaved(true);
      setApiKey("");
      setSmtpPass("");
      setTimeout(() => setSaved(false), 2200);
      invalidate();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Could not save email settings.");
    },
  });

  const testEmail = useMutation({
    mutationFn: async () => (await orpcClient.settings.testEmail()) as { to: string },
    onSuccess: (res) => {
      setTestInfo(`Test email sent to ${res?.to ?? "your account address"}.`);
      invalidate();
    },
    onError: (err) => {
      setTestInfo(null);
      setError(err instanceof Error ? err.message : "Could not send the test email.");
    },
  });

  const submit = () => {
    if (replyTo.trim() && !EMAIL_RE.test(replyTo.trim())) {
      setError("Reply-to must be a valid email address.");
      return;
    }
    if (provider === "resend") {
      if (!EMAIL_RE.test(fromEmail.trim())) {
        setError("Add the verified sender address for your Resend domain.");
        return;
      }
      if (!apiKey.trim() && !cfg.hasResendKey) {
        setError("Paste your Resend API key.");
        return;
      }
    }
    if (provider === "smtp") {
      if (!smtpHost.trim() || !Number(smtpPort)) {
        setError("SMTP host and port are required.");
        return;
      }
      if (!EMAIL_RE.test(fromEmail.trim())) {
        setError("Add the sender address for your SMTP relay.");
        return;
      }
      if (smtpUser.trim() && !smtpPass.trim() && !cfg.hasSmtpPass) {
        setError("Paste your SMTP password.");
        return;
      }
    }
    if (provider === "google" && !cfg.hasGoogle) {
      setError("Connect your Google account first.");
      return;
    }
    setError("");
    saveEmail.mutate({});
  };

  const fromPreview =
    provider === "google"
      ? cfg.googleSubject ?? "—"
      : provider === "platform"
        ? cfg.platformFrom
        : fromName.trim()
          ? `${fromName.trim()} <${fromEmail.trim()}>`
          : fromEmail.trim() || "—";

  const lastTest = cfg.lastTestAt
    ? new Date(cfg.lastTestAt).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <Card>
      <CardHeader
        title="Sender email"
        description="How invoice emails reach your customers — use your own account and domain."
        actions={
          <span className="rounded-full border border-d-edge bg-d-raised px-2.5 py-1 text-[11.5px] font-medium text-d-muted">
            Sending via {PROVIDER_OPTIONS.find((p) => p.value === provider)?.label}
          </span>
        }
      />
      {/* Not a <form>: this card lives inside the main settings form, and
          nested forms are invalid HTML that the parser would silently drop. */}
      <div className="flex flex-col gap-4 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="block">
            <span className={labelClass}>Email provider</span>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as EmailProvider)}
              className="h-10 w-full rounded-lg border border-d-edge bg-d-raised px-3 text-[13.5px] text-d-ink focus:border-d-accent focus:outline-none"
            >
              {PROVIDER_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className={labelClass}>From (as shown to the customer)</span>
            <div className="flex h-10 items-center rounded-lg border border-d-edge-soft bg-d-raised/60 px-3.5 font-mono text-[13px] text-d-muted">
              {fromPreview}
            </div>
          </label>
        </div>

        {provider === "platform" && (
          <div className="rounded-xl border border-d-edge bg-d-raised p-4">
            <p className="text-[12.5px] leading-[1.6] text-d-muted">
              Invoices go out through AirPay&apos;s verified Resend domain
              (<span className="font-mono text-d-ink">{cfg.platformFrom}</span>) with your
              workspace name as the sender. Nothing to configure.
            </p>
          </div>
        )}

        {provider === "resend" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>From name</span>
              <input
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="Acme Billing"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>From email (verified domain)</span>
              <input
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                type="email"
                placeholder="invoices@yourdomain.com"
                className={inputClass}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className={labelClass}>Resend API key</span>
              <input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                type="password"
                autoComplete="off"
                placeholder={cfg.hasResendKey ? "Saved — leave blank to keep" : "re_…"}
                className={`${inputClass} font-mono text-[13px]`}
              />
              <span className="mt-1.5 block text-[11.5px] leading-[1.5] text-d-muted">
                Create a key at resend.com and verify your sending domain in that account.
              </span>
            </label>
          </div>
        )}

        {provider === "smtp" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>SMTP host</span>
              <input
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.yourdomain.com"
                className={`${inputClass} font-mono text-[13px]`}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Port</span>
              <input
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                placeholder="465"
                className={`${inputClass} font-mono text-[13px]`}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Username</span>
              <input
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                autoComplete="off"
                placeholder="smtp user (blank if none)"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Password</span>
              <input
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                type="password"
                autoComplete="new-password"
                placeholder={cfg.hasSmtpPass ? "Saved — leave blank to keep" : "SMTP password"}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>From name</span>
              <input
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="Acme Billing"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={labelClass}>From email</span>
              <input
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                type="email"
                placeholder="invoices@yourdomain.com"
                className={inputClass}
              />
            </label>
            <div className="flex items-center justify-between rounded-xl border border-d-edge bg-d-raised px-4 py-3 sm:col-span-2">
              <div>
                <p className="text-[13px] font-medium text-d-ink">TLS (SSL)</p>
                <p className="text-[11.5px] text-d-muted">
                  Off uses STARTTLS on port 587, on uses implicit TLS on port 465.
                </p>
              </div>
              <Toggle on={smtpSecure} onChange={setSmtpSecure} label="TLS (SSL)" />
            </div>
          </div>
        )}

        {provider === "google" && (
          <div className="rounded-xl border border-d-edge bg-d-raised p-4">
            {cfg.hasGoogle ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[13px] font-medium text-d-ink">
                    Connected: <span className="font-mono">{cfg.googleSubject}</span>
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-d-muted">
                    Invoices are sent through the Gmail API with this account&apos;s consent.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    saveEmail.mutate({ disconnectGoogle: true });
                  }}
                  disabled={saveEmail.isPending}
                  className="h-9 rounded-lg border border-d-edge px-3.5 text-[12.5px] font-medium text-d-ink transition-colors hover:bg-d-panel disabled:opacity-60"
                >
                  Disconnect
                </button>
              </div>
            ) : cfg.googleAvailable ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-[440px] text-[12.5px] leading-[1.6] text-d-muted">
                  Connect the Google account you want invoices to come from. AirPay only
                  requests permission to send email — no access to read your mail.
                </p>
                <a
                  href="/api/email/google/start"
                  className="d-glow flex h-9 items-center rounded-lg bg-d-accent px-4 text-[12.5px] font-medium text-cream transition-colors hover:bg-d-accent-deep"
                >
                  Connect Google
                </a>
              </div>
            ) : (
              <p className="text-[12.5px] leading-[1.6] text-d-muted">
                Google connect isn&apos;t available on this deployment — set
                GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable it.
              </p>
            )}
          </div>
        )}

        <label className="block max-w-[460px]">
          <span className={labelClass}>Reply-to email</span>
          <input
            value={replyTo}
            onChange={(e) => setReplyTo(e.target.value)}
            type="email"
            placeholder="billing@yourcompany.com"
            className={inputClass}
          />
          <span className="mt-1.5 block text-[11.5px] leading-[1.5] text-d-muted">
            When a customer replies to an invoice, it goes to this address. Leave empty to
            use your account email.
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3 border-t border-d-edge-soft pt-4">
          <button
            type="button"
            onClick={submit}
            disabled={saveEmail.isPending}
            className="h-9 rounded-lg border border-d-accent bg-d-accent px-4 text-[12.5px] font-medium text-cream transition-colors hover:bg-d-accent-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saveEmail.isPending ? "Saving…" : "Save sender"}
          </button>
          <button
            type="button"
            onClick={() => {
              setError("");
              setTestInfo(null);
              testEmail.mutate();
            }}
            disabled={testEmail.isPending}
            className="h-9 rounded-lg border border-d-edge px-4 text-[12.5px] font-medium text-d-ink transition-colors hover:bg-d-raised disabled:opacity-60"
          >
            {testEmail.isPending ? "Sending…" : "Send test email"}
          </button>
          {saved && <span className="text-[12.5px] font-medium text-d-success">Saved.</span>}
          {testInfo && <span className="text-[12.5px] text-d-muted">{testInfo}</span>}
          {error && <span className="text-[12.5px] font-medium text-d-failed">{error}</span>}
        </div>

        {!error && cfg.lastTestStatus && lastTest && (
          <p className="text-[11.5px] text-d-muted">
            Last test: {cfg.lastTestStatus === "sent" ? "sent" : "failed"} {lastTest}
            {cfg.lastTestStatus === "failed" && cfg.lastTestError
              ? ` — ${cfg.lastTestError}`
              : ""}
          </p>
        )}
      </div>
    </Card>
  );
}
