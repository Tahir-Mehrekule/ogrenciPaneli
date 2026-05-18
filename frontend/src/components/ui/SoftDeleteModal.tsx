"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import apiClient from "@/lib/apiClient";

export interface CascadeChild {
  label: string;
  count: number;
}

export interface SoftDeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  /** Modal başlığı, örn. "Projeyi Sil" */
  title: string;
  /** Hedef nesnenin adı, modal gövdesinde vurgulanır */
  entityName: string;
  /**
   * Açıldığında çağrılır, cascade child sayılarını getirir.
   * Verilen URL'den GET ile { [key]: number } şeklinde sonuç bekler.
   * labelMap ile UI etiketleri tanımlanır.
   */
  cascadeUrl?: string | null;
  cascadeLabels?: Record<string, string>;
  /** "Sil" butonu metni, varsayılan "Sil" */
  confirmLabel?: string;
  /** Tehlike rengi (kalıcı sil için kullanılır), varsayılan false */
  destructive?: boolean;
}

export function SoftDeleteModal({
  open,
  onClose,
  onConfirm,
  title,
  entityName,
  cascadeUrl,
  cascadeLabels = {},
  confirmLabel = "Sil",
  destructive = false,
}: SoftDeleteModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [children, setChildren] = useState<CascadeChild[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !cascadeUrl) {
      setChildren([]);
      return;
    }
    setLoading(true);
    setError("");
    apiClient
      .get(cascadeUrl)
      .then((res) => {
        const data: Record<string, number> = res.data ?? {};
        const items: CascadeChild[] = Object.entries(data).map(([key, count]) => ({
          label: cascadeLabels[key] ?? key,
          count: Number(count) || 0,
        }));
        setChildren(items);
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || "Bağlı kayıtlar yüklenemedi.");
      })
      .finally(() => setLoading(false));
  }, [open, cascadeUrl, cascadeLabels]);

  if (!open) return null;

  const hasChildren = children.some((c) => c.count > 0);
  const accentClasses = destructive
    ? {
        iconBg: "bg-red-500/15 border-red-500/30",
        iconText: "text-red-400",
        warnText: "text-red-400",
      }
    : {
        iconBg: "bg-amber-500/15 border-amber-500/30",
        iconText: "text-amber-400",
        warnText: "text-amber-400",
      };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      setError(err?.response?.data?.detail || "İşlem başarısız.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={!submitting ? onClose : undefined} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${accentClasses.iconBg}`}>
            <AlertTriangle className={`h-5 w-5 ${accentClasses.iconText}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="text-sm text-gray-400 mt-1">
              <span className="font-medium text-gray-200">{entityName}</span> üzerinde işlem yapacaksınız.
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Bağlı kayıtlar yükleniyor...
          </div>
        )}

        {!loading && cascadeUrl && (
          <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Bağlı Kayıtlar
            </p>
            {hasChildren ? (
              <ul className="space-y-1.5 text-sm text-gray-300">
                {children.map((c) => (
                  <li key={c.label} className="flex items-center justify-between">
                    <span>{c.label}</span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-mono font-semibold ${
                        c.count > 0
                          ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          : "bg-gray-700/40 text-gray-500"
                      }`}
                    >
                      {c.count}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 italic">Bağlı kayıt yok.</p>
            )}
            {hasChildren && (
              <p className={`text-xs mt-2 ${accentClasses.warnText}`}>
                {destructive
                  ? "⚠️ Kalıcı silme: tüm bağlı kayıtlar DB'den tamamen silinir."
                  : "ℹ️ Soft delete: bağlı kayıtlar da pasifleşir (geri yüklenebilir)."}
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2.5">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 disabled:opacity-50"
          >
            Vazgeç
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting || loading}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed ${
              destructive ? "bg-red-700 hover:bg-red-800" : "bg-amber-600 hover:bg-amber-700"
            }`}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {submitting ? "İşleniyor..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
