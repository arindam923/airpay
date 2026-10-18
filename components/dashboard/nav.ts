export type NavItem = { label: string; href: string; icon: string };

export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Workspace",
    items: [
      { label: "Overview", href: "/dashboard", icon: "M3 3h6v6H3zM11 3h6v6h-6zM3 11h6v6H3zM11 11h6v6h-6z" },
      { label: "Payments", href: "/dashboard/payments", icon: "M3 5h18v4H3zM3 11h18v4H3z" },
      { label: "Invoices", href: "/dashboard/invoices", icon: "M5.5 3h5.5l3.5 3.5V17h-9zM11 3v3.5h3.5" },
      { label: "Payouts", href: "/dashboard/payouts", icon: "M10 3v9m0 0L6.5 8.5M10 12l3.5-3.5M4 15v1a2 2 0 002 2h8a2 2 0 002-2v-1" },
      { label: "Customers", href: "/dashboard/customers", icon: "M8 11a3 3 0 100-6 3 3 0 000 6zm8 0a3 3 0 100-6 3 3 0 000 6zM2 19c0-2.8 2.7-5 6-5s6 2.2 6 5M12 19c.4-2.3 2.8-4 6-4" },
      { label: "Webhooks", href: "/dashboard/webhooks", icon: "M10 14a4 4 0 108 0m-8 0H3m16 0h-3m-3-6a4 4 0 10-8 0" },
    ],
  },
  {
    title: "Configuration",
    items: [
      { label: "API keys", href: "/dashboard/api-keys", icon: "M13 3l8 8-8 8-2-2 6-6-6-6 2-2zM11 11L3 19" },
      { label: "Settings", href: "/dashboard/settings", icon: "M12 15a3 3 0 100-6 3 3 0 000 6zm7-3l2 1.5-2 3.5-2.5-.5a7 7 0 01-2 1.2L14 20h-4l-.5-2.5a7 7 0 01-2-1.2l-2.5.5-2-3.5L5 12l-2-1.5 2-3.5 2.5.5a7 7 0 012-1.2L10 4h4l.5 2.5a7 7 0 012 1.2l2.5-.5 2 3.5L19 12z" },
      { label: "Audit log", href: "/dashboard/audit-log", icon: "M4 6h16M4 10h16M4 14h10M4 18h7" },
    ],
  },
];

const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

export function pageTitleForPath(path: string): string {
  const exact = NAV_ITEMS.find((item) => item.href === path);
  return exact ? exact.label : "Overview";
}
