"use client";

import React, { useState } from "react";
import apiClient from "@/lib/apiClient";
import { getErrorMessage } from "@/lib/errorMessage";
import { Upload, X, CheckCircle2, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

interface ImportResult {
  total_processed: number;
  successful: number;
  failed: number;
  errors: string[];
}

const SAMPLE = `[
  {
    "email": "ogrenci@ogr.uni.edu.tr",
    "first_name": "Ahmet",
    "last_name": "Yilmaz",
    "student_no": "245235001",
    "department_names": ["Bilgisayar Muhendisligi"]
  }
]`;

export function BulkImportModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [jsonText, setJsonText] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  if (!open) return null;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      setJsonText(text);
      setResult(null);
    } catch {
      toast.error("Dosya okunamadi.");
    }
  };

  const handleImport = async () => {
    let payload: unknown;
    try {
      payload = JSON.parse(jsonText);
    } catch {
      toast.error("Gecersiz JSON formati.");
      return;
    }
    if (!Array.isArray(payload)) {
      toast.error("JSON bir dizi olmalidir.");
      return;
    }
    if (payload.length > 200) {
      toast.error("Tek seferde en fazla 200 ogrenci ice aktarilabilir.");
      return;
    }
    setImporting(true);
    try {
      const { data } = await apiClient.post<ImportResult>("/api/v1/users/import", payload);
      setResult(data);
      toast.success(`${data.successful} ogrenci eklendi, ${data.failed} basarisiz.`);
      onDone();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Ice aktarma basarisiz."));
    } finally {
      setImporting(false);
    }
  };

  const close = () => {
    if (importing) return;
    setJsonText("");
    setResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={close} />
      <div className="relative w-full max-w-2xl rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Toplu Ogrenci Ice Aktar</h3>
          <button onClick={close} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-3 text-xs text-gray-400">
          JSON dizisi yapistirin ya da .json dosyasi yukleyin. En fazla 200 kayit. Bolum adlari
          mevcut bolumlerle eslesmeli (yeni bolum otomatik acilmaz). Eklenen hesaplar ilk giriste
          sifresini degistirmek zorundadir (varsayilan: Ogrenci123!).
        </p>

        <label className="mb-3 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-gray-700 px-4 py-3 text-sm text-gray-300 hover:border-indigo-500">
          <Upload className="h-4 w-4 text-indigo-400" />
          JSON dosyasi sec
          <input
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>

        <textarea
          value={jsonText}
          onChange={(e) => {
            setJsonText(e.target.value);
            setResult(null);
          }}
          rows={8}
          placeholder={SAMPLE}
          spellCheck={false}
          className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 font-mono text-xs text-gray-200 outline-none focus:border-indigo-500"
        />

        {result && (
          <div className="mt-3 rounded-xl border border-gray-800 bg-gray-950/60 p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold text-gray-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Sonuc: {result.successful} basarili / {result.failed} basarisiz (toplam{" "}
              {result.total_processed})
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-amber-300">
                {result.errors.map((e, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={close}
            disabled={importing}
            className="rounded-xl border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
          >
            Kapat
          </button>
          <button
            onClick={handleImport}
            disabled={importing || !jsonText.trim()}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {importing ? "Aktariliyor..." : "Ice Aktar"}
          </button>
        </div>
      </div>
    </div>
  );
}
