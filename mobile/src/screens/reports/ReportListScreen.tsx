import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl,
  TouchableOpacity, Alert,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../lib/apiClient';
import { Card, CardContent } from '../../components/ui/Card';
import { FileText, Plus, Paperclip } from 'lucide-react-native';
import { Report } from '../../types/report';
import { PaginatedResponse } from '../../types/course';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft:     { label: 'Taslak',    bg: 'bg-slate-700',      text: 'text-slate-300' },
  submitted: { label: 'Teslim Edildi', bg: 'bg-amber-900/50',  text: 'text-amber-400' },
  reviewed:  { label: 'İncelendi', bg: 'bg-emerald-900/50', text: 'text-emerald-400' },
};

const safeErrorMsg = (error: any, fallback: string) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d: any) => d.msg).join('\n');
  return fallback;
};

export const ReportListScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, any>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

  const fetchReports = useCallback(async () => {
    try {
      const { data } = await apiClient.get<PaginatedResponse<Report>>('/api/v1/reports');
      setReports(data.items);
    } catch (error) {
      Alert.alert('Hata', safeErrorMsg(error, 'Raporlar yüklenemedi.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleSubmit = async (reportId: string) => {
    try {
      await apiClient.post(`/api/v1/reports/${reportId}/submit`);
      Alert.alert('Başarılı', 'Rapor öğretmenine teslim edildi!');
      fetchReports();
    } catch (error) {
      Alert.alert('Hata', safeErrorMsg(error, 'Teslim başarısız.'));
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
      className="flex-1 bg-slate-950 p-4"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchReports(); }} tintColor="#818cf8" />}
    >
      {/* Başlık */}
      <View className="mb-4 mt-2 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-white">
            {user?.role?.toUpperCase() === 'TEACHER' ? 'Gelen Raporlar' : 'Haftalık Raporlarım'}
          </Text>
          <Text className="text-sm text-gray-400 mt-1">
            {user?.role?.toUpperCase() === 'TEACHER'
              ? 'Öğrencilerden gelen haftalık raporlar.'
              : 'Projenize ait haftalık raporlarınız.'}
          </Text>
        </View>
        {user?.role?.toUpperCase() === 'STUDENT' && (
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-xl bg-indigo-600"
            onPress={() => navigation.navigate('ReportCreate')}
          >
            <Plus size={20} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Boş Durum */}
      {reports.length === 0 ? (
        <Card className="mt-4">
          <CardContent className="items-center justify-center p-8">
            <FileText size={40} color="#64748b" />
            <Text className="text-gray-400 mt-4 text-center">
              {user?.role?.toUpperCase() === 'TEACHER'
                ? 'Henüz teslim edilmiş rapor yok.'
                : 'Henüz rapor oluşturmadınız.'}
            </Text>
          </CardContent>
        </Card>
      ) : (() => {
        // Raporları derse göre grupla
        const grouped = reports.reduce((acc, report) => {
          const key = report.course_name ?? 'Ders Atanmamış';
          if (!acc[key]) acc[key] = { code: report.course_code ?? null, reports: [] };
          acc[key].reports.push(report);
          return acc;
        }, {} as Record<string, { code: string | null; reports: Report[] }>);

        return Object.entries(grouped).map(([courseName, { code, reports: courseReports }]) => (
          <View key={courseName} className="mb-4">
            {/* Ders Başlığı */}
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

            {courseReports.map((report) => {
          const status = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.draft;
          return (
            <Card key={report.id} className="mb-3">
              <CardContent className="pt-4 pb-4">
                {/* Üst Satır: Durum + Hafta Bilgisi */}
                <View className="flex-row items-center justify-between mb-2">
                  <View className={`rounded-lg px-2 py-0.5 ${status.bg}`}>
                    <Text className={`text-xs font-bold ${status.text}`}>{status.label}</Text>
                  </View>
                  <Text className="text-xs text-gray-500">
                    {report.year} — {report.week_number}. Hafta
                  </Text>
                </View>

                {/* İçerik Özeti */}
                <Text className="text-sm text-white font-medium" numberOfLines={2}>
                  {report.content}
                </Text>

                {/* YouTube linki */}
                {report.youtube_url && (
                  <Text className="text-xs text-indigo-400 mt-1">🎬 Video rapor mevcut</Text>
                )}

                {/* Öğretmen notu */}
                {report.reviewer_note && (
                  <View className="mt-2 rounded-lg bg-emerald-900/30 p-2">
                    <Text className="text-xs text-emerald-400">
                      💬 Öğretmen notu: {report.reviewer_note}
                    </Text>
                  </View>
                )}

                {/* AI Analiz Sonuçları */}
                {aiAnalysis[report.id] && (
                  <View className="mt-3 rounded-xl bg-indigo-900/30 p-3 border border-indigo-500/30">
                    <Text className="text-indigo-400 font-bold mb-2 text-sm">🤖 Yapay Zeka Analizi</Text>
                    <Text className="text-gray-300 text-xs mb-3">{aiAnalysis[report.id].summary}</Text>
                    
                    <Text className="text-emerald-400 text-xs font-bold mb-1">💪 Güçlü Yönler</Text>
                    {aiAnalysis[report.id].strengths.map((str: string, i: number) => (
                      <Text key={`str-${i}`} className="text-gray-400 text-xs ml-2 mb-1">• {str}</Text>
                    ))}

                    <Text className="text-amber-400 text-xs font-bold mt-2 mb-1">⚠️ Gelişime Açık Yönler</Text>
                    {aiAnalysis[report.id].weaknesses.map((wk: string, i: number) => (
                      <Text key={`wk-${i}`} className="text-gray-400 text-xs ml-2 mb-1">• {wk}</Text>
                    ))}

                    <Text className="text-blue-400 text-xs font-bold mt-2 mb-1">🎯 Tavsiyeler</Text>
                    {aiAnalysis[report.id].recommendations.map((rec: string, i: number) => (
                      <Text key={`rec-${i}`} className="text-gray-400 text-xs ml-2 mb-1">• {rec}</Text>
                    ))}
                  </View>
                )}

                {/* Aksiyon Butonları */}
                {user?.role?.toUpperCase() === 'STUDENT' && (
                  <View className="mt-3 flex-row gap-2">
                    {/* Dosya Ekle — tüm durumlarda göster */}
                    <TouchableOpacity
                      className="flex-1 rounded-lg bg-slate-800 py-2.5 items-center justify-center flex-row gap-1.5"
                      onPress={async () => {
                        try {
                          const DocumentPicker = require('expo-document-picker');
                          const result = await DocumentPicker.getDocumentAsync({
                            type: '*/*',
                            copyToCacheDirectory: true,
                          });
                          if (!result.canceled && result.assets && result.assets.length > 0) {
                            const file = result.assets[0];
                            const formData = new FormData();
                            formData.append('file', {
                              uri: file.uri,
                              name: file.name,
                              type: file.mimeType || 'application/octet-stream',
                            } as any);

                            await apiClient.post(`/api/v1/reports/${report.id}/files`, formData, {
                              headers: { 'Content-Type': 'multipart/form-data' },
                            });
                            Alert.alert('Başarılı', 'Dosya rapora başarıyla eklendi!');
                          }
                        } catch (err) {
                          Alert.alert('Hata', safeErrorMsg(err, 'Dosya yüklenirken bir hata oluştu.'));
                        }
                      }}
                    >
                      <Paperclip size={12} color="#818cf8" />
                      <Text className="text-indigo-400 text-xs font-semibold">Dosya Ekle</Text>
                    </TouchableOpacity>

                    {/* Teslim Et — sadece DRAFT */}
                    {report.status === 'draft' && (
                      <TouchableOpacity
                        className="flex-1 rounded-lg bg-indigo-600 py-2.5 items-center justify-center flex-row"
                        onPress={() => handleSubmit(report.id)}
                      >
                        <Text className="text-white text-xs font-semibold">Teslim Et</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* AI Analiz Butonu (Teslim edilmiş raporlarda gösterilir) */}
                {report.status !== 'draft' && !aiAnalysis[report.id] && (
                  <TouchableOpacity
                    className="mt-3 rounded-lg bg-indigo-600/20 border border-indigo-500/30 py-2.5 items-center justify-center"
                    disabled={aiLoading[report.id]}
                    onPress={async () => {
                      try {
                        setAiLoading(prev => ({ ...prev, [report.id]: true }));
                        const res = await apiClient.post('/api/v1/ai/analyze-report', { report_id: report.id });
                        setAiAnalysis(prev => ({ ...prev, [report.id]: res.data }));
                      } catch (err) {
                        Alert.alert('Hata', safeErrorMsg(err, 'Analiz yapılamadı.'));
                      } finally {
                        setAiLoading(prev => ({ ...prev, [report.id]: false }));
                      }
                    }}
                  >
                    <Text className="text-indigo-400 text-xs font-bold">
                      {aiLoading[report.id] ? 'Analiz ediliyor...' : 'AI ile Analiz Et'}
                    </Text>
                  </TouchableOpacity>
                )}
              </CardContent>
            </Card>
            );
          })}
          </View>
        ));
      })()}

      <View className="h-8" />
    </ScrollView>
  );
};
