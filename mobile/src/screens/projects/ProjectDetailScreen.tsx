import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Plus, CheckCircle, Circle, Clock } from 'lucide-react-native';
import { Project, Task, TaskStatus } from '../../types/project';

const PROJECT_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  DRAFT:    { label: 'Taslak',     bg: 'bg-slate-700',      text: 'text-slate-300' },
  PENDING:  { label: 'Bekliyor',   bg: 'bg-amber-900/50',   text: 'text-amber-400' },
  APPROVED: { label: 'Onaylı',     bg: 'bg-emerald-900/50', text: 'text-emerald-400' },
  REJECTED: { label: 'Reddedildi', bg: 'bg-red-900/50',     text: 'text-red-400' },
};

const TASK_STATUS_NEXT: Record<TaskStatus, TaskStatus> = {
  TODO: 'IN_PROGRESS',
  IN_PROGRESS: 'DONE',
  DONE: 'TODO',
};

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'Yapılacak',
  IN_PROGRESS: 'Devam Ediyor',
  DONE: 'Tamamlandı',
};

const TASK_ICON_COLOR: Record<TaskStatus, string> = {
  TODO: '#64748b',
  IN_PROGRESS: '#f59e0b',
  DONE: '#10b981',
};

const safeErrorMsg = (error: any, fallback: string) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d: any) => d.msg).join('\n');
  return fallback;
};

export const ProjectDetailScreen = ({ route, navigation }: any) => {
  const { projectId } = route.params;
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [projRes, taskRes] = await Promise.all([
        apiClient.get<Project>(`/api/v1/projects/${projectId}`),
        apiClient.get(`/api/v1/tasks?project_id=${projectId}&per_page=100`),
      ]);
      setProject(projRes.data);
      setTasks(taskRes.data.items ?? []);
    } catch (error) {
      Alert.alert('Hata', safeErrorMsg(error, 'Proje yüklenemedi.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async () => {
    Alert.alert('Onaya Gönder', 'Projeyi öğretmeninize onay için göndermek istiyor musunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Gönder',
        onPress: async () => {
          try {
            await apiClient.post(`/api/v1/projects/${projectId}/submit`);
            Alert.alert('Gönderildi!', 'Projeniz öğretmeninize iletildi.');
            fetchData();
          } catch (error) {
            Alert.alert('Hata', safeErrorMsg(error, 'Gönderilemedi.'));
          }
        },
      },
    ]);
  };

  const handleApprove = async () => {
    try {
      await apiClient.post(`/api/v1/projects/${projectId}/approve`);
      Alert.alert('Başarılı', 'Proje onaylandı.');
      fetchData();
    } catch (error) {
      Alert.alert('Hata', safeErrorMsg(error, 'Onaylama başarısız.'));
    }
  };

  const handleReject = async () => {
    Alert.alert('Reddet', 'Bu projeyi reddetmek istediğinize emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Reddet', style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.post(`/api/v1/projects/${projectId}/reject`);
            Alert.alert('Reddedildi', 'Proje reddedildi.');
            navigation.goBack();
          } catch (error) {
            Alert.alert('Hata', safeErrorMsg(error, 'Reddetme başarısız.'));
          }
        },
      },
    ]);
  };

  const handleToggleTaskStatus = async (task: Task) => {
    const nextStatus = TASK_STATUS_NEXT[task.status];
    try {
      await apiClient.patch(`/api/v1/tasks/${task.id}/status`, { status: nextStatus });
      setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: nextStatus } : t));
    } catch (error) {
      Alert.alert('Hata', safeErrorMsg(error, 'Durum güncellenemedi.'));
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center">
        <ActivityIndicator color="#818cf8" />
      </View>
    );
  }

  if (!project) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center p-6">
        <Text className="text-gray-400 text-center">Proje bulunamadı.</Text>
      </View>
    );
  }

  const statusCfg = PROJECT_STATUS_CONFIG[project.status] ?? PROJECT_STATUS_CONFIG.DRAFT;

  // Görevleri gruplara ayır
  const grouped: Record<TaskStatus, Task[]> = { TODO: [], IN_PROGRESS: [], DONE: [] };
  tasks.forEach((t) => { if (grouped[t.status]) grouped[t.status].push(t); });

  return (
    <ScrollView
      className="flex-1 bg-slate-950 p-4"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#818cf8" />}
    >
      {/* Proje Bilgi Kartı */}
      <Card className="mb-4 mt-2">
        <CardContent className="pt-5">
          <View className="flex-row items-center justify-between mb-3">
            <View className={`rounded-lg px-2 py-0.5 ${statusCfg.bg}`}>
              <Text className={`text-xs font-bold ${statusCfg.text}`}>{statusCfg.label}</Text>
            </View>
          </View>
          <Text className="text-xl font-bold text-white">{project.title}</Text>
          <Text className="text-sm text-gray-400 mt-2 leading-5">{project.description}</Text>

          {/* Öğrenci Aksiyonları */}
          {user?.role === 'STUDENT' && project.status === 'DRAFT' && (
            <TouchableOpacity
              className="mt-4 rounded-lg bg-indigo-600 py-2.5 items-center"
              onPress={handleSubmit}
            >
              <Text className="text-white text-sm font-semibold">📨 Onaya Gönder</Text>
            </TouchableOpacity>
          )}

          {/* Öğretmen Aksiyonları */}
          {user?.role === 'TEACHER' && project.status === 'PENDING' && (
            <View className="flex-row gap-2 mt-4">
              <TouchableOpacity
                className="flex-1 rounded-lg bg-emerald-700 py-2.5 items-center"
                onPress={handleApprove}
              >
                <Text className="text-white text-sm font-semibold">✅ Onayla</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 rounded-lg bg-red-800 py-2.5 items-center"
                onPress={handleReject}
              >
                <Text className="text-white text-sm font-semibold">❌ Reddet</Text>
              </TouchableOpacity>
            </View>
          )}
        </CardContent>
      </Card>

      {/* Görevler Başlığı */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-base font-semibold text-white">Görevler</Text>
        {user?.role === 'STUDENT' && (
          <TouchableOpacity
            className="flex-row items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5"
            onPress={() => navigation.navigate('TaskCreate', { projectId })}
          >
            <Plus size={14} color="#818cf8" />
            <Text className="text-indigo-400 text-xs font-semibold">Görev Ekle</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Görev Grupları */}
      {(['TODO', 'IN_PROGRESS', 'DONE'] as TaskStatus[]).map((status) => (
        grouped[status].length > 0 && (
          <View key={status} className="mb-4">
            <Text className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">
              {TASK_STATUS_LABELS[status]} ({grouped[status].length})
            </Text>
            {grouped[status].map((task) => (
              <Card key={task.id} className="mb-2">
                <CardContent className="pt-4 pb-3">
                  <TouchableOpacity
                    className="flex-row items-start gap-3"
                    onPress={() => handleToggleTaskStatus(task)}
                  >
                    {status === 'DONE'
                      ? <CheckCircle size={20} color={TASK_ICON_COLOR[status]} />
                      : status === 'IN_PROGRESS'
                      ? <Clock size={20} color={TASK_ICON_COLOR[status]} />
                      : <Circle size={20} color={TASK_ICON_COLOR[status]} />
                    }
                    <View className="flex-1">
                      <Text className={`text-sm font-medium ${status === 'DONE' ? 'text-gray-500 line-through' : 'text-white'}`}>
                        {task.title}
                      </Text>
                      <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={2}>
                        {task.description}
                      </Text>
                      {task.due_date && (
                        <Text className="text-xs text-amber-500 mt-1">
                          ⏰ {new Date(task.due_date).toLocaleDateString('tr-TR')}
                        </Text>
                      )}
                      {task.ai_suggested && (
                        <View className="mt-1 self-start rounded bg-indigo-900/40 px-1.5 py-0.5">
                          <Text className="text-xs text-indigo-400">🤖 AI Önerisi</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </CardContent>
              </Card>
            ))}
          </View>
        )
      ))}

      {tasks.length === 0 && (
        <Card>
          <CardContent className="items-center justify-center p-8">
            <Text className="text-gray-400 text-center text-sm">
              Henüz görev eklenmemiş.{'\n'}Sağ üstteki butona basarak görev ekleyin.
            </Text>
          </CardContent>
        </Card>
      )}

      <View className="h-8" />
    </ScrollView>
  );
};
