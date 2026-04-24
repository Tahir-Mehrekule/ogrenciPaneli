import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../lib/apiClient';
import { Search, UserPlus, GraduationCap } from 'lucide-react-native';

interface SearchUser {
  id: string;
  name: string;
  email: string;
  student_no: string | null;
  grade_label: string | null;
}

const safeErrorMsg = (error: any, fallback: string) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d: any) => d.msg).join('\n');
  return fallback;
};

export const InviteMemberScreen = ({ route, navigation }: any) => {
  const { projectId } = route.params;
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const { data } = await apiClient.get<SearchUser[]>('/api/v1/users/search', {
        params: { q, same_grade: true },
      });
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    search(text);
  };

  const handleInvite = async (targetUser: SearchUser) => {
    setInviting(targetUser.id);
    try {
      await apiClient.post(`/api/v1/projects/${projectId}/invite`, {
        user_id: targetUser.id,
      });
      Alert.alert('Davet Gönderildi', `${targetUser.name} adlı öğrenciye davet gönderildi.`);
    } catch (error) {
      Alert.alert('Hata', safeErrorMsg(error, 'Davet gönderilemedi.'));
    } finally {
      setInviting(null);
    }
  };

  return (
    <View className="flex-1 bg-slate-950">
      {/* Başlık */}
      <View className="px-4 pt-6 pb-4">
        <Text className="text-2xl font-bold text-white">Üye Davet Et</Text>
        {user?.grade_label && (
          <View className="flex-row items-center gap-1.5 mt-2">
            <GraduationCap size={13} color="#818cf8" />
            <Text className="text-xs text-indigo-400">
              Sadece kendi sınıfınız gösterilir: <Text className="font-bold">{user.grade_label}</Text>
            </Text>
          </View>
        )}
      </View>

      {/* Arama Kutusu */}
      <View className="flex-row items-center mx-4 mb-4 rounded-xl border border-slate-700 bg-slate-800 px-4">
        <Search size={16} color="#64748b" />
        <TextInput
          value={query}
          onChangeText={handleQueryChange}
          placeholder="İsim, mail veya okul numarası..."
          placeholderTextColor="#475569"
          className="flex-1 py-3 ml-2 text-sm text-white"
          autoFocus
        />
        {searching && <ActivityIndicator size="small" color="#818cf8" />}
      </View>

      {/* Sonuçlar */}
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        ListEmptyComponent={
          query.length >= 2 && !searching ? (
            <View className="mt-10 items-center">
              <Text className="text-sm text-gray-500">
                {user?.grade_label
                  ? `${user.grade_label} için sonuç bulunamadı`
                  : 'Sonuç bulunamadı'}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View className="mb-2 flex-row items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-indigo-900/40 shrink-0">
              <GraduationCap size={18} color="#818cf8" />
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-sm font-semibold text-white" numberOfLines={1}>{item.name}</Text>
              <Text className="text-xs text-gray-400" numberOfLines={1}>{item.email}</Text>
              {item.student_no && (
                <Text className="text-xs text-indigo-400 mt-0.5">No: {item.student_no}</Text>
              )}
            </View>
            {item.grade_label && (
              <View className="rounded-lg bg-slate-800 px-2 py-0.5">
                <Text className="text-xs text-gray-400">{item.grade_label}</Text>
              </View>
            )}
            <TouchableOpacity
              className="h-8 w-8 items-center justify-center rounded-lg bg-indigo-600"
              disabled={inviting === item.id}
              style={{ opacity: inviting === item.id ? 0.5 : 1 }}
              onPress={() => handleInvite(item)}
            >
              {inviting === item.id
                ? <ActivityIndicator size="small" color="#fff" />
                : <UserPlus size={14} color="#fff" />}
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
};
