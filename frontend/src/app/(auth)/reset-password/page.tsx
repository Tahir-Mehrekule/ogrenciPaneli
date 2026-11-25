"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import apiClient from "@/lib/apiClient";
import { getErrorMessage } from "@/lib/errorMessage";
import toast from "react-hot-toast";
import { Lock, ArrowRight, Eye, EyeOff, CheckCircle2 } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);
  const [formData, setFormData] = useState({ new_password: "", confirm: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.new_password !== formData.confirm) {
      toast.error("Şifreler eşleşmiyor.");
      return;
    }
    try {
      setIsLoading(true);
      await apiClient.post("/api/v1/auth/reset-password", {
        token,
        new_password: formData.new_password,
      });
      setDone(true);
      toast.success("Şifren güncellendi, girişe yönlendiriliyorsun.");
      setTimeout(() => router.push("/login"), 1500);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Şifre sıfırlanamadı."));
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Geçersiz bağlantı
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Sıfırlama bağlantısı eksik. E-postadaki bağlantının tamamını açtığından
          emin ol ya da yeni bir istek oluştur.
        </p>
        <Link
          href="/forgot-password"
          className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
        >
          Yeni sıfırlama isteği oluştur
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight dark:text-white">
          Yeni şifre belirle
        </h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          En az 8 karakter, 1 büyük harf ve 1 rakam içermelidir.
        </p>
      </div>

      {done ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
          <p className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            Şifren güncellendi
          </p>
          <p className="mt-1">Giriş sayfasına yönlendiriliyorsun...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Yeni Şifre
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                name="new_password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                value={formData.new_password}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, new_password: e.target.value }))
                }
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

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Yeni Şifre (Tekrar)
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                name="confirm"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                value={formData.confirm}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, confirm: e.target.value }))
                }
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-white/60 dark:focus:ring-white/10"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Kaydediliyor...
              </>
            ) : (
              <>
                Şifreyi Güncelle
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
