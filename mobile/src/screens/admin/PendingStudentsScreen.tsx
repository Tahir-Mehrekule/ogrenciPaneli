import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  Alert, RefreshControl, ActivityIndicator,
} from 'react-native';
import apiClient from '../../lib/apiClient';
import { UserCheck, UserX, GraduationCap, Building2, Clock } from 'lucide-react-native';

interface PendingStudent {
  id: string;
  email: string;
  name: string;
  student_no: string | null;
  department: string | null;
  created_at: string;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('tr-TR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

export const PendingStudentsScreen = () => {
  const [students, setStudents] = useState<PendingStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const { data } = await apiClient.get<PendingStudent[]>('/api/v1/admin/pending-students');
      setStudents(data);
    } catch {
      Alert.alert('Hata', 'Liste yüklenemedi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleApprove = async (id: string, name: string) => {
    setProcessingId(id);
    try {
      await apiClient.post(`/api/v1/admin/pending-students/${id}/approve`);
      Alert.alert('Onaylandı', `${name} artık sisteme giriş yapabilir.`);
      setStudents((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      Alert.alert('Hata', err.response?.data?.detail || 'Onaylama başarısız.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = (id: string, name: string) => {
    Alert.alert(
      'Reddet',
      `${name} adlı öğrencinin kaydını reddetmek istediğinize emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Reddet',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(id);
            try {
              await apiClient.post(`/api/v1/admin/pending-students/${id}/reject`);
              Alert.alert('Reddedildi', `${name} kaydı reddedildi.`);
              setStudents((prev) => prev.filter((s) => s.id !== id));
            } catch (err: any) {
              Alert.alert('Hata', err.response?.data?.detail || 'Red başarısız.');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator color="#818cf8" size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-950">
      {/* Başlık */}
      <View className="px-4 pt-6 pb-4 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-white">Onay Bekleyenler</Text>
          <Text className="text-sm text-gray-400 mt-1">Kayıt başvurularını inceleyin.</Text>
        </View>
        {students.length > 0 && (
          <View className="flex-row items-center gap-1 rounded-xl bg-amber-900/30 border border-amber-800/40 px-3 py-1.5">
            <Clock size={12} color="#fbbf24" />
            <Text className="text-xs font-bold text-amber-400">{students.length} bekleyen</Text>
          </View>
        )}
      </View>

      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetch(); }}
            tintColor="#818cf8"
          />
        }
        ListEmptyComponent={
          <View className="mt-20 items-center">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-emerald-900/30 mb-4">
              <UserCheck size={36} color="#10b981" />
            </View>
            <Text className="text-base font-semibold text-white">Harika!</Text>
            <Text className="text-sm text-gray-500 mt-1 text-center">
              Onay bekleyen öğrenci bulunmuyor.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="mb-3 rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
            {/* Sol renkli şerit */}
            <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: '#818cf8', borderRadius: 2 }} />

            <View className="pl-5 pr-4 py-4">
              {/* Üst satır */}
              <View className="flex-row items-start gap-3 mb-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-indigo-900/40 shrink-0">
                  <GraduationCap size={20} color="#818cf8" />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-base font-semibold text-white" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text className="text-xs text-gray-400" numberOfLines={1}>{item.email}</Text>
                </View>
              </View>

              {/* Etiketler */}
              <View className="flex-row flex-wrap gap-2 mb-4">
                {item.student_no && (
                  <View className="rounded-lg border border-indigo-500/20 bg-indigo-900/20 px-2 py-0.5">
                    <Text className="text-xs font-semibold text-indigo-400">No: {item.student_no}</Text>
                  </View>
                )}
                {item.department && (
                  <View className="flex-row items-center gap-1 rounded-lg bg-slate-800 px-2 py-0.5">
                    <Building2 size={10} color="#94a3b8" />
                    <Text className="text-xs text-gray-400">{item.department}</Text>
                  </View>
                )}
                <Text className="text-xs text-gray-600">{formatDate(item.created_at)}</Text>
              </View>

              {/* Butonlar */}
              <View className="flex-row gap-2">
                <TouchableOpacity
                  className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-emerald-700 py-2.5"
                  disabled={processingId === item.id}
                  onPress={() => handleApprove(item.id, item.name)}
                  style={{ opacity: processingId === item.id ? 0.5 : 1 }}
                >
                  <UserCheck size={14} color="#fff" />
                  <Text className="text-white text-sm font-semibold">Onayla</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-red-800/40 bg-red-900/20 py-2.5"
                  disabled={processingId === item.id}
                  onPress={() => handleReject(item.id, item.name)}
                  style={{ opacity: processingId === item.id ? 0.5 : 1 }}
                >
                  <UserX size={14} color="#f87171" />
                  <Text className="text-red-400 text-sm font-semibold">Reddet</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
};
