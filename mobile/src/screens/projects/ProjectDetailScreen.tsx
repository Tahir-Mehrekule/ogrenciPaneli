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
  draft:    { label: 'Taslak',     bg: 'bg-slate-700',      text: 'text-slate-300' },
  pending:  { label: 'Bekliyor',   bg: 'bg-amber-900/50',   text: 'text-amber-400' },
  approved: { label: 'Onaylı',     bg: 'bg-emerald-900/50', text: 'text-emerald-400' },
  rejected: { label: 'Reddedildi', bg: 'bg-red-900/50',     text: 'text-red-400' },
  DRAFT:    { label: 'Taslak',     bg: 'bg-slate-700',      text: 'text-slate-300' },
};

const TASK_STATUS_NEXT: Record<TaskStatus, TaskStatus> = {
  todo: 'in_progress',
  in_progress: 'done',
  done: 'todo',
  review: 'done',
};

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'Yapılacak',
  in_progress: 'Devam Ediyor',
  done: 'Tamamlandı',
  review: 'İncelemede',
};

const TASK_ICON_COLOR: Record<TaskStatus, string> = {
  todo: '#64748b',
  in_progress: '#f59e0b',
  done: '#10b981',
  review: '#818cf8',
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
  const role = user?.role?.toUpperCase() ?? '';

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const projRes = await apiClient.get<Project>(`/api/v1/projects/${projectId}`);
      setProject(projRes.data);
    } catch (error) {
      Alert.alert('Hata', safeErrorMsg(error, 'Proje yüklenemedi.'));
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const taskRes = await apiClient.get(`/api/v1/tasks?project_id=${projectId}&size=100`);
      setTasks(taskRes.data.items ?? []);
    } catch {
      // Görevler yüklenemese de proje detayı gösterilmeye devam eder
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

  const normalizedStatus = project.status?.toLowerCase() ?? 'draft';
  const statusCfg = PROJECT_STATUS_CONFIG[normalizedStatus] ?? PROJECT_STATUS_CONFIG.draft;

  // Görevleri gruplara ayır
  const grouped: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], done: [], review: [] };
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
          {role === 'STUDENT' && normalizedStatus === 'draft' && (
            <TouchableOpacity
              className="mt-4 rounded-lg bg-indigo-600 py-2.5 items-center"
              onPress={handleSubmit}
            >
              <Text className="text-white text-sm font-semibold">📨 Onaya Gönder</Text>
            </TouchableOpacity>
          )}

          {/* Öğretmen Aksiyonları (Onay) */}
          {(role === 'TEACHER' || role === 'ADMIN') && normalizedStatus === 'pending' && (
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

          {/* AI Planlama Aksiyonu */}
          {(role === 'TEACHER' || role === 'ADMIN') && normalizedStatus === 'approved' && (
            <TouchableOpacity
              className="mt-4 rounded-lg bg-indigo-600/20 border border-indigo-500/30 py-3 items-center justify-center flex-row gap-2"
              onPress={() => {
                Alert.alert(
                  'Yapay Zeka ile Planla',
                  'Proje detaylarına göre sistem otomatik görev önerip kaydedecek. Devam etmek istiyor musunuz?',
                  [
                    { text: 'Vazgeç', style: 'cancel' },
                    {
                      text: 'Planla',
                      onPress: async () => {
                        try {
                          await apiClient.post('/api/v1/ai/suggest', { project_id: projectId });
                          Alert.alert('Harika!', 'AI tarafından önerilen görevler projeye eklendi.');
                          fetchData();
                        } catch (error) {
                          Alert.alert('Hata', safeErrorMsg(error, 'AI önerisi alınamadı.'));
                        }
                      }
                    }
                  ]
                );
              }}
            >
              <Text className="text-indigo-400 text-sm font-bold">✨ AI ile Görevleri Planla</Text>
            </TouchableOpacity>
          )}

          {/* Durum Bannerları */}
          {normalizedStatus === 'pending' && (
            <View className="mt-4 rounded-xl bg-amber-900/20 border border-amber-500/20 p-3 flex-row items-start gap-2">
              <Text className="text-base">⏳</Text>
              <View className="flex-1">
                <Text className="text-xs font-semibold text-amber-400 mb-0.5">
                  {role === 'STUDENT' ? 'Onay Bekleniyor' : 'Bu Proje Onayınızı Bekliyor'}
                </Text>
                <Text className="text-xs text-gray-400 leading-4">
                  {role === 'STUDENT'
                    ? 'Projeniz öğretmeninizin incelemesinde. Onaylandıktan sonra görev ekleyebileceksiniz.'
                    : 'Öğrenci bu projeyi onaylamanız için gönderdi. Yukarıdaki butonları kullanın.'}
                </Text>
              </View>
            </View>
          )}
          {normalizedStatus === 'rejected' && (
            <View className="mt-4 rounded-xl bg-red-900/20 border border-red-500/20 p-3 flex-row items-start gap-2">
              <Text className="text-base">❌</Text>
              <View className="flex-1">
                <Text className="text-xs font-semibold text-red-400 mb-0.5">Proje Reddedildi</Text>
                <Text className="text-xs text-gray-400 leading-4">
                  {role === 'STUDENT'
                    ? 'Bu proje reddedildi. Yeni bir proje oluşturabilirsiniz.'
                    : 'Bu projeyi reddettiniz.'}
                </Text>
              </View>
            </View>
          )}
          {normalizedStatus === 'draft' && role === 'STUDENT' && (
            <View className="mt-4 rounded-xl bg-slate-800 border border-slate-700 p-3 flex-row items-start gap-2">
              <Text className="text-base">📝</Text>
              <View className="flex-1">
                <Text className="text-xs font-semibold text-slate-300 mb-0.5">Taslak Aşamasında</Text>
                <Text className="text-xs text-gray-400 leading-4">
                  Yukarıdaki "Onaya Gönder" butonuyla projenizi öğretmeninize iletebilirsiniz.
                </Text>
              </View>
            </View>
          )}
        </CardContent>
      </Card>

      {/* Görevler Başlığı + Kilitli Uyarı */}
      {normalizedStatus !== 'approved' ? (
        <View className="rounded-xl border-2 border-dashed border-slate-700 p-6 items-center mb-4">
          <Text className="text-2xl mb-2">🔒</Text>
          <Text className="text-sm font-semibold text-gray-400 mb-1">Görevler Kilitli</Text>
          <Text className="text-xs text-gray-500 text-center">
            {role === 'STUDENT' && normalizedStatus === 'draft' && 'Önce projeyi öğretmeninize onay için gönderin.'}
            {role === 'STUDENT' && normalizedStatus === 'pending' && 'Öğretmen onayı bekleniyor.'}
            {role === 'STUDENT' && normalizedStatus === 'rejected' && 'Proje reddedildiği için görev eklenemiyor.'}
            {(role === 'TEACHER' || role === 'ADMIN') && normalizedStatus === 'draft' && 'Öğrenci henüz projeyi onaya göndermedi.'}
            {(role === 'TEACHER' || role === 'ADMIN') && normalizedStatus === 'pending' && 'Projeyi onaylamak için yukarıdaki butonu kullanın.'}
            {(role === 'TEACHER' || role === 'ADMIN') && normalizedStatus === 'rejected' && 'Bu proje reddedilmiş durumda.'}
          </Text>
        </View>
      ) : (
        <>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-semibold text-white">Görevler</Text>
            {role === 'STUDENT' && (
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
          {(['todo', 'in_progress', 'done'] as TaskStatus[]).map((status) => (
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
                        {status === 'done'
                          ? <CheckCircle size={20} color={TASK_ICON_COLOR[status]} />
                          : status === 'in_progress'
                          ? <Clock size={20} color={TASK_ICON_COLOR[status]} />
                          : <Circle size={20} color={TASK_ICON_COLOR[status]} />
                        }
                        <View className="flex-1">
                          <Text className={`text-sm font-medium ${status === 'done' ? 'text-gray-500 line-through' : 'text-white'}`}>
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
        </>
      )}

      <View className="h-8" />
    </ScrollView>
  );
};
