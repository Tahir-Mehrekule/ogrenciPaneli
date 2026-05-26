"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
import { Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await login(formData);
      toast.success("Giriş başarılı!");
      router.push("/dashboard");
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { detail?: string | Array<{ msg?: string }> } } }).response?.data?.detail || "E-posta veya şifre hatalı."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight dark:text-white">
          Tekrar hoş geldiniz
        </h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          UniTrack paneline erişmek için giriş yapın.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Okul E-posta Adresi
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              name="email"
              type="email"
              placeholder="ornek@ogr.edu.tr"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-white/60 dark:focus:ring-white/10"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Şifre
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              Şifremi unuttum
            </Link>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-11 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-white/60 dark:focus:ring-white/10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Giriş yapılıyor...
            </>
          ) : (
            <>
              Giriş Yap
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-100 dark:border-slate-700" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs text-gray-400 dark:bg-slate-950 dark:text-slate-500">
            veya
          </span>
        </div>
      </div>

      {/* Register link */}
      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        Hesabınız yok mu?{" "}
        <Link
          href="/register"
          className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
        >
          Kayıt Ol
        </Link>
      </p>
    </div>
  );
}
