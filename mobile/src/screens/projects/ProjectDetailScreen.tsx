import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Clipboard,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Plus, CheckCircle, Circle, Clock, Trash2, Pencil, X, Users, Crown, UserPlus, UserMinus, ArrowLeftRight, Copy } from 'lucide-react-native';
import { Project, Task, TaskStatus, ProjectMember } from '../../types/project';

const PROJECT_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft:    { label: 'Taslak',     bg: 'bg-slate-700',      text: 'text-slate-300' },
  pending:  { label: 'Bekliyor',   bg: 'bg-amber-900/50',   text: 'text-amber-400' },
  approved: { label: 'Onaylı',     bg: 'bg-emerald-900/50', text: 'text-emerald-400' },
  rejected: { label: 'Reddedildi', bg: 'bg-red-900/50',     text: 'text-red-400' },
  DRAFT:    { label: 'Taslak',     bg: 'bg-slate-700',      text: 'text-slate-300' },
};

// Backend TASK_TRANSITIONS ile uyumlu rol-aware geçiş.
// Creator ve ADMIN her geçişi yapabilir (helper içinde bypass).
const TASK_STATUS_NEXT_BY_ROLE: Record<string, Partial<Record<TaskStatus, TaskStatus>>> = {
  STUDENT: { todo: 'in_progress', in_progress: 'review', review: 'in_progress' },
  TEACHER: { todo: 'in_progress', in_progress: 'review', review: 'done' },
  ADMIN: { todo: 'in_progress', in_progress: 'review', review: 'done' },
};

function canTransition(from: TaskStatus, to: TaskStatus, role: string | undefined, isCreator: boolean): boolean {
  if (from === to) return false;
  const r = (role ?? 'STUDENT').toUpperCase();
  if (isCreator || r === 'ADMIN') return true;
  const map: Record<TaskStatus, Partial<Record<TaskStatus, string[]>>> = {
    todo: { in_progress: ['STUDENT', 'TEACHER'] },
    in_progress: { review: ['STUDENT', 'TEACHER'], todo: ['STUDENT', 'TEACHER'] },
    review: { done: ['TEACHER'], in_progress: ['TEACHER'] },
    done: {},
  };
  const allowed = map[from]?.[to];
  if (!allowed) return false;
  return allowed.includes(r);
}

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
  review: '#a78bfa',
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

  // Ekip üyeleri
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [pendingMembers, setPendingMembers] = useState<ProjectMember[]>([]);

  // Düzenleme modal state'leri
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editGithub, setEditGithub] = useState('');
  const [editLoading, setEditLoading] = useState(false);

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

  // Ekip üyeleri (sadece team projesinde)
  const fetchMembers = useCallback(async () => {
    try {
      const [activeRes, pendingRes] = await Promise.all([
        apiClient.get<ProjectMember[]>(`/api/v1/projects/${projectId}/members`),
        apiClient.get<ProjectMember[]>(`/api/v1/projects/${projectId}/members/pending`).catch(() => ({ data: [] as ProjectMember[] })),
      ]);
      setMembers(activeRes.data ?? []);
      setPendingMembers(pendingRes.data ?? []);
    } catch {
      /* üye listesi sessizce hata verebilir */
    }
  }, [projectId]);

  useEffect(() => {
    if (project?.project_type === 'team') fetchMembers();
  }, [project?.project_type, fetchMembers]);


  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Üye yönetimi handler'ları ──
  const copyShareCode = (code: string) => {
    Clipboard.setString(code);
    Alert.alert('Kopyalandı', `Paylaşım kodu kopyalandı: ${code}`);
  };

  const handleAcceptInvite = async (memberId: string) => {
    try {
      await apiClient.post(`/api/v1/projects/${projectId}/members/${memberId}/accept`);
      fetchMembers();
    } catch (error) { Alert.alert('Hata', safeErrorMsg(error, 'İşlem başarısız.')); }
  };

  const handleRejectInvite = async (memberId: string) => {
    try {
      await apiClient.post(`/api/v1/projects/${projectId}/members/${memberId}/reject`);
      fetchMembers();
    } catch (error) { Alert.alert('Hata', safeErrorMsg(error, 'İşlem başarısız.')); }
  };

  const handleCancelInvite = async (memberId: string) => {
    try {
      await apiClient.delete(`/api/v1/projects/${projectId}/members/${memberId}/cancel-invite`);
      fetchMembers();
    } catch (error) { Alert.alert('Hata', safeErrorMsg(error, 'İptal başarısız.')); }
  };

  const handleRemoveMember = (userId: string, name: string) => {
    Alert.alert('Üyeyi Çıkar', `${name} adlı üyeyi projeden çıkarmak istediğinize emin misiniz?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Çıkar', style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/api/v1/projects/${projectId}/members/${userId}`);
            fetchMembers();
          } catch (error) { Alert.alert('Hata', safeErrorMsg(error, 'Çıkarma başarısız.')); }
        },
      },
    ]);
  };

  const handleTransferManager = (userId: string, name: string) => {
    Alert.alert('Yönetici Yap', `${name} adlı üyeye yöneticilik devredilsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Devret',
        onPress: async () => {
          try {
            await apiClient.patch(`/api/v1/projects/${projectId}/members/transfer-manager`, { user_id: userId });
            fetchMembers();
          } catch (error) { Alert.alert('Hata', safeErrorMsg(error, 'Devir başarısız.')); }
        },
      },
    ]);
  };

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

  // ── Soft Delete (Teacher + Admin) ──
  const handleSoftDelete = () => {
    Alert.alert(
      'Projeyi Sil',
      `"${project?.title}" projesini silmek istediğinize emin misiniz? (Geri yüklenebilir)`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/api/v1/projects/${projectId}`);
              Alert.alert('Başarılı', 'Proje silindi (geri yüklenebilir).');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Hata', safeErrorMsg(error, 'Silme başarısız.'));
            }
          },
        },
      ],
    );
  };

  // ── Hard Delete (Sadece Admin) ──
  const handleHardDelete = () => {
    Alert.alert(
      '⚠️ Kalıcı Silme',
      `"${project?.title}" projesini KALICI olarak silmek istediğinize emin misiniz? Bu işlem GERİ ALINAMAZ!`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kalıcı Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/api/v1/projects/${projectId}/hard`);
              Alert.alert('Başarılı', 'Proje kalıcı olarak silindi.');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Hata', safeErrorMsg(error, 'Kalıcı silme başarısız.'));
            }
          },
        },
      ],
    );
  };

  // ── Proje Düzenleme (DRAFT — proje sahibi) ──
  const openEditModal = () => {
    if (!project) return;
    setEditTitle(project.title);
    setEditDesc(project.description);
    setEditGithub((project as any).github_url ?? '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (editTitle.trim().length < 3) {
      return Alert.alert('Hata', 'Başlık en az 3 karakter olmalıdır.');
    }
    if (editDesc.trim().length < 10) {
      return Alert.alert('Hata', 'Açıklama en az 10 karakter olmalıdır.');
    }
    setEditLoading(true);
    try {
      await apiClient.patch(`/api/v1/projects/${projectId}`, {
        title: editTitle.trim(),
        description: editDesc.trim(),
        ...(editGithub.trim() ? { github_url: editGithub.trim() } : {}),
      });
      Alert.alert('Başarılı', 'Proje güncellendi.');
      setShowEditModal(false);
      fetchData();
    } catch (error) {
      Alert.alert('Hata', safeErrorMsg(error, 'Güncelleme başarısız.'));
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleTaskStatus = async (task: Task) => {
    const current = (task.status as TaskStatus);
    const isCreator = String((project as any)?.created_by) === String(user?.id);
    const roleKey = (role || 'STUDENT') as keyof typeof TASK_STATUS_NEXT_BY_ROLE;

    // Creator/Admin için cycle: todo→in_progress→review→done→todo
    let nextStatus: TaskStatus | undefined;
    if (isCreator || role === 'ADMIN') {
      const cycle: Record<TaskStatus, TaskStatus> = {
        todo: 'in_progress', in_progress: 'review', review: 'done', done: 'todo',
      };
      nextStatus = cycle[current];
    } else {
      nextStatus = TASK_STATUS_NEXT_BY_ROLE[roleKey]?.[current];
    }

    if (!nextStatus || !canTransition(current, nextStatus, role, isCreator)) {
      if (current === 'review' && !isCreator && role !== 'TEACHER' && role !== 'ADMIN') {
        Alert.alert('Bilgi', 'İnceleme aşamasındaki görevi öğretmen veya proje sahibi tamamlar.');
      } else if (current === 'done') {
        Alert.alert('Bilgi', 'Görev tamamlanmış.');
      }
      return;
    }

    try {
      await apiClient.patch(`/api/v1/tasks/${task.id}/status`, { status: nextStatus });
      setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: nextStatus! } : t));
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

  // Görevleri gruplara ayır (status backend lowercase)
  const grouped: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], review: [], done: [] };
  tasks.forEach((t) => {
    const key = (t.status as string)?.toLowerCase() as TaskStatus;
    if (grouped[key]) grouped[key].push(t);
  });

  const isCreator = String((project as any)?.created_by) === String(user?.id);
  const canCreateTask = isCreator || role === 'ADMIN' || role === 'STUDENT';

  // Ekip üyeleri yetki/flag'leri
  const isStaff = role === 'TEACHER' || role === 'ADMIN';
  const isTeamProject = project.project_type === 'team';
  const amManager = isCreator || members.some((m) => String(m.user_id) === String(user?.id) && m.role === 'MANAGER');
  const canManageMembers = amManager || isStaff;
  const myMembership = pendingMembers.find((m) => String(m.user_id) === String(user?.id) && m.status === 'INVITED');

  // Katkı özeti: her atanan için tamamlanan / toplam görev (kim ne kadar yaptı)
  const contributionStats = (() => {
    const map = new Map<string, { name: string; total: number; done: number }>();
    tasks.forEach((t) => {
      const key = (t.assigned_to as string) ?? '__unassigned__';
      const name = (t as any).assignee_name ?? 'Atanmamış';
      const entry = map.get(key) ?? { name, total: 0, done: 0 };
      entry.total += 1;
      if ((t.status as string)?.toLowerCase() === 'done') entry.done += 1;
      map.set(key, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  })();

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

          {/* Düzenle + Sil Butonları */}
          <View className="flex-row flex-wrap gap-2 mt-4">
            {/* Düzenle butonu — DRAFT + proje sahibi */}
            {normalizedStatus === 'draft' && String((project as any).created_by) === String(user?.id) && (
              <TouchableOpacity
                onPress={openEditModal}
                className="flex-row items-center gap-1.5 rounded-xl border border-slate-600 bg-slate-800 px-3.5 py-2"
              >
                <Pencil size={14} color="#94a3b8" />
                <Text className="text-xs font-semibold text-gray-300">Düzenle</Text>
              </TouchableOpacity>
            )}

            {/* Soft Delete — Teacher + Admin */}
            {(role === 'TEACHER' || role === 'ADMIN') && (
              <TouchableOpacity
                onPress={handleSoftDelete}
                className="flex-row items-center gap-1.5 rounded-xl border border-amber-600/40 bg-amber-600/10 px-3.5 py-2"
              >
                <Trash2 size={14} color="#fbbf24" />
                <Text className="text-xs font-semibold text-amber-400">Sil</Text>
              </TouchableOpacity>
            )}

            {/* Hard Delete — Sadece Admin */}
            {role === 'ADMIN' && (
              <TouchableOpacity
                onPress={handleHardDelete}
                className="flex-row items-center gap-1.5 rounded-xl border border-red-600/40 bg-red-600/10 px-3.5 py-2"
              >
                <Trash2 size={14} color="#f87171" />
                <Text className="text-xs font-semibold text-red-400">Kalıcı Sil</Text>
              </TouchableOpacity>
            )}
          </View>

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
            {canCreateTask && (
              <TouchableOpacity
                className="flex-row items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5"
                onPress={() => navigation.navigate('TaskCreate', { projectId })}
              >
                <Plus size={14} color="#818cf8" />
                <Text className="text-indigo-400 text-xs font-semibold">Görev Ekle</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Katkı Özeti — kim ne kadar yaptı */}
          {contributionStats.length > 0 && (
            <Card className="mb-4">
              <CardContent className="pt-4 pb-4">
                <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Katkı Özeti</Text>
                {contributionStats.map((s, i) => {
                  const pct = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0;
                  return (
                    <View key={i} className="mb-3">
                      <View className="flex-row items-center justify-between mb-1">
                        <View className="flex-row items-center gap-2 flex-1 min-w-0">
                          <View className="h-7 w-7 items-center justify-center rounded-full bg-cyan-900/40 shrink-0">
                            <Text className="text-xs font-bold text-cyan-300">
                              {s.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <Text className="text-sm font-medium text-white flex-1" numberOfLines={1}>{s.name}</Text>
                        </View>
                        <Text className="text-xs font-semibold text-gray-400 ml-2">{s.done}/{s.total}</Text>
                      </View>
                      <View className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                        <View className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                      </View>
                      <Text className="text-xs text-gray-500 mt-0.5">%{pct} tamamlandı</Text>
                    </View>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Görev Grupları (4 kolon: TODO, IN_PROGRESS, REVIEW, DONE) */}
          {(['todo', 'in_progress', 'review', 'done'] as TaskStatus[]).map((status) => (
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
                          : status === 'in_progress' || status === 'review'
                          ? <Clock size={20} color={TASK_ICON_COLOR[status]} />
                          : <Circle size={20} color={TASK_ICON_COLOR[status]} />
                        }
                        <View className="flex-1">
                          <Text
                            numberOfLines={1}
                            className={`text-sm font-medium ${status === 'done' ? 'text-gray-500 line-through' : 'text-white'}`}
                          >
                            {task.title}
                          </Text>
                          <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={2}>
                            {task.description}
                          </Text>
                          {(task as any).assignee_name && (
                            <Text className="text-xs text-cyan-400 mt-1" numberOfLines={1}>
                              👤 {(task as any).assignee_name}
                            </Text>
                          )}
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

      {/* ── Ekip Üyeleri ── */}
      {isTeamProject && (
        <View className="mt-2 mb-2">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <Users size={18} color="#22d3ee" />
              <Text className="text-base font-semibold text-white">Ekip Üyeleri</Text>
              <View className="rounded-full bg-slate-700 px-2 py-0.5">
                <Text className="text-xs font-bold text-slate-300">
                  {1 + members.filter((m) => String(m.user_id) !== String((project as any).created_by)).length}
                </Text>
              </View>
            </View>
            {canManageMembers && (
              <TouchableOpacity
                className="flex-row items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5"
                onPress={() => navigation.navigate('InviteMember', { projectId })}
              >
                <UserPlus size={13} color="#fff" />
                <Text className="text-xs text-white font-semibold">Davet Et</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Paylaşım kodu */}
          {(project as any).share_code && (isCreator || canManageMembers || members.some((m) => String(m.user_id) === String(user?.id))) && (
            <View className="flex-row items-center justify-between rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3 mb-3">
              <View className="flex-1 min-w-0">
                <Text className="text-xs font-semibold text-gray-500 uppercase">Paylaşım Kodu</Text>
                <Text className="text-base font-mono font-bold text-indigo-400 mt-0.5">{(project as any).share_code}</Text>
              </View>
              <TouchableOpacity
                onPress={() => copyShareCode((project as any).share_code)}
                className="flex-row items-center gap-1 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2"
              >
                <Copy size={13} color="#818cf8" />
                <Text className="text-xs font-semibold text-indigo-400">Kopyala</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Davet edildiyseniz kabul/red */}
          {myMembership && (
            <View className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 mb-3">
              <Text className="text-sm font-semibold text-indigo-300 mb-2">Bu projeye davet edildiniz</Text>
              <View className="flex-row gap-2">
                <TouchableOpacity className="flex-1 rounded-lg bg-emerald-600 py-2 items-center" onPress={() => handleAcceptInvite(myMembership.id)}>
                  <Text className="text-xs font-semibold text-white">Kabul Et</Text>
                </TouchableOpacity>
                <TouchableOpacity className="flex-1 rounded-lg bg-slate-700 py-2 items-center" onPress={() => handleRejectInvite(myMembership.id)}>
                  <Text className="text-xs font-semibold text-gray-200">Reddet</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Aktif üyeler */}
          <Card className="mb-3">
            <CardContent className="p-3">
              {/* Proje sahibi */}
              <View className="flex-row items-center gap-3 py-1.5">
                <View className="h-9 w-9 items-center justify-center rounded-full bg-amber-900/40">
                  <Crown size={16} color="#f59e0b" />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-medium text-white" numberOfLines={1}>
                    {(project as any).created_by_name ?? 'Proje Sahibi'}
                  </Text>
                  <Text className="text-xs text-gray-500">Projeyi başlatan</Text>
                </View>
                <View className="rounded-lg bg-amber-900/30 px-2 py-0.5">
                  <Text className="text-xs font-semibold text-amber-400">Sahip</Text>
                </View>
              </View>

              {/* Diğer aktif üyeler */}
              {members
                .filter((m) => String(m.user_id) !== String((project as any).created_by))
                .map((m) => {
                  const isMemberManager = m.role === 'MANAGER';
                  return (
                    <View key={m.id} className="flex-row items-center gap-3 py-1.5 border-t border-slate-800">
                      <View className="h-9 w-9 items-center justify-center rounded-full bg-indigo-900/40">
                        {isMemberManager ? <Crown size={16} color="#f59e0b" /> : <Users size={15} color="#818cf8" />}
                      </View>
                      <View className="flex-1 min-w-0">
                        <Text className="text-sm font-medium text-white" numberOfLines={1}>{m.user?.name ?? 'Üye'}</Text>
                        {m.user?.email && <Text className="text-xs text-gray-500" numberOfLines={1}>{m.user.email}</Text>}
                      </View>
                      <View className={`rounded-lg px-2 py-0.5 ${isMemberManager ? 'bg-amber-900/30' : 'bg-slate-800'}`}>
                        <Text className={`text-xs font-semibold ${isMemberManager ? 'text-amber-400' : 'text-gray-400'}`}>
                          {isMemberManager ? 'Yönetici' : 'Üye'}
                        </Text>
                      </View>
                      {canManageMembers && (
                        <View className="flex-row gap-1">
                          {!isMemberManager && (
                            <TouchableOpacity className="h-8 w-8 items-center justify-center rounded-lg bg-amber-900/30" onPress={() => handleTransferManager(m.user_id, m.user?.name ?? '')}>
                              <ArrowLeftRight size={12} color="#fbbf24" />
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity className="h-8 w-8 items-center justify-center rounded-lg bg-red-900/20" onPress={() => handleRemoveMember(m.user_id, m.user?.name ?? '')}>
                            <UserMinus size={12} color="#f87171" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}

              {members.filter((m) => String(m.user_id) !== String((project as any).created_by)).length === 0 && (
                <Text className="text-xs text-gray-500 italic pt-2">Henüz başka aktif ekip üyesi yok.</Text>
              )}
            </CardContent>
          </Card>

          {/* Bekleyen davetler */}
          {canManageMembers && pendingMembers.length > 0 && (
            <View>
              <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Bekleyen Davetler</Text>
              <Card>
                <CardContent className="p-3">
                  {pendingMembers.map((m) => (
                    <View key={m.id} className="flex-row items-center gap-3 py-1.5">
                      <View className="h-8 w-8 items-center justify-center rounded-full bg-amber-900/30">
                        <Clock size={14} color="#fbbf24" />
                      </View>
                      <View className="flex-1 min-w-0">
                        <Text className="text-sm font-medium text-white" numberOfLines={1}>{m.user?.name ?? 'Üye'}</Text>
                        <Text className="text-xs text-amber-400">{m.status === 'INVITED' ? 'Davet gönderildi' : 'Katılmak istiyor'}</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleCancelInvite(m.id)}>
                        <Text className="text-xs text-red-400">İptal</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </CardContent>
              </Card>
            </View>
          )}
        </View>
      )}

      <View className="h-8" />

      {/* Proje Düzenleme Modal */}
      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <View className="flex-1 justify-center items-center bg-black/60 p-4">
          <View className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            {/* Gradient Bar */}
            <View className="h-1 rounded-t-2xl bg-indigo-500" />

            <View className="p-5">
              <View className="flex-row items-center justify-between mb-5">
                <Text className="text-lg font-semibold text-white">Projeyi Düzenle</Text>
                <TouchableOpacity onPress={() => setShowEditModal(false)} className="p-1.5 rounded-lg bg-slate-800">
                  <X size={16} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* Başlık */}
              <View className="mb-4">
                <Text className="text-xs font-medium text-gray-400 mb-1.5">Başlık *</Text>
                <TextInput
                  className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white"
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Proje başlığı"
                  placeholderTextColor="#64748b"
                />
              </View>

              {/* Açıklama */}
              <View className="mb-4">
                <Text className="text-xs font-medium text-gray-400 mb-1.5">Açıklama *</Text>
                <TextInput
                  className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white"
                  value={editDesc}
                  onChangeText={setEditDesc}
                  placeholder="Proje açıklaması"
                  placeholderTextColor="#64748b"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={{ minHeight: 80 }}
                />
              </View>

              {/* GitHub URL */}
              <View className="mb-4">
                <Text className="text-xs font-medium text-gray-400 mb-1.5">GitHub URL (opsiyonel)</Text>
                <TextInput
                  className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white"
                  value={editGithub}
                  onChangeText={setEditGithub}
                  placeholder="https://github.com/kullanici/repo"
                  placeholderTextColor="#64748b"
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              {/* Butonlar */}
              <View className="flex-row justify-end gap-3">
                <TouchableOpacity
                  onPress={() => setShowEditModal(false)}
                  className="rounded-xl border border-slate-600 px-4 py-2.5"
                >
                  <Text className="text-sm text-gray-400">İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveEdit}
                  disabled={editLoading}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5"
                >
                  <Text className="text-sm font-semibold text-white">
                    {editLoading ? 'Kaydediliyor...' : 'Kaydet'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};
