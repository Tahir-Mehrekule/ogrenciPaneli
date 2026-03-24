"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import toast from "react-hot-toast";
import { BookOpen } from "lucide-react";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await register(formData);
      toast.success("Kayıt başarılı! Hesabınız açıldı.");
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(
        error.response?.data?.detail || "Kayıt sırasında bir hata oluştu."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-xl dark:border-slate-800 dark:bg-slate-900/80 dark:backdrop-blur-xl">
      <CardHeader className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
          <BookOpen className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Yeni Hesap Oluştur
        </CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Rolünüz '@ogr' e-posta uzantınıza göre otomatik atanacaktır.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Ad Soyad"
            name="name"
            type="text"
            placeholder="Ahmet Yılmaz"
            required
            value={formData.name}
            onChange={handleChange}
          />
          <Input
            label="Okul E-posta Adresi"
            name="email"
            type="email"
            placeholder="ahmet@ogr.unvan.edu.tr"
            required
            value={formData.email}
            onChange={handleChange}
          />
          <Input
            label="Bölüm (Opsiyonel)"
            name="department"
            type="text"
            placeholder="Yazılım Mühendisliği"
            value={formData.department}
            onChange={handleChange}
          />
          <Input
            label="Şifre"
            name="password"
            type="password"
            placeholder="En az 6 karakter"
            required
            minLength={6}
            value={formData.password}
            onChange={handleChange}
          />

          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-500" isLoading={isLoading}>
            Kayıt Ol ve Sisteme Gir
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Zaten hesabınız var mı?{" "}
          <Link
            href="/login"
            className="font-medium text-emerald-600 hover:text-emerald-500 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            Giriş Sayfasına Dön
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
