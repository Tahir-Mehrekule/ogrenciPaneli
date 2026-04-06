import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../lib/apiClient';
import { Card, CardContent } from '../../components/ui/Card';
import { BookOpen, FolderKanban, Clock, ArrowRight, CheckCircle2, XCircle } from 'lucide-react-native';

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
}

interface Stats {
  courses: number;
  totalProjects: number;
  pendingProjects: number;
}

export const TeacherDashboardScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ courses: 0, totalProjects: 0, pendingProjects: 0 });
  const [pendingProjects, setPendingProjects] = useState<Project[]>([]);
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
        const pending = projects.filter((p) => p.status?.toLowerCase() === 'pending');

        setStats({ courses: courses.length, totalProjects: projects.length, pendingProjects: pending.length });
        setPendingProjects(pending.slice(0, 5));
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
    { title: 'Projeler', value: stats.totalProjects, icon: FolderKanban, color: '#34d399' },
    { title: 'Bekleyen', value: stats.pendingProjects, icon: Clock, color: '#fbbf24' },
  ];

  const handleApprove = async (projectId: string) => {
    try {
      await apiClient.post(`/api/v1/projects/${projectId}/approve`);
      setPendingProjects((prev) => prev.filter((p) => p.id !== projectId));
      setStats((s) => ({ ...s, pendingProjects: s.pendingProjects - 1 }));
      Alert.alert('Başarılı', 'Proje onaylandı.');
    } catch {
      Alert.alert('Hata', 'Onaylama işlemi başarısız.');
    }
  };

  const handleReject = (projectId: string) => {
    Alert.alert('Reddet', 'Bu projeyi reddetmek istediğinize emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Reddet', style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.post(`/api/v1/projects/${projectId}/reject`);
            setPendingProjects((prev) => prev.filter((p) => p.id !== projectId));
            setStats((s) => ({ ...s, pendingProjects: s.pendingProjects - 1 }));
          } catch {
            Alert.alert('Hata', 'Reddetme işlemi başarısız.');
          }
        },
      },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-slate-950 p-4">
      <View className="mb-6 mt-4">
        <Text className="text-2xl font-bold tracking-tight text-white mb-1">
          Hoş geldin, Öğretmen {user?.name?.split(' ')[0]}! 🎓
        </Text>
        <Text className="text-sm text-gray-400">
          Öğrenci proje onayları ve sınıf istatistikleri.
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

      {/* Onay Bekleyen Projeler */}
      <Card className="mb-6 bg-slate-900 border-slate-800">
        <CardContent className="p-4">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <Text className="text-base font-bold text-white">Onay Bekleyen Projeler</Text>
              {stats.pendingProjects > 0 && (
                <View className="rounded-full bg-amber-500/10 px-2 py-0.5">
                  <Text className="text-xs font-bold text-amber-400">{stats.pendingProjects}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              className="flex-row items-center gap-1"
              onPress={() => navigation?.navigate('ProjectsRoot', { screen: 'ProjectList' })}
            >
              <Text className="text-xs text-indigo-400">Tümü</Text>
              <ArrowRight size={12} color="#818cf8" />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View>
              {[1, 2].map((i) => (
                <View key={i} className="h-14 rounded-lg bg-slate-800 mb-2" />
              ))}
            </View>
          ) : pendingProjects.length === 0 ? (
            <View className="rounded-xl border border-dashed border-slate-700 p-6 items-center">
              <Text className="text-sm text-gray-500 text-center">
                Şu an bekleyen yeni bir proje başvurusu bulunmuyor.
              </Text>
            </View>
          ) : (
            pendingProjects.map((p, i) => (
              <TouchableOpacity
                key={p.id}
                className={`py-3 ${i < pendingProjects.length - 1 ? 'border-b border-slate-800' : ''}`}
                onPress={() => navigation?.navigate('ProjectsRoot', { screen: 'ProjectDetail', initial: false, params: { projectId: p.id } })}
              >
                <Text className="text-sm font-medium text-white mb-0.5" numberOfLines={1}>{p.title}</Text>
                <Text className="text-xs text-gray-500 mb-2" numberOfLines={1}>{p.description}</Text>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    className="flex-row items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5"
                    onPress={() => handleApprove(p.id)}
                  >
                    <CheckCircle2 size={12} color="#fff" />
                    <Text className="text-white text-xs font-semibold">Onayla</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-row items-center gap-1 rounded-lg bg-red-700/80 px-3 py-1.5"
                    onPress={() => handleReject(p.id)}
                  >
                    <XCircle size={12} color="#fff" />
                    <Text className="text-white text-xs font-semibold">Reddet</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </CardContent>
      </Card>
    </ScrollView>
  );
};
