import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../lib/apiClient';
import { Card, CardContent } from '../../components/ui/Card';
import { FolderKanban, Plus, ChevronRight } from 'lucide-react-native';
import { Project, PaginatedResponse } from '../../types/project';

// Durum etiketi renk & metin tanımları
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  DRAFT:    { label: 'Taslak',   bg: 'bg-slate-700',     text: 'text-slate-300' },
  PENDING:  { label: 'Bekliyor', bg: 'bg-amber-900/50',  text: 'text-amber-400' },
  APPROVED: { label: 'Onaylı',   bg: 'bg-emerald-900/50',text: 'text-emerald-400' },
  REJECTED: { label: 'Reddedildi', bg: 'bg-red-900/50', text: 'text-red-400' },
};

const safeErrorMsg = (error: any, fallback: string) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d: any) => d.msg).join('\n');
  return fallback;
};

export const ProjectListScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const { data } = await apiClient.get<PaginatedResponse<Project>>('/api/v1/projects');
      setProjects(data.items);
    } catch (error) {
      Alert.alert('Hata', safeErrorMsg(error, 'Projeler yüklenemedi.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleApprove = async (projectId: string) => {
    try {
      await apiClient.post(`/api/v1/projects/${projectId}/approve`);
      Alert.alert('Başarılı', 'Proje onaylandı.');
      fetchProjects();
    } catch (error) {
      Alert.alert('Hata', safeErrorMsg(error, 'Onaylama başarısız.'));
    }
  };

  const handleReject = async (projectId: string) => {
    Alert.alert('Projeyi Reddet', 'Bu projeyi reddetmek istediğinize emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Reddet', style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.post(`/api/v1/projects/${projectId}/reject`);
            Alert.alert('Başarılı', 'Proje reddedildi.');
            fetchProjects();
          } catch (error) {
            Alert.alert('Hata', safeErrorMsg(error, 'Reddetme başarısız.'));
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center">
        <Text className="text-gray-400">Projeler yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-950 p-4"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProjects(); }} tintColor="#818cf8" />}
    >
      {/* Başlık */}
      <View className="mb-4 mt-2 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-white">
            {user?.role === 'TEACHER' ? 'Gelen Projeler' : 'Projelerim'}
          </Text>
          <Text className="text-sm text-gray-400 mt-1">
            {user?.role === 'TEACHER'
              ? 'Danışmanı olduğunuz projeler.'
              : 'Oluşturduğunuz tüm projeler.'}
          </Text>
        </View>
        {user?.role === 'STUDENT' && (
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-xl bg-indigo-600"
            onPress={() => navigation.navigate('ProjectCreate')}
          >
            <Plus size={20} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Boş Durum */}
      {projects.length === 0 ? (
        <Card className="mt-4">
          <CardContent className="items-center justify-center p-8">
            <FolderKanban size={40} color="#64748b" />
            <Text className="text-gray-400 mt-4 text-center">
              {user?.role === 'TEACHER' ? 'Henüz gönderilmiş proje yok.' : 'Henüz bir proje oluşturmadınız.'}
            </Text>
          </CardContent>
        </Card>
      ) : (
        projects.map((project) => {
          const status = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.DRAFT;
          return (
            <Card key={project.id} className="mb-3">
              <TouchableOpacity onPress={() => navigation.navigate('ProjectDetail', { projectId: project.id })}>
                <CardContent className="pt-4 pb-4">
                  {/* Başlık + Durum + Ok */}
                  <View className="flex-row items-center justify-between mb-2">
                    <View className={`rounded-lg px-2 py-0.5 ${status.bg}`}>
                      <Text className={`text-xs font-bold ${status.text}`}>{status.label}</Text>
                    </View>
                    <ChevronRight size={16} color="#64748b" />
                  </View>

                  <Text className="text-base font-semibold text-white">{project.title}</Text>
                  <Text className="text-sm text-gray-400 mt-1" numberOfLines={2}>
                    {project.description}
                  </Text>

                  {/* Öğretmen: Onayla / Reddet butonları */}
                  {user?.role === 'TEACHER' && project.status === 'PENDING' && (
                    <View className="flex-row gap-2 mt-4">
                      <TouchableOpacity
                        className="flex-1 rounded-lg bg-emerald-700 py-2 items-center"
                        onPress={() => handleApprove(project.id)}
                      >
                        <Text className="text-white text-xs font-semibold">Onayla</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="flex-1 rounded-lg bg-red-800 py-2 items-center"
                        onPress={() => handleReject(project.id)}
                      >
                        <Text className="text-white text-xs font-semibold">Reddet</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </CardContent>
              </TouchableOpacity>
            </Card>
          );
        })
      )}

      <View className="h-8" />
    </ScrollView>
  );
};
