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

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await login(formData);
      toast.success("Giriş başarılı, yönlendiriliyorsunuz...");
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(
        error.response?.data?.detail || "Giriş başarısız. Lütfen bilgilerinizi kontrol edin."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-xl dark:border-slate-800 dark:bg-slate-900/80 dark:backdrop-blur-xl">
      <CardHeader className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50">
          <BookOpen className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Hesabınıza Giriş Yapın
        </CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          UniTrack AI paneline erişmek için bilgilerinizi girin.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Okul E-posta Adresi"
            name="email"
            type="email"
            placeholder="ornek@ogr.edu.tr"
            required
            value={formData.email}
            onChange={handleChange}
          />
          <Input
            label="Şifre"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            value={formData.password}
            onChange={handleChange}
          />

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Giriş Yap
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Hesabınız yok mu?{" "}
          <Link
            href="/register"
            className="font-medium text-indigo-600 hover:text-indigo-500 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            Öğrenci/Öğretmen Kaydı Oluştur
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
