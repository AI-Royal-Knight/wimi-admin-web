"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { loginAdmin, isAuthorizedAdmin } from "@/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthorizedAdmin()) {
      router.replace("/dashboard");
    }
  }, [router]);

  const handleQuickFill = () => {
    setIdentifier("admin@tiboutik.ht");
    setPassword("Admin123!");
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanIdentifier = identifier.trim();

    if (!cleanIdentifier) {
      setErrorMessage("Please enter your admin email or phone.");
      return;
    }

    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await loginAdmin({
        identifier: cleanIdentifier,
        password,
      });

      if (res.success && "data" in res && res.data) {
        const target =
          (typeof window !== "undefined" &&
            new URLSearchParams(window.location.search).get("from")) ||
          "/dashboard";
        router.push(target);
      } else {
        const err = (
          res as {
            error?: { message?: string; details?: Record<string, string[]> };
          }
        ).error;
        const msg =
          err?.message ||
          err?.details?.identifier?.[0] ||
          err?.details?.password?.[0] ||
          "Invalid admin credentials. Please try again.";
        setErrorMessage(msg);
      }
    } catch {
      setErrorMessage("Unable to connect to authentication server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F9FAFB] px-4 py-12 select-none">
      <div className="w-full max-w-[390px]">
        {/* Brand Logo & Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#FF5B00] flex items-center justify-center p-2.5 shadow-md shadow-orange-500/20 mb-3.5">
            <Image
              src="/tiboutik.png"
              alt="TiBoutik"
              width={30}
              height={30}
              className="object-contain brightness-0 invert"
              priority
            />
          </div>
          <h1 className="text-[22px] font-bold text-[#1E1B4B] tracking-tight">
            TiBoutik Admin
          </h1>
          <p className="text-[13px] text-zinc-500 mt-1">
            Sign in to access platform management
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs p-7">
          {/* Error Message */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200/80 text-red-700 text-[12.5px] flex items-start gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Identifier (Email / Phone) */}
            <div>
              <label className="block text-[12.5px] font-medium text-zinc-700 mb-1.5">
                Email or Phone
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin@tiboutik.ht"
                  autoComplete="username"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-[13.5px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#FF5B00] focus:ring-3 focus:ring-orange-500/10 transition-all"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[12.5px] font-medium text-zinc-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-zinc-200 rounded-xl text-[13.5px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#FF5B00] focus:ring-3 focus:ring-orange-500/10 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-[#FF5B00] hover:bg-[#E65200] active:scale-[0.99] disabled:bg-zinc-200 disabled:text-zinc-400 text-white font-semibold text-[13.5px] rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* 1-Click Demo Fill */}
          <div className="mt-5 pt-4 border-t border-zinc-100 flex items-center justify-between text-[11.5px] text-zinc-400">
            <span>Test account:</span>
            <button
              type="button"
              onClick={handleQuickFill}
              className="text-[#FF5B00] hover:text-[#E65200] font-medium hover:underline cursor-pointer"
            >
              Fill admin credentials
            </button>
          </div>
        </div>

        {/* Minimal Footer */}
        <p className="text-center text-[11.5px] text-zinc-400 mt-6">
          TiBoutik Admin · Authorized access only
        </p>
      </div>
    </div>
  );
}
