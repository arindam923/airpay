import type { Metadata } from "next"
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google"
import { AuthProvider } from "@/components/AuthProvider"
import "./globals.css"

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "AirPay | The Stablecoin Payment Engine",
  description: "Stripe-grade developer experience for stablecoin payments. Accept USDC, USDT, and EURC instantly on Solana, Arbitrum, Polygon, and Ethereum with 2-second settlements and gas-less routing.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} font-sans bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500/30 selection:text-indigo-200`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
