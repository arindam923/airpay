"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { useAuth } from "@/components/AuthProvider"

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /\d/.test(p) },
  { label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

function getStrength(password: string): { score: number; label: string; color: string } {
  const passed = PASSWORD_RULES.filter((r) => r.test(password)).length
  if (passed <= 1) return { score: 20, label: "Weak", color: "bg-red-500" }
  if (passed === 2) return { score: 40, label: "Fair", color: "bg-orange-500" }
  if (passed === 3) return { score: 60, label: "Good", color: "bg-yellow-500" }
  if (passed === 4) return { score: 80, label: "Strong", color: "bg-lime-500" }
  return { score: 100, label: "Very Strong", color: "bg-emerald-500" }
}

export default function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter()
  const { refresh } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const isSignUp = mode === "sign-up"
  const strength = useMemo(() => getStrength(password), [password])
  const allRulesPass = PASSWORD_RULES.every((r) => r.test(password))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (isSignUp && !allRulesPass) {
      setError("Password does not meet all requirements")
      return
    }

    setLoading(true)

    const { error: err } = isSignUp
      ? await authClient.signUp.email({ email, password, name })
      : await authClient.signIn.email({ email, password })

    if (err) {
      setError(err.message || (isSignUp ? "Sign up failed" : "Sign in failed"))
      setLoading(false)
    } else {
      await refresh()
      router.push("/")
    }
  }

  const handleGoogleSignIn = async () => {
    await authClient.signIn.social({ provider: "google", callbackURL: "/" })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">
            {isSignUp ? "Create Account" : "Sign In"}
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            {isSignUp ? "Get started with AirPay" : "Welcome back to AirPay"}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 py-2.5 bg-white hover:bg-neutral-100 text-neutral-900 text-sm font-semibold rounded transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {isSignUp ? "Sign up with Google" : "Sign in with Google"}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-black px-2 text-neutral-500">or continue with email</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
            required
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 pr-10 bg-neutral-950 border border-neutral-800 rounded text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
              required
              minLength={isSignUp ? 8 : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {isSignUp && password.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${strength.color}`}
                    style={{ width: `${strength.score}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-neutral-400 w-16 text-right">{strength.label}</span>
              </div>
              <ul className="space-y-0.5">
                {PASSWORD_RULES.map((rule) => {
                  const passed = rule.test(password)
                  return (
                    <li
                      key={rule.label}
                      className={`text-[11px] flex items-center gap-1.5 ${
                        passed ? "text-emerald-400" : "text-neutral-500"
                      }`}
                    >
                      <span>{passed ? "✓" : "○"}</span>
                      {rule.label}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded transition-colors"
          >
            {loading ? "Loading..." : isSignUp ? "Create Account" : "Sign In"}
          </button>
        </form>

        <p className="text-center text-xs text-neutral-500">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <a
            href={isSignUp ? "/sign-in" : "/sign-up"}
            className="text-indigo-400 hover:text-indigo-300 underline"
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </a>
        </p>
      </div>
    </div>
  )
}
