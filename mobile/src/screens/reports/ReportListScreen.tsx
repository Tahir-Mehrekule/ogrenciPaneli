import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl,
  TouchableOpacity, Alert,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../lib/apiClient';
import { Card, CardContent } from '../../components/ui/Card';
import { FileText, Plus } from 'lucide-react-native';
import { Report } from '../../types/report';
import { PaginatedResponse } from '../../types/course';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  DRAFT:     { label: 'Taslak',    bg: 'bg-slate-700',      text: 'text-slate-300' },
  SUBMITTED: { label: 'Teslim Edildi', bg: 'bg-amber-900/50',  text: 'text-amber-400' },
  REVIEWED:  { label: 'İncelendi', bg: 'bg-emerald-900/50', text: 'text-emerald-400' },
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
      ) : (
        reports.map((report) => {
          const status = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.DRAFT;
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

                {/* Teslim Et butonu (sadece DRAFT raporlar için) */}
                {user?.role?.toUpperCase() === 'STUDENT' && report.status === 'DRAFT' && (
                  <TouchableOpacity
                    className="mt-3 rounded-lg bg-indigo-600 py-2 items-center"
                    onPress={() => handleSubmit(report.id)}
                  >
                    <Text className="text-white text-xs font-semibold">📨 Teslim Et</Text>
                  </TouchableOpacity>
                )}
              </CardContent>
            </Card>
          );
        })
      )}

      <View className="h-8" />
    </ScrollView>
  );
};
