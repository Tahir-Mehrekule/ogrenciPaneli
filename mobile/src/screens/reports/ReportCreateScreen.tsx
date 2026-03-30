import React, { useEffect, useState } from 'react';
import {
  View, Text, KeyboardAvoidingView, Platform,
  ScrollView, Alert, TouchableOpacity,
} from 'react-native';
import apiClient from '../../lib/apiClient';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { FileText, ChevronDown } from 'lucide-react-native';
import { Project } from '../../types/project';

const safeErrorMsg = (error: any, fallback: string) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d: any) => d.msg).join('\n');
  return fallback;
};

export const ReportCreateScreen = ({ navigation }: any) => {
  const [content, setContent] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjectTitle, setSelectedProjectTitle] = useState('Proje seçin');
  const [projects, setProjects] = useState<Project[]>([]);
  const [showProjectList, setShowProjectList] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data } = await apiClient.get('/api/v1/projects');
        setProjects(data.items ?? []);
      } catch { /* Projeler yüklenemese bile form çalışır */ }
    };
    fetchProjects();
  }, []);

  const handleCreate = async () => {
    if (!selectedProjectId) return Alert.alert('Hata', 'Lütfen bir proje seçin.');
    if (!content.trim() || content.trim().length < 20) {
      return Alert.alert('Hata', 'Rapor içeriği en az 20 karakter olmalı.');
    }

    try {
      setIsLoading(true);
      await apiClient.post('/api/v1/reports', {
        project_id: selectedProjectId,
        content: content.trim(),
        ...(youtubeUrl.trim() ? { youtube_url: youtubeUrl.trim() } : {}),
      });
      Alert.alert('Başarılı', 'Haftalık rapor TASLAK olarak oluşturuldu!', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Hata', safeErrorMsg(error, 'Rapor oluşturulamadı.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-slate-950"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
        <Card className="shadow-xl border-slate-800 bg-slate-900">
          <CardHeader className="items-center">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-indigo-900/50 mb-4">
              <FileText size={28} color="#818cf8" />
            </View>
            <CardTitle>Haftalık Rapor Oluştur</CardTitle>
            <Text className="text-sm text-center text-gray-400 mt-2">
              Hafta ve yıl otomatik belirlenir. Rapor TASLAK olarak başlar.
            </Text>
          </CardHeader>

          <CardContent>
            {/* Proje Seçimi */}
            <Text className="text-sm font-medium text-gray-300 mb-1.5">Proje *</Text>
            <TouchableOpacity
              className="flex-row items-center justify-between rounded-xl border border-slate-600 bg-slate-700 px-4 py-3 mb-3"
              onPress={() => setShowProjectList(!showProjectList)}
            >
              <Text className={selectedProjectId ? 'text-white text-sm' : 'text-gray-400 text-sm'}>
                {selectedProjectTitle}
              </Text>
              <ChevronDown size={16} color="#64748b" />
            </TouchableOpacity>

            {showProjectList && (
              <View className="rounded-xl border border-slate-600 bg-slate-800 mb-3 overflow-hidden">
                {projects.map((project) => (
                  <TouchableOpacity
                    key={project.id}
                    className="px-4 py-3 border-b border-slate-700"
                    onPress={() => {
                      setSelectedProjectId(project.id);
                      setSelectedProjectTitle(project.title);
                      setShowProjectList(false);
                    }}
                  >
                    <Text className="text-white text-sm">{project.title}</Text>
                  </TouchableOpacity>
                ))}
                {projects.length === 0 && (
                  <View className="px-4 py-3">
                    <Text className="text-gray-500 text-sm">Aktif proje bulunamadı.</Text>
                  </View>
                )}
              </View>
            )}

            {/* Rapor İçeriği */}
            <Input
              label="Bu Hafta Ne Yaptınız? *"
              placeholder="Bu hafta proje üzerinde yaptığınız çalışmaları, ilerlemeleri ve karşılaştığınız zorlukları yazın (min 20 karakter)..."
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={5}
            />

            {/* YouTube URL (Opsiyonel) */}
            <Input
              label="Video Rapor Linki (Opsiyonel)"
              placeholder="https://youtube.com/watch?v=..."
              value={youtubeUrl}
              onChangeText={setYoutubeUrl}
              autoCapitalize="none"
              keyboardType="url"
            />

            <Button
              title="Raporu Oluştur"
              onPress={handleCreate}
              isLoading={isLoading}
              className="mt-2"
            />
          </CardContent>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
