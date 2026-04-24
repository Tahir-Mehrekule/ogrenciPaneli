import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl,
  TouchableOpacity, Alert, Modal, TextInput,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../lib/apiClient';
import { FileText, Plus, Paperclip, CheckCircle2, Clock, Circle, Search, X, ChevronDown } from 'lucide-react-native';
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
const TeacherTableView = ({ reports }: { reports: Report[] }) => {
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
              <Text className="text-xs font-bold text-gray-400 w-12 text-center">Hafta</Text>
              <Text className="text-xs font-bold text-gray-400 w-20 text-right">Durum</Text>
            </View>

            {/* Tablo Satırları */}
            {courseReports.map((report, idx) => {
              const st = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.draft;
              return (
                <View
                  key={report.id}
                  className={`flex-row items-center px-3 py-2.5 ${idx < courseReports.length - 1 ? 'border-b border-slate-700/40' : ''}`}
                >
                  {/* Öğrenci (submitted_by id — API'den isim gelmiyorsa kısa göster) */}
                  <View className="w-24">
                    <Text className="text-xs text-gray-300" numberOfLines={1}>
                      {report.submitted_by.slice(0, 8)}...
                    </Text>
                  </View>

                  {/* Proje */}
                  <View className="flex-1 pr-2">
                    <Text className="text-xs text-white font-medium" numberOfLines={1}>
                      {report.content.slice(0, 30)}{report.content.length > 30 ? '…' : ''}
                    </Text>
                    {report.reviewer_note && (
                      <Text className="text-xs text-emerald-400 mt-0.5" numberOfLines={1}>
                        💬 {report.reviewer_note}
                      </Text>
                    )}
                  </View>

                  {/* Hafta */}
                  <View className="w-12 items-center">
                    <View className="rounded-lg bg-slate-800 px-1.5 py-0.5">
                      <Text className="text-xs text-gray-400 text-center">{report.week_number}</Text>
                    </View>
                  </View>

                  {/* Durum */}
                  <View className="w-20 items-end">
                    <View className={`flex-row items-center gap-1 rounded-lg px-2 py-0.5 ${st.bg}`}>
                      {STATUS_ICON(report.status)}
                      <Text className={`text-xs font-semibold ${st.text}`}>{st.label}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
};

// ── Öğrenci Kart Görünümü ─────────────────────────────────────────────────────
const StudentCardView = ({ reports, navigation, user, onSubmit, onFileUpload, aiAnalysis, aiLoading, onAnalyze }: any) => {
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
                  <View className="flex-row items-center justify-between mb-3">
                    <View className={`flex-row items-center gap-1.5 rounded-lg px-2.5 py-1 ${status.bg}`}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: status.accent }} />
                      <Text className={`text-xs font-semibold ${status.text}`}>{status.label}</Text>
                    </View>
                    <View className="rounded-lg bg-slate-800 px-2.5 py-1">
                      <Text className="text-xs text-gray-400">{report.year} · {report.week_number}. Hafta</Text>
                    </View>
                  </View>

                  <Text className="text-sm text-gray-200 leading-5" numberOfLines={3}>{report.content}</Text>

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
  const isTeacher = user?.role?.toUpperCase() === 'TEACHER';
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, any>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [weekFilter, setWeekFilter] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showWeekModal, setShowWeekModal] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (weekFilter) params.week_number = weekFilter;
      const { data } = await apiClient.get<PaginatedResponse<Report>>('/api/v1/reports', { params });
      setReports(data.items);
    } catch (error) {
      Alert.alert('Hata', safeErrorMsg(error, 'Raporlar yüklenemedi.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, statusFilter, weekFilter]);

  useEffect(() => { fetchReports(); }, [search, statusFilter, weekFilter]);

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
            {isTeacher ? 'Gelen Raporlar' : 'Haftalık Raporlarım'}
          </Text>
          <Text className="text-xs text-gray-500 mt-0.5">{reports.length} rapor</Text>
        </View>
        {!isTeacher && (
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
      </View>

      {/* İçerik: Teacher → Tablo, Student → Kart */}
      {isTeacher ? (
        <TeacherTableView reports={reports} />
      ) : (
        <StudentCardView
          reports={reports}
          navigation={navigation}
          user={user}
          onSubmit={handleSubmit}
          onFileUpload={handleFileUpload}
          aiAnalysis={aiAnalysis}
          aiLoading={aiLoading}
          onAnalyze={handleAnalyze}
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
    </ScrollView>
  );
};
