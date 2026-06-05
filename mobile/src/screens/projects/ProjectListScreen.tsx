import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl,
  TouchableOpacity, Alert, Clipboard, Modal, TextInput,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../lib/apiClient';
import {
  FolderKanban, Plus, ChevronRight, Archive,
  Link2, Users, CheckCircle2, Clock, XCircle, Circle,
  Search, X, ChevronDown, Trash2, RotateCcw,
} from 'lucide-react-native';
import { Project, PaginatedResponse, ProjectCategory } from '../../types/project';

const STATUS_CONFIG: Record<string, { label: string; accent: string; bg: string; text: string }> = {
  draft:       { label: 'Taslak',      accent: '#475569', bg: '#1e2939',     text: '#94a3b8' },
  pending:     { label: 'Bekliyor',    accent: '#f59e0b', bg: '#451a03',     text: '#fbbf24' },
  approved:    { label: 'Onaylı',      accent: '#10b981', bg: '#052e16',     text: '#34d399' },
  rejected:    { label: 'Reddedildi',  accent: '#ef4444', bg: '#450a0a',     text: '#f87171' },
  in_progress: { label: 'Devam',       accent: '#818cf8', bg: '#1e1b4b',     text: '#a5b4fc' },
  completed:   { label: 'Tamamlandı',  accent: '#22c55e', bg: '#052e16',     text: '#86efac' },
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  draft:       <Circle size={10} color="#475569" />,
  pending:     <Clock size={10} color="#f59e0b" />,
  approved:    <CheckCircle2 size={10} color="#10b981" />,
  rejected:    <XCircle size={10} color="#ef4444" />,
  in_progress: <Circle size={10} color="#818cf8" />,
  completed:   <CheckCircle2 size={10} color="#22c55e" />,
};

const safeErrorMsg = (error: any, fallback: string) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d: any) => d.msg).join('\n');
  return fallback;
};

type ViewMode = 'active' | 'archived';

const PROJECT_STATUS_OPTIONS = [
  { label: 'Tüm Durumlar', value: '' },
  { label: 'Taslak', value: 'draft' },
  { label: 'Bekliyor', value: 'pending' },
  { label: 'Onaylı', value: 'approved' },
  { label: 'Reddedildi', value: 'rejected' },
  { label: 'Devam Ediyor', value: 'in_progress' },
  { label: 'Tamamlandı', value: 'completed' },
];

// ── Staff Tablo Görünümü (web projects DataTable + reports TeacherTableView pattern) ──
const ProjectTableView = ({
  projects, role, onOpenDetail, onApprove, onReject, onUnarchive, onHardDelete,
}: {
  projects: Project[];
  role: string;
  onOpenDetail: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onUnarchive: (id: string) => void;
  onHardDelete: (id: string, title: string) => void;
}) => {
  const active = projects.filter((p) => !p.is_archived);
  const archived = projects.filter((p) => p.is_archived);

  if (active.length === 0 && archived.length === 0) {
    return (
      <View className="mt-16 items-center px-8">
        <FolderKanban size={40} color="#334155" />
        <Text className="text-gray-500 mt-4 text-center">Henüz proje yok.</Text>
      </View>
    );
  }

  // Derse göre grupla
  const grouped = active.reduce((acc, p) => {
    const key = p.course_name ?? 'Ders Atanmamış';
    if (!acc[key]) acc[key] = { code: p.course_code ?? null, projects: [] as Project[] };
    acc[key].projects.push(p);
    return acc;
  }, {} as Record<string, { code: string | null; projects: Project[] }>);

  return (
    <View className="px-4">
      {Object.entries(grouped).map(([courseName, { code, projects: courseProjects }]) => (
        <View key={courseName} className="mb-6">
          {/* Ders Başlığı */}
          <View className="flex-row items-center gap-2 mb-3">
            {code && (
              <View className="rounded-lg bg-indigo-900/40 border border-indigo-500/20 px-2 py-0.5">
                <Text className="text-xs font-bold text-indigo-400">{code}</Text>
              </View>
            )}
            <Text className="text-sm font-bold text-white">{courseName}</Text>
            <View className="flex-1 h-px bg-slate-700/60" />
            <Text className="text-xs text-gray-500">{courseProjects.length} proje</Text>
          </View>

          {/* Tablo */}
          <View className="rounded-2xl border border-slate-700/60 bg-slate-900 overflow-hidden">
            {/* Başlık */}
            <View className="flex-row bg-slate-800/80 px-3 py-2 border-b border-slate-700/60">
              <Text className="text-xs font-bold text-gray-400 w-20">Öğrenci</Text>
              <Text className="text-xs font-bold text-gray-400 flex-1">Proje</Text>
              <Text className="text-xs font-bold text-gray-400 w-20 text-center">Durum</Text>
              <Text className="text-xs font-bold text-gray-400 w-20 text-right">İşlem</Text>
            </View>

            {/* Satırlar */}
            {courseProjects.map((p, idx) => {
              const st = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.draft;
              const isPending = p.status?.toLowerCase() === 'pending';
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => onOpenDetail(p.id)}
                  className={`flex-row items-center px-3 py-2.5 ${idx < courseProjects.length - 1 ? 'border-b border-slate-700/40' : ''}`}
                >
                  {/* Öğrenci */}
                  <View className="w-20 pr-1">
                    <Text className="text-xs text-gray-300" numberOfLines={1}>{p.created_by_name || '—'}</Text>
                  </View>

                  {/* Proje (başlık + açıklama önizleme) */}
                  <View className="flex-1 pr-2">
                    <Text className="text-xs text-white font-medium" numberOfLines={1}>{p.title}</Text>
                    <Text className="text-[11px] text-gray-500 mt-0.5" numberOfLines={1}>{p.description}</Text>
                  </View>

                  {/* Durum — sadece ikon */}
                  <View className="w-20 items-center justify-center">
                    <View className="h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: st.bg }}>
                      {STATUS_ICON[p.status]}
                    </View>
                  </View>

                  {/* İşlem */}
                  <View className="w-20 flex-row items-center justify-end gap-1.5">
                    {isPending ? (
                      <>
                        <TouchableOpacity
                          onPress={() => onApprove(p.id)}
                          className="h-7 w-7 items-center justify-center rounded-lg bg-emerald-900/30 border border-emerald-800/50"
                        >
                          <CheckCircle2 size={12} color="#34d399" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => onReject(p.id)}
                          className="h-7 w-7 items-center justify-center rounded-lg bg-red-900/30 border border-red-800/50"
                        >
                          <XCircle size={12} color="#f87171" />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <ChevronRight size={16} color="#475569" />
                    )}
                    {role === 'ADMIN' && (
                      <TouchableOpacity
                        onPress={() => onHardDelete(p.id, p.title)}
                        className="h-7 w-7 items-center justify-center rounded-lg bg-red-900/30 border border-red-800/50"
                      >
                        <Trash2 size={12} color="#f87171" />
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}

      {/* Arşivlenmiş Projeler — ayrı liste */}
      {archived.length > 0 && (
        <View className="mt-2 mb-4">
          <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Arşivlenmiş Projeler</Text>
          {archived.map((p) => (
            <View
              key={`arch-${p.id}`}
              className="mb-2 flex-row items-center gap-2 rounded-xl border border-slate-700/40 bg-slate-900/40 px-3 py-2.5"
            >
              <Archive size={14} color="#64748b" />
              <View className="flex-1">
                <Text className="text-xs text-gray-300 font-medium" numberOfLines={1}>{p.title}</Text>
                <Text className="text-[11px] text-gray-500" numberOfLines={1}>{p.course_name ?? 'Ders Atanmamış'}</Text>
              </View>
              <TouchableOpacity onPress={() => onUnarchive(p.id)} className="rounded-lg bg-slate-800 px-2 py-1.5">
                <RotateCcw size={12} color="#94a3b8" />
              </TouchableOpacity>
              {role === 'ADMIN' && (
                <TouchableOpacity onPress={() => onHardDelete(p.id, p.title)} className="rounded-lg bg-red-900/30 px-2 py-1.5">
                  <Trash2 size={12} color="#f87171" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export const ProjectListScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const role = user?.role?.toUpperCase() ?? '';
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('active');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const params: Record<string, string> = { size: '100' };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const { data } = await apiClient.get<PaginatedResponse<Project>>('/api/v1/projects', { params });
      setProjects(data.items);
    } catch (error) {
      Alert.alert('Hata', safeErrorMsg(error, 'Projeler yüklenemedi.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [search, statusFilter]);

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

  const handleArchive = async (projectId: string, title: string) => {
    Alert.alert('Arşivle', `"${title}" projesini arşivlemek istediğinize emin misiniz?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Arşivle', style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.post(`/api/v1/projects/${projectId}/archive`);
            fetchProjects();
          } catch (error) {
            Alert.alert('Hata', safeErrorMsg(error, 'Arşivleme başarısız.'));
          }
        },
      },
    ]);
  };

  const handleUnarchive = async (projectId: string) => {
    try {
      await apiClient.post(`/api/v1/projects/${projectId}/unarchive`);
      fetchProjects();
    } catch (error) {
      Alert.alert('Hata', safeErrorMsg(error, 'İşlem başarısız.'));
    }
  };

  const copyShareCode = (code: string) => {
    Clipboard.setString(code);
    Alert.alert('Kopyalandı', `Bağlantı kodu kopyalandı: ${code}`);
  };

  const handleHardDelete = async (projectId: string, title: string) => {
    Alert.alert(
      '⚠️ Kalıcı Silme',
      `"${title}" projesini KALICI olarak silmek istediğinize emin misiniz? Bu işlem GERİ ALINAMAZ!`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kalıcı Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/api/v1/projects/${projectId}/hard`);
              Alert.alert('Başarılı', 'Proje kalıcı olarak silindi.');
              fetchProjects();
            } catch (error) {
              Alert.alert('Hata', safeErrorMsg(error, 'Kalıcı silme başarısız.'));
            }
          },
        },
      ],
    );
  };

  const filteredProjects = projects.filter(p =>
    viewMode === 'archived' ? p.is_archived : !p.is_archived
  );

  // Projeleri ders → kategori bazlı grupla
  type GroupedData = Record<string, {
    code: string | null;
    categories: Record<string, { categoryName: string | null; color: string | null; projects: Project[] }>;
  }>;

  const grouped = filteredProjects.reduce<GroupedData>((acc, project) => {
    const courseKey = project.course_name ?? 'Ders Atanmamış';
    const catKey = project.category_id ?? '__uncategorized__';

    if (!acc[courseKey]) {
      acc[courseKey] = { code: project.course_code ?? null, categories: {} };
    }
    if (!acc[courseKey].categories[catKey]) {
      acc[courseKey].categories[catKey] = {
        categoryName: null,
        color: null,
        projects: [],
      };
    }
    acc[courseKey].categories[catKey].projects.push(project);
    return acc;
  }, {});

  if (loading) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center">
        <Text className="text-gray-400">Projeler yükleniyor...</Text>
      </View>
    );
  }

  const isStaff = role === 'TEACHER' || role === 'ADMIN';

  return (
    <ScrollView
      className="flex-1 bg-slate-950"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProjects(); }} tintColor="#818cf8" />}
    >
      {/* Başlık + Ekle Butonu */}
      <View className="px-4 pt-4 pb-2 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-white">
            {isStaff ? 'Projeler' : 'Projelerim'}
          </Text>
          <Text className="text-xs text-gray-500 mt-0.5">
            {(isStaff ? projects.length : filteredProjects.length)} proje
          </Text>
        </View>
        {role === 'STUDENT' && (
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              className="h-10 w-10 items-center justify-center rounded-xl bg-indigo-600"
              onPress={() => navigation.navigate('ProjectCreate')}
            >
              <Plus size={20} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity
              className="h-10 w-10 items-center justify-center rounded-xl border border-indigo-500/40 bg-indigo-500/10"
              onPress={() => navigation.navigate('JoinProject')}
            >
              <Link2 size={18} color="#818cf8" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Filtre Çubuğu */}
      <View className="px-4 pb-3 gap-2">
        <View className="flex-row items-center bg-slate-800 rounded-xl px-3 gap-2">
          <Search size={14} color="#64748b" />
          <TextInput
            className="flex-1 py-2.5 text-sm text-gray-200"
            placeholder="Proje ara..."
            placeholderTextColor="#64748b"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={14} color="#64748b" />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          onPress={() => setShowStatusModal(true)}
          className="flex-row items-center justify-between bg-slate-800 rounded-xl px-3 py-2.5"
        >
          <Text className={`text-sm ${statusFilter ? 'text-indigo-300' : 'text-gray-500'}`}>
            {PROJECT_STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? 'Tüm Durumlar'}
          </Text>
          <ChevronDown size={14} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Staff → tablo görünümü, Öğrenci → kart görünümü */}
      {isStaff ? (
        <ProjectTableView
          projects={projects}
          role={role}
          onOpenDetail={(id) => navigation.navigate('ProjectDetail', { projectId: id })}
          onApprove={handleApprove}
          onReject={handleReject}
          onUnarchive={handleUnarchive}
          onHardDelete={handleHardDelete}
        />
      ) : (
       <>
      {/* Aktif / Arşiv Tab */}
      <View className="flex-row mx-4 mb-4 rounded-xl bg-slate-900 p-1">
        {(['active', 'archived'] as ViewMode[]).map((mode) => (
          <TouchableOpacity
            key={mode}
            className={`flex-1 items-center py-2 rounded-lg ${viewMode === mode ? 'bg-indigo-600' : ''}`}
            onPress={() => setViewMode(mode)}
          >
            <Text className={`text-xs font-semibold ${viewMode === mode ? 'text-white' : 'text-gray-400'}`}>
              {mode === 'active' ? 'Aktif' : '🗄 Arşiv'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Boş Durum */}
      {filteredProjects.length === 0 ? (
        <View className="mt-16 items-center px-8">
          <View className="h-20 w-20 rounded-full bg-slate-900 items-center justify-center mb-4">
            {viewMode === 'archived'
              ? <Archive size={36} color="#475569" />
              : <FolderKanban size={36} color="#475569" />}
          </View>
          <Text className="text-base font-semibold text-gray-400 text-center">
            {viewMode === 'archived' ? 'Arşivlenmiş proje yok' : (isStaff ? 'Henüz proje yok' : 'Henüz bir proje oluşturmadınız')}
          </Text>
        </View>
      ) : (
        <View className="px-4">
          {Object.entries(grouped).map(([courseName, { code, categories }]) => (
            <View key={courseName} className="mb-6">
              {/* Ders Başlığı */}
              <View className="flex-row items-center gap-2 mb-3">
                {code && (
                  <View className="rounded-lg bg-indigo-900/40 border border-indigo-500/20 px-2 py-0.5">
                    <Text className="text-xs font-bold text-indigo-400">{code}</Text>
                  </View>
                )}
                <Text className="text-sm font-bold text-white">{courseName}</Text>
                <View className="flex-1 h-px bg-slate-700/60" />
              </View>

              {/* Kategoriler */}
              {Object.entries(categories).map(([catKey, { categoryName, color, projects: catProjects }]) => (
                <View key={catKey} className="mb-4">
                  {/* Kategori Etiketi */}
                  {catKey !== '__uncategorized__' && (
                    <View className="flex-row items-center gap-1.5 mb-2 ml-1">
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color ?? '#818cf8' }} />
                      <Text className="text-xs font-semibold text-gray-400">{categoryName ?? 'Kategori'}</Text>
                    </View>
                  )}

                  {catProjects.map((project) => {
                    const st = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.draft;
                    const isManager = project.created_by === user?.id;

                    return (
                      <View
                        key={project.id}
                        className="mb-3 rounded-2xl border border-slate-700/80 bg-slate-900 overflow-hidden"
                        style={{ shadowColor: st.accent, shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}
                      >
                        {/* Renkli üst şerit */}
                        <View style={{ height: 3, backgroundColor: st.accent }} />

                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => navigation.navigate('ProjectDetail', { projectId: project.id })}
                        >
                          <View className="p-4">
                            {/* Durum + Arşiv badge */}
                            <View className="flex-row items-center justify-between mb-2">
                              <View
                                className="flex-row items-center gap-1.5 rounded-lg px-2.5 py-1"
                                style={{ backgroundColor: st.bg }}
                              >
                                {STATUS_ICON[project.status]}
                                <Text className="text-xs font-semibold" style={{ color: st.text }}>{st.label}</Text>
                              </View>
                              {project.is_archived && (
                                <View className="flex-row items-center gap-1 rounded-lg bg-slate-800 px-2 py-0.5">
                                  <Archive size={10} color="#64748b" />
                                  <Text className="text-xs text-gray-500">Arşiv</Text>
                                </View>
                              )}
                              <ChevronRight size={16} color="#475569" />
                            </View>

                            {/* Başlık */}
                            <Text className="text-base font-bold text-white mb-1" numberOfLines={1}>
                              {project.title}
                            </Text>

                            {/* Açıklama */}
                            <Text className="text-xs text-gray-400 leading-4 mb-3" numberOfLines={2}>
                              {project.description}
                            </Text>

                            {/* Alt Satır: Share code + Üyeler */}
                            <View className="flex-row items-center justify-between">
                              {/* Share Kodu */}
                              {project.share_code && (
                                <TouchableOpacity
                                  className="flex-row items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1.5"
                                  onPress={() => copyShareCode(project.share_code!)}
                                >
                                  <Link2 size={11} color="#818cf8" />
                                  <Text className="text-xs font-mono text-indigo-400">{project.share_code}</Text>
                                </TouchableOpacity>
                              )}

                              {/* Üye davet butonu (yönetici öğrenci) */}
                              {role === 'STUDENT' && isManager && (
                                <TouchableOpacity
                                  className="flex-row items-center gap-1 rounded-lg bg-indigo-900/40 border border-indigo-500/20 px-2.5 py-1.5"
                                  onPress={() => navigation.navigate('ProjectDetail', { projectId: project.id, openMembers: true })}
                                >
                                  <Users size={11} color="#818cf8" />
                                  <Text className="text-xs text-indigo-400 font-semibold">Üyeler</Text>
                                </TouchableOpacity>
                              )}
                            </View>

                            {/* Teacher: Onay / Red butonları */}
                            {isStaff && project.status?.toLowerCase() === 'pending' && (
                              <View className="flex-row gap-2 mt-3">
                                <TouchableOpacity
                                  className="flex-1 rounded-xl bg-emerald-700 py-2.5 items-center"
                                  onPress={() => handleApprove(project.id)}
                                >
                                  <Text className="text-white text-xs font-bold">Onayla</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  className="flex-1 rounded-xl border border-red-800/40 bg-red-900/20 py-2.5 items-center"
                                  onPress={() => handleReject(project.id)}
                                >
                                  <Text className="text-red-400 text-xs font-bold">Reddet</Text>
                                </TouchableOpacity>
                              </View>
                            )}

                            {/* Teacher/Admin: Arşivle / Arşivden Çıkar */}
                            {isStaff && (
                              <View className="mt-2">
                                {project.is_archived ? (
                                  <TouchableOpacity
                                    className="rounded-xl bg-slate-800 py-2 items-center mt-1"
                                    onPress={() => handleUnarchive(project.id)}
                                  >
                                    <Text className="text-gray-400 text-xs font-semibold">Arşivden Çıkar</Text>
                                  </TouchableOpacity>
                                ) : (
                                  <TouchableOpacity
                                    className="rounded-xl bg-slate-800/50 py-2 items-center mt-1"
                                    onPress={() => handleArchive(project.id, project.title)}
                                  >
                                    <Text className="text-gray-500 text-xs">Arşivle</Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            )}

                            {/* Admin: Kalıcı Sil */}
                            {role === 'ADMIN' && (
                              <TouchableOpacity
                                className="mt-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-red-600/40 bg-red-600/10 py-2"
                                onPress={() => handleHardDelete(project.id, project.title)}
                              >
                                <Trash2 size={12} color="#f87171" />
                                <Text className="text-red-400 text-xs font-semibold">Kalıcı Sil</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
       </>
      )}

      <View className="h-8" />

      {/* Durum Filtre Modal */}
      <Modal visible={showStatusModal} transparent animationType="slide" onRequestClose={() => setShowStatusModal(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="rounded-t-2xl bg-slate-900 px-4 pb-8 pt-4">
            <Text className="text-base font-bold text-white mb-3">Durum Filtresi</Text>
            {PROJECT_STATUS_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => { setStatusFilter(opt.value); setShowStatusModal(false); }}
                className={`rounded-xl px-4 py-3 mb-1 ${statusFilter === opt.value ? 'bg-indigo-900/40' : 'bg-slate-800'}`}
              >
                <Text className={`text-sm ${statusFilter === opt.value ? 'font-semibold text-indigo-300' : 'text-gray-300'}`}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};
