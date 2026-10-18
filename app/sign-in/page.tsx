"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import AuthBackground from "@/components/auth/AuthBackground";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
});

type Values = z.infer<typeof schema>;

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    setError(null);
    const res = await authClient.signIn.email(values);
    if (res.error) {
      setError(res.error.message ?? "Sign in failed.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen w-full">
      <AuthBackground
        title="Welcome back to AirPay."
        subtitle="Sign in to your workspace to manage payments, webhooks, and team members."
      />

      <section className="flex w-full flex-col justify-center bg-paper px-6 py-10 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-[400px]">
          <Link href="/" className="mb-10 flex items-center gap-2 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-ink bg-violet text-[15px] font-semibold text-cream shadow-[2px_2px_0_var(--color-ink)]">
              A
            </span>
            <span className="text-[18px] font-semibold tracking-[-0.01em] text-ink">AirPay</span>
          </Link>

          <h1 className="font-sans text-[30px] font-semibold tracking-[-0.02em] text-ink">Sign in</h1>
          <p className="mt-1 text-[14px] text-ink-soft">Welcome back. Enter your details to continue.</p>

          <div className="mt-7 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" })}
              className="flex h-11 items-center justify-center gap-2.5 rounded-xl border-2 border-ink/15 bg-cream text-[14px] font-medium text-ink transition hover:border-ink/30"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" />
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" />
                <path fill="#FBBC05" d="M3.964 10.712A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.712V4.956H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.044l3.007-2.332Z" />
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.956L3.964 7.288C4.672 5.163 6.656 3.58 9 3.58Z" />
              </svg>
              Continue with Google
            </button>
            <button
              type="button"
              onClick={() => authClient.signIn.social({ provider: "github", callbackURL: "/dashboard" })}
              className="flex h-11 items-center justify-center gap-2.5 rounded-xl border-2 border-ink/15 bg-cream text-[14px] font-medium text-ink transition hover:border-ink/30"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden fill="currentColor">
                <path d="M9 0C4.03 0 0 4.03 0 9c0 3.98 2.58 7.35 6.16 8.54.45.08.62-.19.62-.43v-1.5c-2.51.55-3.04-1.21-3.04-1.21-.41-1.04-1-1.32-1-1.32-.82-.56.06-.55.06-.55.91.06 1.39.93 1.39.93.81 1.38 2.12.98 2.64.75.08-.59.32-.98.58-1.21-2-.23-4.11-1-4.11-4.44 0-.98.35-1.78.93-2.41-.09-.23-.4-1.15.09-2.4 0 0 .76-.24 2.49.92a8.6 8.6 0 0 1 4.5 0c1.73-1.16 2.49-.92 2.49-.92.49 1.25.18 2.17.09 2.4.58.63.93 1.43.93 2.41 0 3.45-2.12 4.21-4.13 4.43.32.28.61.83.61 1.67v2.48c0 .24.17.51.62.43C15.42 16.35 18 12.98 18 9c0-4.97-4.03-9-9-9Z" />
              </svg>
              Continue with GitHub
            </button>
          </div>
          <div className="my-6 flex items-center gap-3 text-[12px] text-ink-soft/70">
            <span className="h-px flex-1 bg-ink/10" />
            <span>or continue with email</span>
            <span className="h-px flex-1 bg-ink/10" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-ink-soft">Email</span>
              <input
                type="email"
                autoComplete="email"
                {...register("email")}
                className="h-11 rounded-xl border-2 border-ink/15 bg-cream px-3.5 text-[14px] text-ink outline-none transition focus:border-violet"
              />
              {errors.email && <span className="text-[12px] text-coral-deep">{errors.email.message}</span>}
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-ink-soft">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                {...register("password")}
                className="h-11 rounded-xl border-2 border-ink/15 bg-cream px-3.5 text-[14px] text-ink outline-none transition focus:border-violet"
              />
              {errors.password && <span className="text-[12px] text-coral-deep">{errors.password.message}</span>}
            </label>

            {error && (
              <div className="rounded-xl border-2 border-coral/40 bg-coral/10 px-3.5 py-2.5 text-[13px] text-coral-deep">
                {error}
              </div>
            )}

            <button
              disabled={isSubmitting}
              className="mt-1 flex h-11 items-center justify-center rounded-full border-2 border-ink bg-ink text-[14px] font-semibold text-cream shadow-[2px_2px_0_var(--color-violet)] transition hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {isSubmitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-[13px] text-ink-soft">
            No account yet?{" "}
            <Link href="/sign-up" className="font-semibold text-violet underline-offset-2 hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
