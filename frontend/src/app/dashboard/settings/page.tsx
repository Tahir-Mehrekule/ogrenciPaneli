"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import apiClient from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  User,
  Lock,
  Building2,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import toast from "react-hot-toast";

/* ─────────────── Types ─────────────── */

interface Department {
  id: string;
  name: string;
  created_at: string;
}

/* ─────────────── Shared input class ─────────────── */

const INPUT =
  "w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-200 outline-none transition-colors focus:border-indigo-500 placeholder-gray-500";

/* ─────────────── Profile Section ─────────────── */

function ProfileSection() {
  const { user, refreshUser } = useAuth();

  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [saving, setSaving] = useState(false);

  // Kullanıcı değişirse formu güncelle
  useEffect(() => {
    setFirstName(user?.first_name ?? "");
    setLastName(user?.last_name ?? "");
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Ad ve soyad boş bırakılamaz.");
      return;
    }
    setSaving(true);
    try {
      await apiClient.patch("/api/v1/auth/me", {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      toast.success("Profil güncellendi.");
      // Auth context'ini yenile (useAuth hook'u bu metodu sağlıyorsa)
      if (typeof refreshUser === "function") await refreshUser();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Güncelleme başarısız.");
    } finally {
      setSaving(false);
    }
  };

  const isDirty =
    firstName.trim() !== (user?.first_name ?? "") ||
    lastName.trim() !== (user?.last_name ?? "");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-900/40">
            <User className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <CardTitle className="text-base text-white">Profil Bilgileri</CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">
              Ad ve soyadınızı güncelleyin.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSave} className="space-y-4 max-w-md">
          {/* Email — read-only */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="settings-email" className="text-sm font-medium text-gray-300">Email</label>
            <input
              id="settings-email"
              type="email"
              value={user?.email ?? ""}
              readOnly
              className={`${INPUT} opacity-50 cursor-not-allowed`}
            />
            <p className="text-xs text-gray-500">Email adresi değiştirilemez.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="settings-firstname" className="text-sm font-medium text-gray-300">
                Ad <span className="text-red-400">*</span>
              </label>
              <input
                id="settings-firstname"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={INPUT}
                placeholder="Adınız"
                minLength={2}
                maxLength={100}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="settings-lastname" className="text-sm font-medium text-gray-300">
                Soyad <span className="text-red-400">*</span>
              </label>
              <input
                id="settings-lastname"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={INPUT}
                placeholder="Soyadınız"
                minLength={2}
                maxLength={100}
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button type="submit" disabled={saving || !isDirty}>
              {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ─────────────── Password Section ─────────────── */

function PasswordSection() {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Şifre gücü göstergesi
  const strength = {
    length: newPw.length >= 8,
    upper: /[A-Z]/.test(newPw),
    digit: /\d/.test(newPw),
  };
  const isStrong = strength.length && strength.upper && strength.digit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!isStrong) {
      setFormError("Yeni şifre güç gereksinimlerini karşılamıyor.");
      return;
    }
    if (newPw !== confirmPw) {
      setFormError("Yeni şifreler eşleşmiyor.");
      return;
    }

    setSaving(true);
    try {
      await apiClient.patch("/api/v1/auth/change-password", {
        current_password: currentPw,
        new_password: newPw,
      });
      toast.success("Şifreniz başarıyla değiştirildi.");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err: any) {
      const msg = err.response?.data?.detail;
      setFormError(
        typeof msg === "string" ? msg : "Şifre değiştirilemedi. Mevcut şifrenizi kontrol edin."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-900/40">
            <Lock className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <CardTitle className="text-base text-white">Şifre Değiştir</CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">
              En az 8 karakter, 1 büyük harf ve 1 rakam içermelidir.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          {formError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm text-red-400">
              {formError}
            </div>
          )}

          {/* Mevcut şifre */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="settings-current-pw" className="text-sm font-medium text-gray-300">
              Mevcut Şifre <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                id="settings-current-pw"
                type={showCurrent ? "text" : "password"}
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className={`${INPUT} pr-10`}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                aria-label={showCurrent ? "Şifreyi gizle" : "Şifreyi göster"}
              >
                {showCurrent ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Yeni şifre */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="settings-new-pw" className="text-sm font-medium text-gray-300">
              Yeni Şifre <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                id="settings-new-pw"
                type={showNew ? "text" : "password"}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className={`${INPUT} pr-10`}
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                aria-label={showNew ? "Şifreyi gizle" : "Şifreyi göster"}
              >
                {showNew ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Şifre gücü göstergesi */}
            {newPw.length > 0 && (
              <div className="flex flex-col gap-1 mt-1">
                {[
                  { ok: strength.length, label: "En az 8 karakter" },
                  { ok: strength.upper, label: "En az 1 büyük harf" },
                  { ok: strength.digit, label: "En az 1 rakam" },
                ].map(({ ok, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span
                      className={`text-xs font-medium ${ok ? "text-emerald-400" : "text-gray-500"}`}
                    >
                      {ok ? "✓" : "✗"} {label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Şifre tekrar */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="settings-confirm-pw" className="text-sm font-medium text-gray-300">
              Yeni Şifre (Tekrar) <span className="text-red-400">*</span>
            </label>
            <input
              id="settings-confirm-pw"
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              autoComplete="new-password"
              className={`${INPUT} ${
                confirmPw.length > 0 && confirmPw !== newPw
                  ? "border-red-500/60"
                  : ""
              }`}
              placeholder="••••••••"
              required
            />
            {confirmPw.length > 0 && confirmPw !== newPw && (
              <p className="text-xs text-red-400">Şifreler eşleşmiyor.</p>
            )}
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              disabled={saving || !currentPw || !newPw || !confirmPw}
            >
              {saving ? "Değiştiriliyor..." : "Şifreyi Değiştir"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ─────────────── Department Section (Admin only) ─────────────── */

function DepartmentSection() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDepartments = useCallback(async () => {
    try {
      const { data } = await apiClient.get<Department[]>("/api/v1/admin/departments");
      setDepartments(data);
    } catch {
      toast.error("Bölümler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    try {
      const { data } = await apiClient.post<Department>("/api/v1/admin/departments", { name });
      setDepartments((prev) =>
        [...prev, data].sort((a, b) => a.name.localeCompare(b.name, "tr"))
      );
      setNewName("");
      toast.success(`"${data.name}" bölümü eklendi.`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Bölüm eklenemedi.");
    } finally {
      setAdding(false);
    }
  };

  const handleEditStart = (dept: Department) => {
    setEditingId(dept.id);
    setEditName(dept.name);
  };

  const handleEditSave = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const { data } = await apiClient.patch<Department>(
        `/api/v1/admin/departments/${id}`,
        { name }
      );
      setDepartments((prev) =>
        prev.map((d) => (d.id === id ? data : d)).sort((a, b) =>
          a.name.localeCompare(b.name, "tr")
        )
      );
      setEditingId(null);
      toast.success("Bölüm güncellendi.");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Güncellenemedi.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/api/v1/admin/departments/${deleteTarget.id}`);
      setDepartments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      toast.success(`"${deleteTarget.name}" bölümü silindi.`);
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Silinemedi.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-900/40">
            <Building2 className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <CardTitle className="text-base text-white">Bölüm Yönetimi</CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">
              Kayıt formunda görünecek bölüm listesini yönetin.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Yeni bölüm ekleme */}
        <form onSubmit={handleAdd} className="flex gap-3">
          <input
            type="text"
            placeholder="Yeni bölüm adı (ör: Mekatronik Mühendisliği)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className={`${INPUT} flex-1`}
          />
          <button
            type="submit"
            disabled={adding || !newName.trim()}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            {adding ? "Ekleniyor..." : "Ekle"}
          </button>
        </form>

        {/* Bölüm listesi */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-xl bg-gray-800"
              />
            ))}
          </div>
        ) : departments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-700 p-8 text-center">
            <Building2 className="mx-auto h-8 w-8 text-gray-600 mb-2" />
            <p className="text-sm text-gray-500">
              Henüz bölüm eklenmemiş. Yukarıdan ilk bölümü ekleyin.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className="flex items-center gap-3 px-4 py-3 bg-gray-900/50 hover:bg-gray-800/50 transition-colors"
              >
                <Building2 className="h-4 w-4 shrink-0 text-gray-500" />

                {editingId === dept.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleEditSave(dept.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                      className="flex-1 rounded-lg border border-indigo-500 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <button
                      onClick={() => handleEditSave(dept.id)}
                      disabled={saving}
                      className="rounded-lg bg-emerald-600 p-1.5 text-white hover:bg-emerald-700 disabled:opacity-50"
                      aria-label="Kaydet"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-lg bg-gray-700 p-1.5 text-gray-400 hover:bg-gray-600"
                      aria-label="İptal"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium text-gray-200">
                      {dept.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditStart(dept)}
                        className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-700 hover:text-gray-200 transition-colors"
                        aria-label={`${dept.name} bölümünü düzenle`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(dept)}
                        className="rounded-lg p-1.5 text-gray-500 hover:bg-red-900/20 hover:text-red-400 transition-colors"
                        aria-label={`${dept.name} bölümünü sil`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-500">
          Toplam {departments.length} bölüm
        </p>
      </CardContent>

      {/* Bölüm Silme Onayı */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Bölümü Sil"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" bölümünü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`
            : ""
        }
        confirmText="Evet, Sil"
        cancelText="Vazgeç"
        isDestructive
        loading={deleting}
      />
    </Card>
  );
}

/* ─────────────── Page ─────────────── */

export default function SettingsPage() {
  const { user } = useAuth();
  const role = user?.role?.toUpperCase();
  const isAdmin = role === "ADMIN";

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Başlık */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Ayarlar</h2>
        <p className="text-sm text-gray-400 mt-1">
          Hesap bilgilerinizi ve tercihlerinizi yönetin.
        </p>
      </div>

      {/* Profil — tüm roller */}
      <ProfileSection />

      {/* Şifre — tüm roller */}
      <PasswordSection />

      {/* Bölüm Yönetimi — sadece Admin */}
      {isAdmin && <DepartmentSection />}
    </div>
  );
}
