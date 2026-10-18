export type RangeKey = "24H" | "7D" | "30D" | "90D";

export const ranges: RangeKey[] = ["24H", "7D", "30D", "90D"];

export type PaymentStatus = "Confirmed" | "Pending" | "Failed";

export interface Payment {
  id: string;
  customer: string;
  email: string;
  amount: string;
  coin: string;
  chain: string;
  status: PaymentStatus;
  time: string;
}

export const payments: Payment[] = [
  { id: "pay_9x2k4f", customer: "Maya Chen", email: "maya@lattice.xyz", amount: "$1,240.00", coin: "USDC", chain: "Base", status: "Confirmed", time: "2s ago" },
  { id: "pay_7f1a8b", customer: "Jonas Weber", email: "jonas@nordwind.io", amount: "$856.50", coin: "ETH", chain: "Ethereum", status: "Confirmed", time: "14s ago" },
  { id: "pay_3m8p2c", customer: "Aisha Bello", email: "aisha@sahelpay.com", amount: "$2,100.00", coin: "BTC", chain: "Bitcoin", status: "Pending", time: "32s ago" },
  { id: "pay_5t2r9d", customer: "Lucas Silva", email: "lucas@atlantico.dev", amount: "$430.00", coin: "SOL", chain: "Solana", status: "Confirmed", time: "1m ago" },
  { id: "pay_8w4e6f", customer: "Elena Petrova", email: "elena@vitra.app", amount: "$3,750.00", coin: "USDC", chain: "Ethereum", status: "Confirmed", time: "2m ago" },
  { id: "pay_2y6u1g", customer: "Tomás Rivera", email: "tomas@cerro.mx", amount: "$95.00", coin: "ETH", chain: "Optimism", status: "Failed", time: "3m ago" },
  { id: "pay_4i9o3h", customer: "Sara Lindqvist", email: "sara@fjord.se", amount: "$1,680.00", coin: "USDT", chain: "Polygon", status: "Confirmed", time: "4m ago" },
  { id: "pay_6p3a5i", customer: "David Kim", email: "david@hanriver.kr", amount: "$520.00", coin: "BTC", chain: "Bitcoin", status: "Confirmed", time: "5m ago" },
  { id: "pay_1q7w8j", customer: "Ines Moreau", email: "ines@provence.fr", amount: "$2,340.00", coin: "USDC", chain: "Arbitrum", status: "Pending", time: "6m ago" },
  { id: "pay_9z5x2k", customer: "Omar Haddad", email: "omar@cedar.co", amount: "$760.25", coin: "SOL", chain: "Solana", status: "Confirmed", time: "7m ago" },
];

export const coinColors: Record<string, string> = {
  BTC: "#f7931a",
  ETH: "#8a94ff",
  SOL: "#9945ff",
  USDC: "#2775ca",
  USDT: "#26a17b",
};

export interface Customer {
  name: string;
  email: string;
  total: number;
  count: number;
  lastSeen: string;
  since: string;
}

export function deriveCustomers(list: Payment[]): Customer[] {
  const map = new Map<string, Customer>();
  const since = ["Jan 2026", "Mar 2026", "Apr 2026", "Jun 2026", "Aug 2026"];
  list.forEach((p, idx) => {
    const existing = map.get(p.email);
    const amt = parseFloat(p.amount.replace(/[$,]/g, ""));
    if (existing) {
      existing.total += amt;
      existing.count += 1;
      existing.lastSeen = p.time;
    } else {
      map.set(p.email, {
        name: p.customer,
        email: p.email,
        total: amt,
        count: 1,
        lastSeen: p.time,
        since: since[idx % since.length],
      });
    }
  });
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export interface Payout {
  id: string;
  date: string;
  amount: string;
  destination: string;
  status: "Paid" | "Processing" | "Scheduled";
}

export const payouts: Payout[] = [
  { id: "po_7kd21x", date: "Oct 16, 2026", amount: "$12,400.00", destination: "0x7a3b…f29d", status: "Paid" },
  { id: "po_3mf90a", date: "Oct 15, 2026", amount: "$8,750.00", destination: "0x7a3b…f29d", status: "Paid" },
  { id: "po_5rt62b", date: "Oct 14, 2026", amount: "$4,120.50", destination: "bc1q…8fzq", status: "Paid" },
  { id: "po_9xn44c", date: "Oct 20, 2026", amount: "$6,380.00", destination: "0x7a3b…f29d", status: "Processing" },
  { id: "po_2wq18d", date: "Oct 22, 2026", amount: "$15,000.00", destination: "0x7a3b…f29d", status: "Scheduled" },
  { id: "po_8lt73e", date: "Oct 24, 2026", amount: "$3,210.00", destination: "bc1q…8fzq", status: "Scheduled" },
];

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  successRate: string;
}

export const webhookEndpoints: WebhookEndpoint[] = [
  {
    id: "wh_live_1",
    url: "https://api.lattice.xyz/hooks/airpay",
    events: ["payment.confirmed", "payment.pending", "payout.paid"],
    active: true,
    successRate: "99.9%",
  },
  {
    id: "wh_live_2",
    url: "https://hooks.nordwind.io/v2/airpay",
    events: ["payment.confirmed", "payment.failed"],
    active: true,
    successRate: "99.4%",
  },
  {
    id: "wh_test_1",
    url: "https://staging.vitra.app/webhooks/airpay",
    events: ["payment.confirmed"],
    active: false,
    successRate: "97.2%",
  },
];

export interface Delivery {
  id: string;
  event: string;
  endpoint: string;
  code: number | null;
  status: "Delivered" | "Failed" | "Retrying";
  time: string;
}

export const initialDeliveries: Delivery[] = [
  { id: "dl_91", event: "payment.confirmed", endpoint: "api.lattice.xyz", code: 200, status: "Delivered", time: "2m ago" },
  { id: "dl_90", event: "payment.pending", endpoint: "api.lattice.xyz", code: 200, status: "Delivered", time: "32s ago" },
  { id: "dl_89", event: "payment.failed", endpoint: "staging.vitra.app", code: 500, status: "Failed", time: "3m ago" },
  { id: "dl_88", event: "payout.paid", endpoint: "hooks.nordwind.io", code: 200, status: "Delivered", time: "1h ago" },
  { id: "dl_87", event: "payment.confirmed", endpoint: "hooks.nordwind.io", code: 200, status: "Delivered", time: "2h ago" },
];

export interface AuditEvent {
  id: string;
  title: string;
  actor: string;
  type: "Payments" | "Settings" | "Security";
  time: string;
}

export const auditEvents: AuditEvent[] = [
  { id: "ae_12", title: "Payment pay_9x2k4f confirmed — $1,240.00 USDC", actor: "System", type: "Payments", time: "2m ago" },
  { id: "ae_11", title: "Webhook endpoint staging.vitra.app paused", actor: "Arindam Roy", type: "Settings", time: "25m ago" },
  { id: "ae_10", title: "API key live_prod created", actor: "Arindam Roy", type: "Security", time: "2h ago" },
  { id: "ae_09", title: "Payout po_7kd21x processed — $12,400.00", actor: "System", type: "Payments", time: "1d ago" },
  { id: "ae_08", title: "Team member invited — maya@lattice.xyz", actor: "Arindam Roy", type: "Security", time: "2d ago" },
  { id: "ae_07", title: "Default settlement currency changed to USDC", actor: "Arindam Roy", type: "Settings", time: "3d ago" },
  { id: "ae_06", title: "Payment pay_2y6u1g failed — insufficient gas", actor: "System", type: "Payments", time: "3d ago" },
  { id: "ae_05", title: "Two-factor authentication enabled", actor: "Arindam Roy", type: "Security", time: "5d ago" },
];
