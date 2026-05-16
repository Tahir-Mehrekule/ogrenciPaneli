import React from "react";
import { GraduationCap, BookOpen, CheckCircle2, Sparkles } from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Proje & Ödev Takibi",
    desc: "Öğrencilerin projelerini sınıf bazlı takip edin, onaylayın veya geri bildirim verin.",
  },
  {
    icon: CheckCircle2,
    title: "Görev Yönetimi",
    desc: "Kanban tabanlı görev panosuyla grup çalışmalarını şeffaf biçimde izleyin.",
  },
  {
    icon: Sparkles,
    title: "AI Destekli Görev Dağılımı",
    desc: "Yapay zeka, proje açıklamasını analiz edip üyeler için görev önerisi sunar.",
  },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Sol: Markalı panel */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] flex-col justify-between bg-[#0f172a] auth-pattern p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-violet-600/15 blur-3xl" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-600/30">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">
            UniTrack <span className="text-indigo-400">AI</span>
          </span>
        </div>

        {/* Headline */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight">
              Öğrenci projelerini
              <br />
              <span className="gradient-text">akıllıca yönetin.</span>
            </h1>
            <p className="mt-4 text-base text-slate-400 leading-relaxed max-w-md">
              Öğretmenler ve öğrenciler için tasarlanmış, AI destekli proje
              takip ve görev yönetim platformu.
            </p>
          </div>

          <div className="space-y-4">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="flex items-start gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/10">
                    <Icon className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{f.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer text */}
        <p className="relative z-10 text-xs text-slate-500">
          © 2025 UniTrack AI · Tüm hakları saklıdır.
        </p>
      </div>

      {/* Sağ: Form paneli */}
      <div className="flex flex-1 items-center justify-center bg-white px-6 py-12 sm:px-12 lg:px-16 dark:bg-slate-950">
        {/* Mobile logo */}
        <div className="absolute top-6 left-6 flex items-center gap-2 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <GraduationCap className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-bold text-gray-900 dark:text-white">
            UniTrack <span className="text-indigo-500">AI</span>
          </span>
        </div>

        <div className="w-full max-w-[420px]">
          {children}
        </div>
      </div>
    </div>
  );
}
