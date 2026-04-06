import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../lib/apiClient';
import { Card, CardContent } from '../../components/ui/Card';
import { BookOpen, FolderKanban, Clock, ArrowRight } from 'lucide-react-native';

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
}

interface Stats {
  courses: number;
  activeProjects: number;
  pendingProjects: number;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  approved: { label: 'Aktif',      color: '#34d399' },
  pending:  { label: 'Bekliyor',   color: '#fbbf24' },
  draft:    { label: 'Taslak',     color: '#94a3b8' },
  rejected: { label: 'Reddedildi', color: '#f87171' },
};

export const StudentDashboardScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ courses: 0, activeProjects: 0, pendingProjects: 0 });
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [coursesRes, projectsRes] = await Promise.all([
          apiClient.get('/api/v1/courses'),
          apiClient.get('/api/v1/projects?per_page=100'),
        ]);

        const courses: any[] = coursesRes.data?.items ?? [];
        const projects: Project[] = projectsRes.data?.items ?? [];

        const active = projects.filter((p) => p.status?.toLowerCase() === 'approved').length;
        const pending = projects.filter((p) => p.status?.toLowerCase() === 'pending').length;

        setStats({ courses: courses.length, activeProjects: active, pendingProjects: pending });
        setRecentProjects(projects.slice(0, 5));
      } catch {
        // Sessizce hata yut
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const statCards = [
    { title: 'Derslerim', value: stats.courses, icon: BookOpen, color: '#60a5fa' },
    { title: 'Aktif\nProjeler', value: stats.activeProjects, icon: FolderKanban, color: '#818cf8' },
    { title: 'Bekleyenler', value: stats.pendingProjects, icon: Clock, color: '#fbbf24' },
  ];

  return (
    <ScrollView className="flex-1 bg-slate-950 p-4">
      <View className="mb-6 mt-4">
        <Text className="text-2xl font-bold tracking-tight text-white mb-1">
          Hoş geldin, {user?.name?.split(' ')[0]}! 👋
        </Text>
        <Text className="text-sm text-gray-400">
          Sınıf ve proje süreçlerindeki son durumun.
        </Text>
      </View>

      {/* İstatistik Kartları */}
      <View className="flex-row justify-between mb-6">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="flex-1 mx-1 bg-slate-900 border-slate-800">
              <CardContent className="items-center py-4 px-2">
                <View className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 mb-2">
                  <Icon size={20} color={stat.color} />
                </View>
                {isLoading ? (
                  <View className="h-7 w-10 rounded bg-slate-700 mb-1" />
                ) : (
                  <Text className="text-xl font-bold text-white mb-1">{stat.value}</Text>
                )}
                <Text className="text-[10px] font-medium text-gray-400 text-center" numberOfLines={2}>
                  {stat.title}
                </Text>
              </CardContent>
            </Card>
          );
        })}
      </View>

      {/* Son Projelerim */}
      <Card className="mb-8 bg-slate-900 border-slate-800">
        <CardContent className="p-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-bold text-white">Son Projelerim</Text>
            <TouchableOpacity
              className="flex-row items-center gap-1"
              onPress={() => navigation?.navigate('ProjectsRoot', { screen: 'ProjectList' })}
            >
              <Text className="text-xs text-indigo-400">Tümü</Text>
              <ArrowRight size={12} color="#818cf8" />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View className="space-y-2">
              {[1, 2, 3].map((i) => (
                <View key={i} className="h-12 rounded-lg bg-slate-800 animate-pulse mb-2" />
              ))}
            </View>
          ) : recentProjects.length === 0 ? (
            <View className="rounded-xl border border-dashed border-slate-700 p-6 items-center">
              <Text className="text-sm text-gray-500 text-center mb-3">
                Henüz proje oluşturmadınız.
              </Text>
              <TouchableOpacity
                className="rounded-lg bg-indigo-600 px-4 py-2"
                onPress={() => navigation?.navigate('ProjectsRoot', { screen: 'ProjectCreate' })}
              >
                <Text className="text-white text-sm font-semibold">Proje Oluştur</Text>
              </TouchableOpacity>
            </View>
          ) : (
            recentProjects.map((p, i) => {
              const cfg = STATUS_LABEL[p.status?.toLowerCase()] ?? STATUS_LABEL.draft;
              return (
                <TouchableOpacity
                  key={p.id}
                  className={`flex-row items-center justify-between py-3 ${i < recentProjects.length - 1 ? 'border-b border-slate-800' : ''}`}
                  onPress={() => navigation?.navigate('ProjectsRoot', { screen: 'ProjectDetail', initial: false, params: { projectId: p.id } })}
                >
                  <View className="flex-1 mr-3">
                    <Text className="text-sm font-medium text-white" numberOfLines={1}>{p.title}</Text>
                    <Text className="text-xs text-gray-500" numberOfLines={1}>{p.description}</Text>
                  </View>
                  <View className="rounded-full px-2 py-0.5 bg-slate-800">
                    <Text style={{ color: cfg.color }} className="text-[10px] font-bold">{cfg.label}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </CardContent>
      </Card>
    </ScrollView>
  );
};
