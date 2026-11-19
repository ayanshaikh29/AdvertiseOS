"use client";

import React, { useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  HelpCircle,
  X,
  Loader2,
  TrendingUp,
  BarChart3,
  Target,
  Sparkles,
  Layers,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/dashboard";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Modals
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotStatus, setForgotStatus] = useState<{ message?: string; hint?: string } | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  // First Login Force Password Change Modal
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changePasswordError, setChangePasswordError] = useState("");
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError("Please enter your administrator username or email.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password, rememberMe }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Authentication failed. Check your credentials.");
        setLoading(false);
        return;
      }

      // If administrator must change password on first login
      if (data.user?.mustChangePassword) {
        setShowChangePasswordModal(true);
        setLoading(false);
        return;
      }

      // Success -> Redirect to target workspace
      router.push(from);
      router.refresh();
    } catch {
      setError("Connection error. Please check your network and try again.");
      setLoading(false);
    }
  };

  const handleFirstTimePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError("");

    if (newPassword.length < 6) {
      setChangePasswordError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword.toLowerCase() === "admin") {
      setChangePasswordError("Password cannot be 'admin'. Choose a strong custom password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setChangePasswordError("Passwords do not match.");
      return;
    }

    setChangePasswordLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: password, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setChangePasswordError(data.error || "Failed to update password.");
        setChangePasswordLoading(false);
        return;
      }

      setShowChangePasswordModal(false);
      router.push(from);
      router.refresh();
    } catch {
      setChangePasswordError("Failed to update password. Please retry.");
      setChangePasswordLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) return;

    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: forgotIdentifier }),
      });
      const data = await res.json();
      setForgotStatus({ message: data.message, hint: data.hint });
    } catch {
      setForgotStatus({ message: "An unexpected error occurred. Please contact the administrator." });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#F8F6F4] text-[#18181B] flex items-center justify-center p-4 sm:p-6 lg:p-12 overflow-hidden selection:bg-[#F97316]/20">
      
      {/* ── Subtle Ambient Background Lighting ───────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.55, 0.7, 0.55] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 left-1/4 h-[500px] w-[600px] rounded-full bg-gradient-to-tr from-[#FFF7ED]/80 via-[#FFEDD5]/60 to-[#FDF2F8]/70 blur-3xl"
        />
        <motion.div
          animate={{ y: [0, -20, 0], opacity: [0.12, 0.2, 0.12] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-32 right-1/4 h-[550px] w-[550px] rounded-full bg-gradient-to-br from-[#F97316]/15 via-[#FB923C]/15 to-[#8B5CF6]/15 blur-3xl"
        />
      </div>

      {/* ── Main Container: Clean Minimalist Split Layout ────────────────────── */}
      <div className="relative z-10 w-full max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          
          {/* ── LEFT COLUMN: Clean Minimalist Sign In Form ─────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="lg:col-span-5 flex flex-col justify-center px-2 sm:px-6"
          >
            {/* Brand Logo & Name */}
            <Link href="/" className="group inline-flex items-center gap-2.5 select-none mb-7">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#FFF7ED] via-[#FFEDD5] to-[#FDF2F8] p-1.5 shadow-2xs ring-1 ring-black/[0.06] transition-transform duration-300 group-hover:scale-105">
                <Image
                  src="/logo-emblem-transparent.png"
                  alt="AdvertiseOS Logo"
                  width={24}
                  height={24}
                  priority
                  className="object-contain drop-shadow-[0_2px_8px_rgba(249,115,22,0.3)]"
                />
              </div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-display font-extrabold text-lg tracking-tight text-[#18181B]">
                  Advertise<span className="text-[#F97316]">OS</span>
                </span>
                <span className="rounded-full bg-[#F97316]/10 px-2 py-0.5 text-[9px] font-bold text-[#EA580C]">
                  AI
                </span>
              </div>
            </Link>

            {/* Title & Subtitle */}
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#18181B]">
              Sign in to AdvertiseOS
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-[#71717A] leading-relaxed">
              Enter your credentials to access your autonomous marketing workspace.
            </p>

            {/* Error Banner */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -6 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-xs leading-relaxed text-rose-800"
                >
                  <AlertCircle size={15} className="mt-0.5 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Clean Form */}
            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              {/* Email / Username Field */}
              <div>
                <label htmlFor="identifier" className="block text-xs font-semibold text-[#18181B] mb-1.5">
                  Email Address or Username
                </label>
                <div className="relative">
                  <input
                    id="identifier"
                    type="text"
                    autoComplete="username"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="admin@advertiseos.com"
                    className="w-full rounded-xl border border-black/[0.08] bg-white px-3.5 py-2.5 pl-10 text-sm text-[#18181B] placeholder:text-[#A1A1AA] shadow-2xs outline-none transition-all focus:border-[#18181B] focus:ring-1 focus:ring-[#18181B]"
                  />
                  <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-[#18181B] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-black/[0.08] bg-white px-3.5 py-2.5 pl-10 pr-10 text-sm text-[#18181B] placeholder:text-[#A1A1AA] shadow-2xs outline-none transition-all focus:border-[#18181B] focus:ring-1 focus:ring-[#18181B]"
                  />
                  <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#18181B] transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password in one clean line */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-black/20 text-[#18181B] accent-[#18181B] focus:ring-0 cursor-pointer"
                  />
                  <span className="text-xs text-[#52525B]">Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs font-semibold text-[#71717A] hover:text-[#18181B] transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#18181B] px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-all hover:bg-[#27272A] active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white" />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <>
                    <span>Sign in</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>

            {/* Minimalist discreet seed helper */}
            <div className="mt-6 flex items-center justify-between text-[11px] text-[#A1A1AA] border-t border-black/[0.06] pt-4">
              <span>Admin seed access:</span>
              <span className="font-mono text-[#52525B]">admin / admin</span>
            </div>

            {/* Back Link */}
            <div className="mt-4">
              <Link href="/" className="text-xs text-[#71717A] hover:text-[#18181B] transition-colors font-medium">
                ← Back to AdvertiseOS Home
              </Link>
            </div>
          </motion.div>

          {/* ── RIGHT COLUMN: Sleek Minimalist Live Analytics & Chart Showcase ──── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            className="lg:col-span-7"
          >
            <div className="relative overflow-hidden rounded-[32px] sm:rounded-[36px] bg-[#111116] p-8 sm:p-12 text-white shadow-2xl ring-1 ring-white/10 min-h-[540px] flex flex-col justify-between">
              
              {/* Subtle Background Glows */}
              <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-gradient-to-br from-[#F97316]/20 via-[#EC4899]/10 to-transparent blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-gradient-to-tr from-[#8B5CF6]/20 via-[#3B82F6]/10 to-transparent blur-3xl" />

              {/* Top Accent: Minimalist Star / Crystal Showcase */}
              <div className="relative z-10 flex flex-col items-center text-center my-auto py-6">
                {/* Floating Crystal Star Emblem */}
                <div className="relative flex items-center justify-center mb-8">
                  <div className="absolute h-32 w-32 rounded-full bg-gradient-to-tr from-[#F97316]/30 via-[#EC4899]/20 to-[#8B5CF6]/30 blur-2xl" />
                  <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl p-2 transition-transform duration-500 hover:scale-105">
                    <Image
                      src="/logo-emblem-transparent.png"
                      alt="AdvertiseOS Emblem"
                      width={96}
                      height={96}
                      priority
                      className="object-contain drop-shadow-[0_8px_24px_rgba(249,115,22,0.4)]"
                    />
                  </div>
                </div>

                {/* Subtitle & Header */}
                <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.08] px-3 py-1 mb-4 border border-white/10">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-bold tracking-widest text-[#E4E4E7] uppercase">
                    AdvertiseOS
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-display">
                  Welcome to AdvertiseOS
                </h2>

                <p className="mt-3 text-sm text-[#A1A1AA] leading-relaxed max-w-md">
                  Autonomous AI marketing operating system. Seven specialist AI agents collaborate in real-time to plan 30-day campaigns, generate multi-angle copy, shoot vertical reels, and guarantee 100% human sign-off before publishing.
                </p>
              </div>

              {/* Bottom: Minimalist Assurance Card */}
              <div className="relative z-10 rounded-2xl bg-white/[0.05] border border-white/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-md">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                    <span className="text-xs font-bold text-white tracking-wide">
                      Zero Hallucinations & Strict Human Approvals
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#A1A1AA] leading-relaxed">
                    Every post, ad budget, and reel is QA-audited and staged for your review before anything goes live.
                  </p>
                </div>

                {/* Agent Avatar Badges */}
                <div className="flex items-center -space-x-1.5 shrink-0">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-600/80 text-[10px] font-bold text-white ring-2 ring-[#111116]" title="Strategist">
                    🎯
                  </div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600/80 text-[10px] font-bold text-white ring-2 ring-[#111116]" title="Researcher">
                    🔍
                  </div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-600/80 text-[10px] font-bold text-white ring-2 ring-[#111116]" title="Copywriter">
                    💬
                  </div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600/80 text-[10px] font-bold text-white ring-2 ring-[#111116]" title="Auditor">
                    📊
                  </div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-300 ring-2 ring-[#111116]">
                    +3
                  </div>
                </div>
              </div>

            </div>
          </motion.div>

        </div>
      </div>

      {/* ── First-Time Login: Force Password Change Modal ───────────────────── */}
      <AnimatePresence>
        {showChangePasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl border border-black/[0.08] bg-white p-6 sm:p-8 shadow-2xl"
            >
              <div className="flex items-center gap-3 text-[#18181B]">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF7ED] text-[#F97316] ring-1 ring-black/[0.06]">
                  <KeyRound size={22} />
                </span>
                <div>
                  <h3 className="font-display text-lg font-bold">Secure Your Admin Account</h3>
                  <p className="text-xs text-[#71717A]">Required master password setup</p>
                </div>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-[#71717A]">
                You logged in with the default seed password <code className="font-mono text-[#18181B] bg-[#F5F2EF] px-1 py-0.5 rounded">admin</code>.
                Please establish a custom password for your administrator workspace.
              </p>

              {changePasswordError && (
                <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
                  {changePasswordError}
                </div>
              )}

              <form onSubmit={handleFirstTimePasswordChange} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#18181B] mb-1">
                    New Secure Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full rounded-xl border border-black/[0.08] bg-[#F8F6F4] px-3.5 py-2.5 text-sm text-[#18181B] outline-none focus:border-[#18181B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#18181B] mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full rounded-xl border border-black/[0.08] bg-[#F8F6F4] px-3.5 py-2.5 text-sm text-[#18181B] outline-none focus:border-[#18181B]"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={changePasswordLoading}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#18181B] py-3 text-xs font-semibold text-white shadow-xs hover:bg-[#27272A] disabled:opacity-60 cursor-pointer"
                  >
                    {changePasswordLoading ? (
                      <Loader2 size={14} className="animate-spin text-white" />
                    ) : (
                      <>
                        <CheckCircle2 size={14} />
                        <span>Save Password & Enter Workspace</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Forgot Password / Recovery Modal ─────────────────────────────────── */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-3xl border border-black/[0.08] bg-white p-6 sm:p-7 shadow-2xl"
            >
              <button
                onClick={() => {
                  setShowForgotModal(false);
                  setForgotStatus(null);
                }}
                className="absolute right-4 top-4 rounded-full p-1.5 text-[#71717A] hover:bg-[#F5F2EF] cursor-pointer"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F5F2EF] text-[#8B5CF6]">
                  <HelpCircle size={20} />
                </span>
                <div>
                  <h3 className="font-display text-base font-bold text-[#18181B]">Admin Recovery</h3>
                  <p className="text-xs text-[#71717A]">Private Administrator Password Reset</p>
                </div>
              </div>

              {forgotStatus ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-800">
                    {forgotStatus.message}
                  </div>
                  {forgotStatus.hint && (
                    <div className="rounded-2xl border border-black/[0.06] bg-[#F5F2EF] p-3 text-xs text-[#52525B]">
                      <strong>System Hint:</strong> {forgotStatus.hint}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setShowForgotModal(false);
                      setForgotStatus(null);
                    }}
                    className="w-full rounded-xl bg-[#18181B] py-2.5 text-xs font-semibold text-white cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPasswordSubmit} className="mt-4 space-y-3.5">
                  <p className="text-xs text-[#71717A] leading-relaxed">
                    Enter the master username or registered email associated with your AdvertiseOS administrator account.
                  </p>
                  <div>
                    <input
                      type="text"
                      required
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      placeholder="admin or admin@advertiseos.com"
                      className="w-full rounded-xl border border-black/[0.08] bg-[#F8F6F4] px-3.5 py-2.5 text-sm text-[#18181B] outline-none focus:border-[#18181B]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#18181B] py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#27272A] disabled:opacity-60 cursor-pointer"
                  >
                    {forgotLoading ? (
                      <Loader2 size={14} className="animate-spin text-white" />
                    ) : (
                      <span>Request Password Recovery</span>
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F8F6F4]">
          <div className="flex items-center gap-2 text-sm text-[#71717A]">
            <Loader2 size={18} className="animate-spin text-[#F97316]" />
            <span>Loading AdvertiseOS...</span>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
