import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AirPay — Crypto payments infrastructure",
  description:
    "Accept crypto payments in minutes. Non-custodial wallets, instant settlement, powerful webhooks, and SDKs for every major language.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="anonymous" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=switzer@400,500,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-paper text-ink overflow-x-clip">
        {children}
      </body>
    </html>
  );
}
