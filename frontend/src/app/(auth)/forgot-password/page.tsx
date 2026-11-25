"use client";

import React, { useState } from "react";
import Link from "next/link";
import apiClient from "@/lib/apiClient";
import { getErrorMessage } from "@/lib/errorMessage";
import toast from "react-hot-toast";
import { Mail, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await apiClient.post("/api/v1/auth/forgot-password", { email });
      setSent(true);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "İstek gönderilemedi."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight dark:text-white">
          Şifreni sıfırla
        </h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Kayıtlı okul e-posta adresini gir, sıfırlama bağlantısı gönderelim.
        </p>
      </div>

      {sent ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
          <p className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            İstek alındı
          </p>
          <p className="mt-1">
            Bu e-posta kayıtlıysa sıfırlama bağlantısı gönderildi. Gelen kutunu
            kontrol et.
          </p>
          <Link
            href="/login"
            className="mt-3 inline-flex items-center gap-1.5 font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Girişe dön
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                Gönderiliyor...
              </>
            ) : (
              <>
                Sıfırlama Bağlantısı Gönder
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>
      )}

      {!sent && (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Şifreni hatırladın mı?{" "}
          <Link
            href="/login"
            className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            Giriş Yap
          </Link>
        </p>
      )}
    </div>
  );
}
