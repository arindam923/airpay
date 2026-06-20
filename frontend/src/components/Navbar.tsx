"use client"

import React, { useState, useEffect } from "react"
import { Cpu, Menu, X, LogOut } from "lucide-react"
import { useAuth } from "@/components/AuthProvider"
import { authClient } from "@/lib/auth-client"

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 border-b ${isScrolled
        ? "bg-black/80 backdrop-blur-md border-neutral-900 py-3.5"
        : "bg-transparent border-transparent py-5"
        }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5 group">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-neutral-950 border border-neutral-850 group-hover:border-indigo-500/50 transition-all duration-200">
            <Cpu className="w-4.5 h-4.5 text-neutral-350 group-hover:text-indigo-400 transition-colors duration-200" />
          </div>
          <span className="font-extrabold text-base tracking-tight text-white">
            Air<span className="text-indigo-400 group-hover:text-indigo-300 transition-colors font-medium">Pay</span>
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-8 text-[11px] font-mono uppercase tracking-wider text-neutral-400">
          <a href="/#playground" className="hover:text-white transition-colors">Playground</a>
          <a href="/#dashboard" className="hover:text-white transition-colors">Analytics</a>
          <a href="/#features" className="hover:text-white transition-colors">Infrastructure</a>
          <a href="/docs" className="hover:text-white transition-colors">API Docs</a>
        </nav>

        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <a
                href="/console"
                className="inline-flex items-center justify-center px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded transition-colors"
              >
                Console
              </a>
            </div>
          ) : (
            <a
              href="/sign-in"
              className="inline-flex items-center justify-center px-4 py-1.5 text-xs font-semibold text-white bg-black border border-neutral-800 hover:border-neutral-500 hover:bg-neutral-900 rounded transition-all duration-200"
            >
              Sign In
            </a>
          )}
        </div>

        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 text-neutral-400 hover:text-white transition-colors"
          aria-label="Toggle Menu"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 border-b border-neutral-900 bg-black/98 backdrop-blur-lg px-6 py-6 flex flex-col gap-5">
          <a href="/#playground" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-neutral-350 hover:text-white transition-colors">Playground</a>
          <a href="/#dashboard" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-neutral-350 hover:text-white transition-colors">Analytics</a>
          <a href="/#features" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-neutral-350 hover:text-white transition-colors">Infrastructure</a>
          <a href="/docs" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-neutral-350 hover:text-white transition-colors">Docs</a>
          <hr className="border-neutral-900 my-1" />
          {user ? (
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400">{user.email}</span>
              <button
                onClick={() => { authClient.signOut(); setIsMobileMenuOpen(false) }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-black rounded text-xs font-semibold transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <a
              href="/sign-in"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-black rounded text-xs font-semibold transition-colors"
            >
              Sign In
            </a>
          )}
        </div>
      )}
    </header>
  )
}
