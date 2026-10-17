export type RangeKey = "24H" | "7D" | "30D" | "90D";

export const ranges: RangeKey[] = ["24H", "7D", "30D", "90D"];

export const chartData: Record<RangeKey, { label: string; points: number[] }> = {
  "24H": {
    label: "Today",
    points: [42, 48, 45, 61, 58, 72, 69, 84, 79, 92, 88, 104, 97, 118, 110, 126, 121, 138, 149],
  },
  "7D": {
    label: "Last 7 days",
    points: [68, 74, 71, 86, 95, 89, 104, 98, 112, 121, 116, 134, 128, 146, 158, 149, 168, 176, 184],
  },
  "30D": {
    label: "Last 30 days",
    points: [52, 61, 58, 66, 74, 70, 83, 91, 86, 99, 108, 102, 117, 126, 119, 138, 149, 141, 158, 167, 159, 176, 188, 179, 196, 207, 198, 218, 229, 242],
  },
  "90D": {
    label: "Last 90 days",
    points: [30, 36, 34, 42, 40, 49, 46, 55, 52, 61, 68, 63, 72, 79, 74, 86, 92, 88, 99, 106, 101, 113, 121, 116, 130, 139, 133, 146, 155, 149, 162, 171, 165, 179, 188, 182, 196, 207, 201, 216, 226, 219, 234, 245, 238, 254, 265, 258, 274, 286, 279, 295, 307, 300, 318, 330],
  },
};

export const xLabels: Record<RangeKey, string[]> = {
  "24H": ["12am", "3am", "6am", "9am", "12pm", "3pm", "6pm", "9pm"],
  "7D": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  "30D": ["Week 1", "Week 2", "Week 3", "Week 4"],
  "90D": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
};

export const stats = [
  { label: "Total volume", value: "$284,210", delta: "+12.4%", up: true, spark: [12, 18, 14, 22, 19, 28, 24, 33, 30, 38, 35, 44] },
  { label: "Payments", value: "1,847", delta: "+8.1%", up: true, spark: [20, 24, 22, 30, 27, 34, 31, 38, 36, 42, 40, 47] },
  { label: "Success rate", value: "99.7%", delta: "+0.2%", up: true, spark: [88, 90, 89, 91, 93, 92, 94, 95, 94, 96, 97, 97.7] },
  { label: "Avg. confirmation", value: "0.78s", delta: "-0.04s", up: true, spark: [1.4, 1.2, 1.3, 1.1, 1.0, 1.05, 0.95, 0.9, 0.88, 0.84, 0.8, 0.78] },
];

export const chains = [
  { name: "Ethereum", symbol: "Ξ", amount: "$98,420", pct: 38, color: "#8a94ff" },
  { name: "Base", symbol: "B", amount: "$71,380", pct: 27, color: "#0052ff" },
  { name: "Bitcoin", symbol: "₿", amount: "$54,120", pct: 21, color: "#f7931a" },
  { name: "Solana", symbol: "◎", amount: "$31,860", pct: 9, color: "#9945ff" },
  { name: "Other chains", symbol: "+", amount: "$28,430", pct: 5, color: "#8b8b96" },
];

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

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  target: "payment" | "payout" | "webhook" | "key";
}

export const initialNotifications: AppNotification[] = [
  { id: "n1", title: "Payment confirmed", body: "pay_9x2k4f · $1,240.00 USDC on Base", time: "2m ago", read: false, target: "payment" },
  { id: "n2", title: "Payout processed", body: "po_7kd21x · $12,400.00 to 0x7a3b…f29d", time: "1h ago", read: false, target: "payout" },
  { id: "n3", title: "Webhook delivery failed", body: "staging.vitra.app returned HTTP 500", time: "3h ago", read: false, target: "webhook" },
  { id: "n4", title: "API key created", body: "live_prod · full access", time: "1d ago", read: true, target: "key" },
];
