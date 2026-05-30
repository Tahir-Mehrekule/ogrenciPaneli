import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl,
  TouchableOpacity, Alert, Modal, TextInput, Linking,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../lib/apiClient';
import { FileText, Plus, Paperclip, CheckCircle2, Clock, Circle, Search, X, ChevronDown, Trash2, RotateCcw, Archive, Sparkles } from 'lucide-react-native';
import { Report } from '../../types/report';
import { PaginatedResponse } from '../../types/course';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; accent: string }> = {
  draft:     { label: 'Taslak',        bg: 'bg-slate-800',      text: 'text-slate-300',  accent: '#475569' },
  submitted: { label: 'Teslim Edildi', bg: 'bg-amber-900/30',   text: 'text-amber-400',  accent: '#f59e0b' },
  reviewed:  { label: 'İncelendi',     bg: 'bg-emerald-900/30', text: 'text-emerald-400',accent: '#10b981' },
};

const STATUS_ICON = (status: string) => {
  if (status === 'reviewed') return <CheckCircle2 size={12} color="#10b981" />;
  if (status === 'submitted') return <Clock size={12} color="#f59e0b" />;
  return <Circle size={12} color="#475569" />;
};

const safeErrorMsg = (error: any, fallback: string) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d: any) => d.msg).join('\n');
  return fallback;
};

// ── Teacher Tablo Görünümü ────────────────────────────────────────────────────
const TeacherTableView = ({ reports, onDelete, onHardDelete, onRestore, role, onOpenDetail }: { reports: Report[]; onDelete: (id: string, content: string) => void; onHardDelete?: (id: string, content: string) => void; onRestore?: (id: string) => void; role: string; onOpenDetail: (r: Report) => void }) => {
  if (reports.length === 0) {
    return (
      <View className="mt-16 items-center px-8">
        <FileText size={40} color="#334155" />
        <Text className="text-gray-500 mt-4 text-center">Henüz teslim edilmiş rapor yok.</Text>
      </View>
    );
  }

  // Derse göre grupla
  const grouped = reports.reduce((acc, r) => {
    const key = r.course_name ?? 'Ders Atanmamış';
    if (!acc[key]) acc[key] = { code: r.course_code ?? null, reports: [] };
    acc[key].reports.push(r);
    return acc;
  }, {} as Record<string, { code: string | null; reports: Report[] }>);

  return (
    <View className="px-4">
      {Object.entries(grouped).map(([courseName, { code, reports: courseReports }]) => (
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
            <Text className="text-xs text-gray-500">{courseReports.length} rapor</Text>
          </View>

          {/* Tablo */}
          <View className="rounded-2xl border border-slate-700/60 bg-slate-900 overflow-hidden">
            {/* Tablo Başlığı */}
            <View className="flex-row bg-slate-800/80 px-3 py-2 border-b border-slate-700/60">
              <Text className="text-xs font-bold text-gray-400 w-24">Öğrenci</Text>
              <Text className="text-xs font-bold text-gray-400 flex-1">Proje</Text>
              <Text className="text-xs font-bold text-gray-400 w-10 text-center">Hafta</Text>
              <Text className="text-xs font-bold text-gray-400 w-24 text-center">Durum</Text>
              <Text className="text-xs font-bold text-gray-400 w-16 text-right">İşlem</Text>
            </View>

            {/* Tablo Satırları */}
            {courseReports.map((report, idx) => {
              const st = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.draft;
              return (
                <TouchableOpacity
                  key={report.id}
                  onPress={() => onOpenDetail(report)}
                  className={`flex-row items-center px-3 py-2.5 ${idx < courseReports.length - 1 ? 'border-b border-slate-700/40' : ''}`}
                >
                  {/* Öğrenci adı */}
                  <View className="w-24">
                    <Text className="text-xs text-gray-300" numberOfLines={1}>
                      {report.submitted_by_name || '—'}
                    </Text>
                  </View>

                  {/* Proje */}
                  <View className="flex-1 pr-2">
                    <Text className="text-xs text-white font-medium" numberOfLines={1}>
                      {report.project_title || 'İsimsiz Proje'}
                    </Text>
                    <Text className="text-[11px] text-gray-500 mt-0.5" numberOfLines={1}>
                      {report.content.slice(0, 30)}{report.content.length > 30 ? '…' : ''}
                    </Text>
                    {report.reviewer_note && (
                      <Text className="text-xs text-emerald-400 mt-0.5" numberOfLines={1}>
                        💬 {report.reviewer_note}
                      </Text>
                    )}
                  </View>

                  {/* Hafta */}
                  <View className="w-10 items-center">
                    <View className="rounded-lg bg-slate-800 px-1.5 py-0.5">
                      <Text className="text-xs text-gray-400 text-center">{report.week_number}</Text>
                    </View>
                  </View>

                  {/* Durum */}
                  <View className="w-24 items-center justify-center">
                    <View className={`flex-row items-center justify-center gap-1 rounded-lg px-1.5 py-1 ${st.bg}`}>
                      {STATUS_ICON(report.status)}
                      <Text className={`text-[10px] font-bold ${st.text}`} numberOfLines={1}>{st.label}</Text>
                    </View>
                  </View>

                  {/* İşlem */}
                  <View className="w-16 flex-row items-center justify-end gap-1.5">
                    {/* Arşivle (Soft Delete) */}
                    <TouchableOpacity
                      onPress={() => onDelete(report.id, report.content.slice(0, 30))}
                      className="h-7 w-7 items-center justify-center rounded-lg bg-amber-900/30 border border-amber-800/50"
                    >
                      <Archive size={12} color="#fbbf24" />
                    </TouchableOpacity>

                    {/* Kalıcı Sil (Hard Delete) - Sadece ADMIN */}
                    {role === 'ADMIN' && onHardDelete && (
                      <TouchableOpacity
                        onPress={() => onHardDelete(report.id, report.content.slice(0, 30))}
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

      {/* Admin: Kalıcı Sil + Geri Yükle alanı */}
      {role === 'ADMIN' && reports.some(r => (r as any).is_deleted) && (
        <View className="mt-4 px-4">
          <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Silinmiş Raporlar</Text>
          {reports.filter(r => (r as any).is_deleted).map(report => (
            <View key={`deleted-${report.id}`} className="mb-2 flex-row items-center gap-2 rounded-xl border border-red-800/30 bg-red-900/10 px-3 py-2">
              <Text className="flex-1 text-xs text-gray-400" numberOfLines={1}>{report.content.slice(0, 40)}…</Text>
              <TouchableOpacity onPress={() => onRestore?.(report.id)} className="rounded-lg bg-emerald-900/30 px-2 py-1">
                <RotateCcw size={12} color="#10b981" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onHardDelete?.(report.id, report.content.slice(0, 30))} className="rounded-lg bg-red-900/30 px-2 py-1">
                <Trash2 size={12} color="#f87171" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

// ── Öğrenci Kart Görünümü ─────────────────────────────────────────────────────
const StudentCardView = ({ reports, navigation, user, onSubmit, onFileUpload, onDelete, aiAnalysis, aiLoading, onAnalyze, onOpenDetail }: any) => {
  if (reports.length === 0) {
    return (
      <View className="mt-16 items-center px-8">
        <FileText size={40} color="#334155" />
        <Text className="text-gray-500 mt-4 text-center">Henüz rapor oluşturmadınız.</Text>
      </View>
    );
  }

  const grouped = reports.reduce((acc: any, report: Report) => {
    const key = report.course_name ?? 'Ders Atanmamış';
    if (!acc[key]) acc[key] = { code: report.course_code ?? null, reports: [] };
    acc[key].reports.push(report);
    return acc;
  }, {} as Record<string, { code: string | null; reports: Report[] }>);

  return (
    <View className="px-4">
      {Object.entries(grouped).map(([courseName, { code, reports: courseReports }]: any) => (
        <View key={courseName} className="mb-4">
          <View className="flex-row items-center gap-2 mb-3">
            {code && (
              <View className="rounded-lg bg-indigo-900/40 border border-indigo-500/20 px-2 py-0.5">
                <Text className="text-xs font-bold text-indigo-400">{code}</Text>
              </View>
            )}
            <Text className="text-sm font-semibold text-gray-300">{courseName}</Text>
            <View className="flex-1 h-px bg-slate-700" />
            <Text className="text-xs text-gray-500">{courseReports.length} rapor</Text>
          </View>

          {courseReports.map((report: Report) => {
            const status = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.draft;
            return (
              <View
                key={report.id}
                className="mb-3 rounded-2xl border border-slate-700/80 bg-slate-900 overflow-hidden"
                style={{ shadowColor: status.accent, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}
              >
                <View style={{ height: 3, backgroundColor: status.accent }} />
                <View className="p-4">
                  <TouchableOpacity activeOpacity={0.7} onPress={() => onOpenDetail(report)}>
                  <View className="flex-row items-center justify-between mb-3">
                    <View className={`flex-row items-center gap-1.5 rounded-lg px-2.5 py-1 ${status.bg}`}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: status.accent }} />
                      <Text className={`text-xs font-semibold ${status.text}`}>{status.label}</Text>
                    </View>
                    <View className="rounded-lg bg-slate-800 px-2.5 py-1">
                      <Text className="text-xs text-gray-400">{report.year} · {report.week_number}. Hafta</Text>
                    </View>
                  </View>

                  {report.project_title && (
                    <Text className="text-xs font-semibold text-indigo-300 mb-1" numberOfLines={1}>
                      📁 {report.project_title}
                    </Text>
                  )}
                  <Text className="text-sm text-gray-200 leading-5" numberOfLines={3}>{report.content}</Text>
                  </TouchableOpacity>

                  {report.youtube_url && (
                    <View className="mt-2 flex-row items-center gap-1.5 rounded-lg bg-red-900/20 border border-red-800/30 px-3 py-1.5">
                      <Text className="text-xs text-red-400">🎬 Video rapor mevcut</Text>
                    </View>
                  )}

                  {report.reviewer_note && (
                    <View className="mt-2 rounded-xl bg-emerald-900/20 border border-emerald-800/30 p-3">
                      <Text className="text-xs font-semibold text-emerald-400 mb-0.5">💬 Öğretmen Notu</Text>
                      <Text className="text-xs text-emerald-300">{report.reviewer_note}</Text>
                    </View>
                  )}

                  {aiAnalysis[report.id] && (
                    <View className="mt-3 rounded-xl bg-indigo-900/30 p-3 border border-indigo-500/30">
                      <Text className="text-indigo-400 font-bold mb-2 text-sm">🤖 Yapay Zeka Analizi</Text>
                      <Text className="text-gray-300 text-xs mb-2">{aiAnalysis[report.id].summary}</Text>
                      <Text className="text-emerald-400 text-xs font-bold mb-1">💪 Güçlü Yönler</Text>
                      {aiAnalysis[report.id].strengths?.map((s: string, i: number) => (
                        <Text key={i} className="text-gray-400 text-xs ml-2 mb-0.5">• {s}</Text>
                      ))}
                      <Text className="text-amber-400 text-xs font-bold mt-2 mb-1">⚠️ Gelişime Açık</Text>
                      {aiAnalysis[report.id].weaknesses?.map((w: string, i: number) => (
                        <Text key={i} className="text-gray-400 text-xs ml-2 mb-0.5">• {w}</Text>
                      ))}
                    </View>
                  )}

                    <View className="mt-3 flex-row gap-2">
                    <TouchableOpacity
                      className="flex-1 rounded-lg bg-slate-800 py-2.5 items-center justify-center flex-row gap-1.5"
                      onPress={() => onFileUpload(report.id)}
                    >
                      <Paperclip size={12} color="#818cf8" />
                      <Text className="text-indigo-400 text-xs font-semibold">Dosya Ekle</Text>
                    </TouchableOpacity>

                    {report.status === 'draft' && (
                      <TouchableOpacity
                        className="flex-1 rounded-lg bg-indigo-600 py-2.5 items-center justify-center"
                        onPress={() => onSubmit(report.id)}
                      >
                        <Text className="text-white text-xs font-semibold">Teslim Et</Text>
                      </TouchableOpacity>
                    )}

                    {report.status === 'draft' && (
                      <TouchableOpacity
                        className="rounded-lg bg-red-900/20 border border-red-800/30 py-2.5 px-3 items-center justify-center"
                        onPress={() => onDelete(report.id, report.content.slice(0, 30))}
                      >
                        <Trash2 size={14} color="#f87171" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {report.status !== 'draft' && !aiAnalysis[report.id] && (
                    <TouchableOpacity
                      className="mt-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30 py-2.5 items-center"
                      disabled={aiLoading[report.id]}
                      onPress={() => onAnalyze(report.id)}
                    >
                      <Text className="text-indigo-400 text-xs font-bold">
                        {aiLoading[report.id] ? 'Analiz ediliyor...' : 'AI ile Analiz Et'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const REPORT_STATUS_OPTIONS = [
  { label: 'Tüm Durumlar', value: '' },
  { label: 'Taslak', value: 'draft' },
  { label: 'Teslim Edildi', value: 'submitted' },
  { label: 'İncelendi', value: 'reviewed' },
];

const WEEK_OPTIONS = [
  { label: 'Tüm Haftalar', value: '' },
  ...Array.from({ length: 14 }, (_, i) => ({ label: `${i + 1}. Hafta`, value: String(i + 1) })),
];

// ── Ana Ekran ─────────────────────────────────────────────────────────────────
export const ReportListScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const role = user?.role?.toUpperCase() ?? '';
  const isStaff = role === 'TEACHER' || role === 'ADMIN';
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, any>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [weekFilter, setWeekFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [courseOptions, setCourseOptions] = useState<{ id: string; name: string; code: string }[]>([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showWeekModal, setShowWeekModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);

  // Rapor detay
  const [viewReport, setViewReport] = useState<Report | null>(null);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [aiTone, setAiTone] = useState<'constructive' | 'encouraging' | 'critical'>('constructive');
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);

  // Staff: ders filtresi için öğretmenin derslerini çek
  useEffect(() => {
    if (!isStaff) return;
    apiClient
      .get('/api/v1/courses', { params: { size: 100 } })
      .then(({ data }) => setCourseOptions(data.items ?? data ?? []))
      .catch(() => setCourseOptions([]));
  }, [isStaff]);

  const fetchReports = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (weekFilter) params.week_number = weekFilter;
      if (courseFilter) params.course_id = courseFilter;
      const { data } = await apiClient.get<PaginatedResponse<Report>>('/api/v1/reports', { params });
      setReports(data.items);
    } catch (error) {
      Alert.alert('Hata', safeErrorMsg(error, 'Raporlar yüklenemedi.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, statusFilter, weekFilter, courseFilter]);

  useEffect(() => { fetchReports(); }, [search, statusFilter, weekFilter, courseFilter]);

  const handleSubmit = async (reportId: string) => {
    try {
      await apiClient.post(`/api/v1/reports/${reportId}/submit`);
      Alert.alert('Başarılı', 'Rapor öğretmenine teslim edildi!');
      fetchReports();
    } catch (error) {
      Alert.alert('Hata', safeErrorMsg(error, 'Teslim başarısız.'));
    }
  };

  const handleFileUpload = async (reportId: string) => {
    try {
      const DocumentPicker = require('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.length > 0) {
        const file = result.assets[0];
        const formData = new FormData();
        formData.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' } as any);
        await apiClient.post(`/api/v1/reports/${reportId}/files`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        Alert.alert('Başarılı', 'Dosya rapora başarıyla eklendi!');
      }
    } catch (err) {
      Alert.alert('Hata', safeErrorMsg(err, 'Dosya yüklenirken bir hata oluştu.'));
    }
  };

  const handleAnalyze = async (reportId: string) => {
    setAiLoading(prev => ({ ...prev, [reportId]: true }));
    try {
      const res = await apiClient.post('/api/v1/ai/analyze-report', { report_id: reportId });
      setAiAnalysis(prev => ({ ...prev, [reportId]: res.data }));
    } catch (err) {
      Alert.alert('Hata', safeErrorMsg(err, 'Analiz yapılamadı.'));
    } finally {
      setAiLoading(prev => ({ ...prev, [reportId]: false }));
    }
  };

  const handleDeleteReport = (reportId: string, content: string) => {
    Alert.alert(
      'Raporu Sil',
      `"${content}..." raporunu silmek istediğinize emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/api/v1/reports/${reportId}`);
              Alert.alert('Başarılı', 'Rapor silindi.');
              fetchReports();
            } catch (error) {
              Alert.alert('Hata', safeErrorMsg(error, 'Silme başarısız.'));
            }
          },
        },
      ],
    );
  };

  const handleHardDeleteReport = (reportId: string, content: string) => {
    Alert.alert(
      '⚠️ Kalıcı Silme',
      `"${content}..." raporunu KALICI olarak silmek istediğinize emin misiniz? Bu işlem GERİ ALINAMAZ!`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kalıcı Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/api/v1/reports/${reportId}/hard`);
              Alert.alert('Başarılı', 'Rapor kalıcı olarak silindi.');
              fetchReports();
            } catch (error) {
              Alert.alert('Hata', safeErrorMsg(error, 'Kalıcı silme başarısız.'));
            }
          },
        },
      ],
    );
  };

  const handleRestoreReport = async (reportId: string) => {
    try {
      await apiClient.post(`/api/v1/reports/${reportId}/restore`);
      Alert.alert('Başarılı', 'Rapor geri yüklendi.');
      fetchReports();
    } catch (error) {
      Alert.alert('Hata', safeErrorMsg(error, 'Geri yükleme başarısız.'));
    }
  };

  const openDetail = (r: Report) => {
    setViewReport(r);
    setShowFeedbackForm(false);
    setFeedbackNote('');
  };

  // Öğretmen geri bildirimi gönder (SUBMITTED → REVIEWED)
  const handleFeedback = async () => {
    if (!viewReport || feedbackNote.trim().length < 5) return;
    setFeedbackLoading(true);
    try {
      const { data } = await apiClient.post(`/api/v1/reports/${viewReport.id}/review`, {
        reviewer_note: feedbackNote.trim(),
      });
      Alert.alert('Başarılı', 'Geri bildirim kaydedildi.');
      setShowFeedbackForm(false);
      setFeedbackNote('');
      setViewReport({ ...viewReport, ...data });
      fetchReports();
    } catch (error) {
      Alert.alert('Hata', safeErrorMsg(error, 'Geri bildirim gönderilemedi.'));
    } finally {
      setFeedbackLoading(false);
    }
  };

  // AI geri bildirim taslağı öner
  const handleAiSuggestFeedback = async () => {
    if (!viewReport) return;
    setAiSuggestLoading(true);
    try {
      const { data } = await apiClient.post<{ suggested_feedback: string }>(
        '/api/v1/ai/suggest-feedback',
        { report_id: viewReport.id, tone: aiTone }
      );
      setFeedbackNote(data.suggested_feedback);
    } catch (error) {
      Alert.alert('Hata', safeErrorMsg(error, 'AI önerisi alınamadı.'));
    } finally {
      setAiSuggestLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center">
        <Text className="text-gray-400">Raporlar yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-950"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchReports(); }} tintColor="#818cf8" />}
    >
      {/* Başlık */}
      <View className="px-4 pt-4 pb-2 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-white">
            {isStaff ? 'Gelen Raporlar' : 'Haftalık Raporlarım'}
          </Text>
          <Text className="text-xs text-gray-500 mt-0.5">{reports.length} rapor</Text>
        </View>
        {!isStaff && (
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-xl bg-indigo-600"
            onPress={() => navigation.navigate('ReportCreate')}
          >
            <Plus size={20} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtre Çubuğu */}
      <View className="px-4 pb-3 gap-2">
        <View className="flex-row items-center bg-slate-800 rounded-xl px-3 gap-2">
          <Search size={14} color="#64748b" />
          <TextInput
            className="flex-1 py-2.5 text-sm text-gray-200"
            placeholder="Ara..."
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

        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => setShowStatusModal(true)}
            className="flex-1 flex-row items-center justify-between bg-slate-800 rounded-xl px-3 py-2.5"
          >
            <Text className={`text-sm ${statusFilter ? 'text-indigo-300' : 'text-gray-500'}`} numberOfLines={1}>
              {REPORT_STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? 'Tüm Durumlar'}
            </Text>
            <ChevronDown size={14} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowWeekModal(true)}
            className="flex-1 flex-row items-center justify-between bg-slate-800 rounded-xl px-3 py-2.5"
          >
            <Text className={`text-sm ${weekFilter ? 'text-indigo-300' : 'text-gray-500'}`} numberOfLines={1}>
              {WEEK_OPTIONS.find((o) => o.value === weekFilter)?.label ?? 'Tüm Haftalar'}
            </Text>
            <ChevronDown size={14} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Ders filtresi — staff (birden fazla ders veren öğretmen için) */}
        {isStaff && courseOptions.length > 0 && (
          <TouchableOpacity
            onPress={() => setShowCourseModal(true)}
            className="flex-row items-center justify-between bg-slate-800 rounded-xl px-3 py-2.5"
          >
            <Text className={`text-sm ${courseFilter ? 'text-indigo-300' : 'text-gray-500'}`} numberOfLines={1}>
              {courseFilter
                ? (() => {
                    const c = courseOptions.find((o) => o.id === courseFilter);
                    return c ? `${c.code} — ${c.name}` : 'Ders';
                  })()
                : 'Tüm Dersler'}
            </Text>
            <ChevronDown size={14} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>

      {/* İçerik: Teacher → Tablo, Student → Kart */}
      {isStaff ? (
        <TeacherTableView
          reports={reports}
          onDelete={handleDeleteReport}
          onHardDelete={role === 'ADMIN' ? handleHardDeleteReport : undefined}
          onRestore={role === 'ADMIN' ? handleRestoreReport : undefined}
          role={role}
          onOpenDetail={openDetail}
        />
      ) : (
        <StudentCardView
          reports={reports}
          navigation={navigation}
          user={user}
          onSubmit={handleSubmit}
          onFileUpload={handleFileUpload}
          onDelete={handleDeleteReport}
          aiAnalysis={aiAnalysis}
          aiLoading={aiLoading}
          onAnalyze={handleAnalyze}
          onOpenDetail={openDetail}
        />
      )}

      <View className="h-8" />

      {/* Durum Filtre Modal */}
      <Modal visible={showStatusModal} transparent animationType="slide" onRequestClose={() => setShowStatusModal(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="rounded-t-2xl bg-slate-900 px-4 pb-8 pt-4">
            <Text className="text-base font-bold text-white mb-3">Durum Filtresi</Text>
            {REPORT_STATUS_OPTIONS.map((opt) => (
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

      {/* Hafta Filtre Modal */}
      <Modal visible={showWeekModal} transparent animationType="slide" onRequestClose={() => setShowWeekModal(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="rounded-t-2xl bg-slate-900 px-4 pb-8 pt-4" style={{ maxHeight: '70%' }}>
            <Text className="text-base font-bold text-white mb-3">Hafta Filtresi</Text>
            <ScrollView>
              {WEEK_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => { setWeekFilter(opt.value); setShowWeekModal(false); }}
                  className={`rounded-xl px-4 py-3 mb-1 ${weekFilter === opt.value ? 'bg-indigo-900/40' : 'bg-slate-800'}`}
                >
                  <Text className={`text-sm ${weekFilter === opt.value ? 'font-semibold text-indigo-300' : 'text-gray-300'}`}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Ders Filtre Modal (staff) */}
      <Modal visible={showCourseModal} transparent animationType="slide" onRequestClose={() => setShowCourseModal(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="rounded-t-2xl bg-slate-900 px-4 pb-8 pt-4" style={{ maxHeight: '70%' }}>
            <Text className="text-base font-bold text-white mb-3">Ders Filtresi</Text>
            <ScrollView>
              <TouchableOpacity
                onPress={() => { setCourseFilter(''); setShowCourseModal(false); }}
                className={`rounded-xl px-4 py-3 mb-1 ${courseFilter === '' ? 'bg-indigo-900/40' : 'bg-slate-800'}`}
              >
                <Text className={`text-sm ${courseFilter === '' ? 'font-semibold text-indigo-300' : 'text-gray-300'}`}>
                  Tüm Dersler
                </Text>
              </TouchableOpacity>
              {courseOptions.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => { setCourseFilter(c.id); setShowCourseModal(false); }}
                  className={`rounded-xl px-4 py-3 mb-1 ${courseFilter === c.id ? 'bg-indigo-900/40' : 'bg-slate-800'}`}
                >
                  <Text className={`text-sm ${courseFilter === c.id ? 'font-semibold text-indigo-300' : 'text-gray-300'}`}>
                    {c.code} — {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Rapor Detay Modal (web viewModal birebir) */}
      <Modal visible={!!viewReport} transparent animationType="slide" onRequestClose={() => setViewReport(null)}>
        <View className="flex-1 justify-end bg-black/60">
          <View className="rounded-t-3xl bg-slate-900 border-t border-slate-700" style={{ maxHeight: '90%' }}>
            {viewReport && (() => {
              const st = STATUS_CONFIG[viewReport.status] ?? STATUS_CONFIG.draft;
              return (
                <>
                  <View style={{ height: 3, backgroundColor: st.accent }} className="rounded-t-3xl" />
                  {/* Başlık */}
                  <View className="flex-row items-start justify-between px-5 pt-4 pb-3 border-b border-slate-800">
                    <View className="flex-1 pr-3">
                      <Text className="text-lg font-bold text-white" numberOfLines={1}>
                        {viewReport.course_name || 'Rapor Detayı'}
                      </Text>
                      {viewReport.project_title && (
                        <Text className="text-xs text-indigo-300 mt-0.5" numberOfLines={1}>📁 {viewReport.project_title}</Text>
                      )}
                      {isStaff && viewReport.submitted_by_name && (
                        <Text className="text-xs text-gray-300 mt-0.5" numberOfLines={1}>👤 {viewReport.submitted_by_name}</Text>
                      )}
                      <Text className="text-xs text-gray-500 mt-0.5">{viewReport.year} - {viewReport.week_number}. Hafta</Text>
                    </View>
                    <TouchableOpacity onPress={() => setViewReport(null)} className="p-1.5 rounded-lg bg-slate-800">
                      <X size={18} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView className="px-5 py-4" contentContainerStyle={{ paddingBottom: 24 }}>
                    {/* İçerik */}
                    <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Rapor İçeriği</Text>
                    <View className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-3 mb-4">
                      <Text className="text-sm text-gray-200 leading-5">{viewReport.content}</Text>
                    </View>

                    {/* YouTube */}
                    {viewReport.youtube_url && (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(viewReport.youtube_url!)}
                        className="flex-row items-center justify-center gap-2 rounded-xl bg-red-900/20 border border-red-800/30 py-3 mb-4"
                      >
                        <Text className="text-sm font-medium text-red-400">🎬 YouTube&apos;da İzle</Text>
                      </TouchableOpacity>
                    )}

                    {/* Öğretmen Geri Bildirimi */}
                    {viewReport.reviewer_note ? (
                      <View className="rounded-xl bg-emerald-900/10 border border-emerald-800/30 p-3 mb-4">
                        <Text className="text-xs font-semibold text-emerald-400 mb-1">💬 Değerlendirme Notu</Text>
                        <Text className="text-sm text-emerald-300">{viewReport.reviewer_note}</Text>
                      </View>
                    ) : isStaff && viewReport.status === 'submitted' && !showFeedbackForm ? (
                      <TouchableOpacity
                        onPress={() => setShowFeedbackForm(true)}
                        className="rounded-xl border border-dashed border-amber-700/40 py-3 mb-4 items-center"
                      >
                        <Text className="text-sm text-amber-400">+ Geri bildirim ekle</Text>
                      </TouchableOpacity>
                    ) : null}

                    {/* Geri Bildirim Formu */}
                    {isStaff && showFeedbackForm && (
                      <View className="mb-4">
                        <View className="flex-row items-center justify-between mb-2">
                          <Text className="text-sm font-medium text-amber-400">Geri Bildirim Yaz</Text>
                          <View className="flex-row items-center gap-1.5">
                            <TouchableOpacity
                              onPress={() => {
                                const tones = ['constructive', 'encouraging', 'critical'] as const;
                                const idx = tones.indexOf(aiTone);
                                setAiTone(tones[(idx + 1) % tones.length]);
                              }}
                              className="rounded-lg bg-slate-800 px-2 py-1"
                            >
                              <Text className="text-xs text-gray-300">
                                {aiTone === 'constructive' ? 'Yapıcı' : aiTone === 'encouraging' ? 'Cesaret verici' : 'Eleştirel'}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={handleAiSuggestFeedback}
                              disabled={aiSuggestLoading}
                              className="flex-row items-center gap-1 rounded-lg border border-indigo-700/40 bg-indigo-900/20 px-2 py-1"
                              style={{ opacity: aiSuggestLoading ? 0.5 : 1 }}
                            >
                              <Sparkles size={11} color="#a5b4fc" />
                              <Text className="text-xs text-indigo-300">{aiSuggestLoading ? 'Üretiliyor...' : 'AI ile Öner'}</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        <TextInput
                          value={feedbackNote}
                          onChangeText={setFeedbackNote}
                          multiline
                          numberOfLines={4}
                          placeholder="Öğrenciye geri bildirim yazın... (min 5 karakter)"
                          placeholderTextColor="#64748b"
                          className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-gray-200"
                          style={{ textAlignVertical: 'top', minHeight: 90 }}
                        />
                        <View className="flex-row justify-end gap-2 mt-2">
                          <TouchableOpacity onPress={() => { setShowFeedbackForm(false); setFeedbackNote(''); }} className="rounded-lg border border-slate-700 px-3 py-2">
                            <Text className="text-xs text-gray-400">Vazgeç</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={handleFeedback}
                            disabled={feedbackLoading || feedbackNote.trim().length < 5}
                            className="rounded-lg bg-amber-600 px-3 py-2"
                            style={{ opacity: feedbackLoading || feedbackNote.trim().length < 5 ? 0.5 : 1 }}
                          >
                            <Text className="text-xs font-semibold text-white">{feedbackLoading ? 'Gönderiliyor...' : 'Gönder'}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* AI Analiz */}
                    {viewReport.status !== 'draft' && (
                      <View className="mb-4">
                        {!aiAnalysis[viewReport.id] ? (
                          <TouchableOpacity
                            onPress={() => handleAnalyze(viewReport.id)}
                            disabled={aiLoading[viewReport.id]}
                            className="rounded-xl bg-blue-900/20 border border-blue-800/40 py-3 items-center"
                            style={{ opacity: aiLoading[viewReport.id] ? 0.5 : 1 }}
                          >
                            <Text className="text-sm font-semibold text-blue-400">
                              {aiLoading[viewReport.id] ? 'Analiz ediliyor...' : '✨ Yapay Zeka ile Analiz Et'}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <View className="rounded-xl bg-blue-900/10 border border-blue-800/30 p-3">
                            <Text className="text-sm font-bold text-blue-400 mb-2">🤖 Yapay Zeka Analizi</Text>
                            <Text className="text-xs text-gray-300 mb-2">{aiAnalysis[viewReport.id].summary}</Text>
                            <Text className="text-xs font-bold text-emerald-400 mb-1">💪 Güçlü Yönler</Text>
                            {aiAnalysis[viewReport.id].strengths?.map((s: string, i: number) => (
                              <Text key={i} className="text-xs text-gray-400 ml-2 mb-0.5">• {s}</Text>
                            ))}
                            <Text className="text-xs font-bold text-amber-400 mt-2 mb-1">⚠️ Gelişime Açık</Text>
                            {aiAnalysis[viewReport.id].weaknesses?.map((w: string, i: number) => (
                              <Text key={i} className="text-xs text-gray-400 ml-2 mb-0.5">• {w}</Text>
                            ))}
                            {aiAnalysis[viewReport.id].recommendations && (
                              <>
                                <Text className="text-xs font-bold text-indigo-400 mt-2 mb-1">🎯 Tavsiyeler</Text>
                                {aiAnalysis[viewReport.id].recommendations?.map((rec: string, i: number) => (
                                  <Text key={i} className="text-xs text-gray-400 ml-2 mb-0.5">• {rec}</Text>
                                ))}
                              </>
                            )}
                          </View>
                        )}
                      </View>
                    )}

                    {/* Footer aksiyonlar */}
                    <View className="flex-row gap-2">
                      {(isStaff || viewReport.status === 'draft') && (
                        <TouchableOpacity
                          onPress={() => { handleDeleteReport(viewReport.id, viewReport.content.slice(0, 30)); setViewReport(null); }}
                          className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-amber-900/20 border border-amber-800/40 py-3"
                        >
                          <Archive size={14} color="#fbbf24" />
                          <Text className="text-sm font-semibold text-amber-400">Sil</Text>
                        </TouchableOpacity>
                      )}
                      {role === 'ADMIN' && (
                        <TouchableOpacity
                          onPress={() => { handleHardDeleteReport(viewReport.id, viewReport.content.slice(0, 30)); setViewReport(null); }}
                          className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-red-900/20 border border-red-800/40 py-3"
                        >
                          <Trash2 size={14} color="#f87171" />
                          <Text className="text-sm font-semibold text-red-400">Kalıcı Sil</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </ScrollView>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};
