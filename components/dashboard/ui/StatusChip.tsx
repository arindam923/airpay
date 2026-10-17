type Tone = "success" | "pending" | "failed" | "accent" | "info" | "neutral";

const TONES: Record<Tone, { chip: string; dot: string; pulse?: boolean }> = {
  success: { chip: "bg-d-success/10 text-d-success", dot: "bg-d-success" },
  pending: { chip: "bg-d-pending/10 text-d-pending", dot: "bg-d-pending", pulse: true },
  failed: { chip: "bg-d-failed/10 text-d-failed", dot: "bg-d-failed" },
  accent: { chip: "bg-d-accent/10 text-d-accent", dot: "bg-d-accent" },
  info: { chip: "bg-violet/15 text-violet", dot: "bg-violet" },
  neutral: { chip: "bg-d-raised text-d-muted", dot: "bg-d-edge" },
};

const STATUS_TONE: Record<string, Tone> = {
  Confirmed: "success",
  Delivered: "success",
  Paid: "success",
  Active: "success",
  Pending: "pending",
  Processing: "pending",
  Retrying: "pending",
  Failed: "failed",
  Revoked: "failed",
  Scheduled: "accent",
  Payments: "success",
  Settings: "accent",
  Security: "info",
};

export default function StatusChip({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  const tone = TONES[STATUS_TONE[status] ?? "neutral"];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium ${tone.chip}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${tone.dot} ${tone.pulse ? "animate-pulse-dot" : ""}`}
      />
      {label ?? status}
    </span>
  );
}
