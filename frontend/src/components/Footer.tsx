"use client"

import React from "react"
import { Cpu, MessageSquare } from "lucide-react"

export default function Footer() {
  return (
    <footer className="bg-black border-t border-neutral-900 pt-16 pb-12 text-slate-400">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10 mb-12">
          
          {/* Logo & Info (2 Columns wide on medium+) */}
          <div className="col-span-2 flex flex-col justify-between gap-4">
            <div>
              <a href="#" className="flex items-center gap-2 group mb-4">
                <div className="w-8 h-8 rounded-lg bg-neutral-950 border border-neutral-900 flex items-center justify-center">
                  <Cpu className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                </div>
                <span className="font-extrabold text-lg tracking-tight text-white">
                  Air<span className="text-indigo-400 font-medium group-hover:text-indigo-300 transition-colors font-medium">Pay</span>
                </span>
              </a>
              <p className="text-xs text-slate-500 max-w-[240px] leading-relaxed font-medium">
                The developer-first stablecoin payment engine. Stripe-grade APIs for modern internet commerce.
              </p>
            </div>
            
            {/* System Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-900 text-[10px] font-mono text-emerald-450 w-fit">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span>All chains operational</span>
            </div>
          </div>

          {/* Links 1: Products */}
          <div>
            <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Products</h5>
            <ul className="space-y-2.5 text-xs font-semibold">
              <li><a href="#playground" className="hover:text-white transition-colors">Hosted Checkout</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Direct Wallet API</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Gas Relayers</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Smart Routing</a></li>
            </ul>
          </div>

          {/* Links 2: Developers */}
          <div>
            <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Developers</h5>
            <ul className="space-y-2.5 text-xs font-semibold">
              <li><a href="/docs" className="hover:text-white transition-colors">SDK Documentation</a></li>
              <li><a href="/docs" className="hover:text-white transition-colors">API Reference</a></li>
              <li><a href="#" className="hover:text-white transition-colors">GitHub Repos</a></li>
              <li><a href="#" className="hover:text-white transition-colors">System Uptime</a></li>
            </ul>
          </div>

          {/* Links 3: Resources */}
          <div>
            <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Resources</h5>
            <ul className="space-y-2.5 text-xs font-semibold">
              <li><a href="#" className="hover:text-white transition-colors">Payment Guides</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Integration FAQ</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Brand Assets</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Support Center</a></li>
            </ul>
          </div>

          {/* Links 4: Legal */}
          <div>
            <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Legal</h5>
            <ul className="space-y-2.5 text-xs font-semibold">
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">AML Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Cookie Settings</a></li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600 font-medium">
          <span>
            © {new Date().getFullYear()} AirPay Inc. All rights reserved.
          </span>
          
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-white transition-colors" aria-label="Twitter">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a href="#" className="hover:text-white transition-colors" aria-label="GitHub">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </a>
            <a href="#" className="hover:text-white transition-colors" aria-label="Discord">
              <MessageSquare className="w-4 h-4" />
            </a>
          </div>
        </div>

      </div>
    </footer>
  )
}
