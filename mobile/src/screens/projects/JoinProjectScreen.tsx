import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import apiClient from '../../lib/apiClient';
import { Link2, FolderKanban, Users } from 'lucide-react-native';
import { Project } from '../../types/project';

const safeErrorMsg = (error: any, fallback: string) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d: any) => d.msg).join('\n');
  return fallback;
};

export const JoinProjectScreen = ({ navigation }: any) => {
  const [code, setCode] = useState('');
  const [project, setProject] = useState<Project | null>(null);
  const [searching, setSearching] = useState(false);
  const [joining, setJoining] = useState(false);

  const handleSearch = async () => {
    const trimmed = code.trim().toLowerCase();
    if (trimmed.length !== 8) {
      Alert.alert('Hata', 'Bağlantı kodu 8 karakter olmalıdır.');
      return;
    }
    setSearching(true);
    setProject(null);
    try {
      const { data } = await apiClient.get<Project>(`/api/v1/projects/join/${trimmed}`);
      setProject(data);
    } catch (error) {
      Alert.alert('Bulunamadı', safeErrorMsg(error, 'Bu kod ile proje bulunamadı.'));
    } finally {
      setSearching(false);
    }
  };

  const handleJoin = async () => {
    if (!project) return;
    setJoining(true);
    try {
      await apiClient.post(`/api/v1/projects/${project.id}/join-request`);
      Alert.alert(
        'İstek Gönderildi',
        'Katılım isteğiniz proje yöneticisine iletildi. Onaylandığında projeye erişebileceksiniz.',
        [{ text: 'Tamam', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Hata', safeErrorMsg(error, 'İstek gönderilemedi.'));
    } finally {
      setJoining(false);
    }
  };

  const STATUS_LABELS: Record<string, string> = {
    draft: 'Taslak', pending: 'Onay Bekliyor',
    approved: 'Onaylı', in_progress: 'Devam Ediyor', completed: 'Tamamlandı',
  };

  return (
    <View className="flex-1 bg-slate-950 px-4">
      <View className="pt-6 pb-4">
        <Text className="text-2xl font-bold text-white">Projeye Katıl</Text>
        <Text className="text-sm text-gray-400 mt-1">
          Proje bağlantı kodunu girerek katılım isteği gönderebilirsiniz.
        </Text>
      </View>

      {/* Kod Girişi */}
      <View className="flex-row gap-2 mb-6">
        <View className="flex-1 flex-row items-center rounded-xl border border-slate-700 bg-slate-800 px-4">
          <Link2 size={16} color="#64748b" />
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.toLowerCase())}
            placeholder="8 karakterlik kod..."
            placeholderTextColor="#475569"
            maxLength={8}
            autoCapitalize="none"
            autoCorrect={false}
            className="flex-1 py-3 ml-2 text-sm text-white font-mono"
          />
        </View>
        <TouchableOpacity
          className="rounded-xl bg-indigo-600 px-4 items-center justify-center"
          disabled={searching}
          onPress={handleSearch}
        >
          {searching
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text className="text-sm font-bold text-white">Ara</Text>}
        </TouchableOpacity>
      </View>

      {/* Proje Kartı */}
      {project && (
        <View className="rounded-2xl border border-indigo-500/30 bg-slate-900 overflow-hidden">
          <View style={{ height: 3, backgroundColor: '#818cf8' }} />
          <View className="p-4">
            <View className="flex-row items-center gap-2 mb-3">
              <View className="h-10 w-10 rounded-xl bg-indigo-900/40 items-center justify-center">
                <FolderKanban size={20} color="#818cf8" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-white">{project.title}</Text>
                {project.course_name && (
                  <Text className="text-xs text-indigo-400">{project.course_name}</Text>
                )}
              </View>
              <View className="rounded-lg bg-slate-800 px-2 py-0.5">
                <Text className="text-xs text-gray-400">
                  {STATUS_LABELS[project.status] ?? project.status}
                </Text>
              </View>
            </View>

            <Text className="text-sm text-gray-400 leading-5 mb-4" numberOfLines={3}>
              {project.description}
            </Text>

            <TouchableOpacity
              className="rounded-xl bg-indigo-600 py-3 items-center"
              disabled={joining}
              onPress={handleJoin}
            >
              {joining
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text className="text-sm font-bold text-white">Katılım İsteği Gönder</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};
