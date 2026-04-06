import React, { useEffect, useState } from 'react';
import {
  View, Text, KeyboardAvoidingView, Platform,
  ScrollView, Alert, TouchableOpacity,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import apiClient from '../../lib/apiClient';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { FileText, ChevronDown, Paperclip, X, AlertTriangle } from 'lucide-react-native';
import { Project } from '../../types/project';
import { Course } from '../../types/course';

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
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [courseRequirements, setCourseRequirements] = useState<{ require_youtube: boolean; require_file: boolean } | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data } = await apiClient.get('/api/v1/projects');
        setProjects(data.items ?? []);
      } catch { /* Projeler yüklenemese bile form çalışır */ }
    };
    fetchProjects();
  }, []);

  // Proje seçildiğinde course gereksinimlerini çek
  const fetchCourseRequirements = async (project: Project) => {
    setCourseRequirements(null);
    if (!project.course_id) return;
    try {
      const { data } = await apiClient.get<Course>(`/api/v1/courses/${project.course_id}`);
      if (data.require_youtube || data.require_file) {
        setCourseRequirements({ require_youtube: data.require_youtube, require_file: data.require_file });
      }
    } catch { /* Course bilgisi alınamazsa sessizce devam et */ }
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
      }
    } catch {
      Alert.alert('Hata', 'Dosya seçilemedi.');
    }
  };

  const uploadFile = async (reportId: string) => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', {
      uri: selectedFile.uri,
      name: selectedFile.name,
      type: selectedFile.mimeType || 'application/octet-stream',
    } as any);

    try {
      await apiClient.post(`/api/v1/reports/${reportId}/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (error) {
      console.log('[Report] Dosya yükleme hatası:', error);
      Alert.alert('Uyarı', 'Rapor oluşturuldu fakat dosya yüklenirken hata oluştu. Dosyayı daha sonra ekleyebilirsiniz.');
    }
  };

  const handleCreate = async () => {
    if (!selectedProjectId) return Alert.alert('Hata', 'Lütfen bir proje seçin.');
    if (!content.trim() || content.trim().length < 20) {
      return Alert.alert('Hata', 'Rapor içeriği en az 20 karakter olmalı.');
    }

    try {
      setIsLoading(true);
      const { data } = await apiClient.post('/api/v1/reports', {
        project_id: selectedProjectId,
        content: content.trim(),
        ...(youtubeUrl.trim() ? { youtube_url: youtubeUrl.trim() } : {}),
      });

      // Dosya seçildiyse rapor oluşturulduktan sonra yükle
      if (selectedFile && data?.id) {
        await uploadFile(data.id);
      }

      Alert.alert('Başarılı', 'Haftalık rapor TASLAK olarak oluşturuldu!', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 409) {
        Alert.alert('Uyarı', 'Bu proje için bu hafta zaten bir rapor oluşturdunuz. Mevcut raporunuzu düzenleyebilirsiniz.');
      } else {
        Alert.alert('Hata', safeErrorMsg(error, 'Rapor oluşturulamadı.'));
      }
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
                      fetchCourseRequirements(project);
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

            {/* Ders Gereksinim Uyarısı */}
            {courseRequirements && (
              <View className="rounded-xl bg-amber-900/20 border border-amber-500/20 p-3 mb-3 flex-row items-start gap-2">
                <AlertTriangle size={16} color="#fbbf24" />
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-amber-400 mb-1">Ders Gereksinimleri</Text>
                  <Text className="text-xs text-gray-400">
                    Teslim sırasında şunlar zorunlu:
                    {courseRequirements.require_youtube ? ' YouTube video linki' : ''}
                    {courseRequirements.require_youtube && courseRequirements.require_file ? ' ve' : ''}
                    {courseRequirements.require_file ? ' dosya eklenmesi' : ''}
                  </Text>
                </View>
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

            {/* YouTube URL */}
            <Input
              label={`Video Rapor Linki ${courseRequirements?.require_youtube ? '(Zorunlu) *' : '(Opsiyonel)'}`}
              placeholder="https://youtube.com/watch?v=..."
              value={youtubeUrl}
              onChangeText={setYoutubeUrl}
              autoCapitalize="none"
              keyboardType="url"
            />

            {/* Dosya Ekleme */}
            <Text className="text-sm font-medium text-gray-300 mb-1.5">
              Dosya Ekle {courseRequirements?.require_file ? '(Zorunlu) *' : '(Opsiyonel)'}
            </Text>
            {selectedFile ? (
              <View className="flex-row items-center justify-between rounded-xl border border-indigo-500/30 bg-indigo-900/20 px-4 py-3 mb-4">
                <View className="flex-row items-center gap-2 flex-1 mr-2">
                  <Paperclip size={16} color="#818cf8" />
                  <Text className="text-sm text-indigo-300 flex-1" numberOfLines={1}>
                    {selectedFile.name}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedFile(null)}
                  className="p-1"
                >
                  <X size={16} color="#f87171" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                className="flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-slate-600 bg-slate-800 px-4 py-3.5 mb-4"
                onPress={handlePickFile}
              >
                <Paperclip size={16} color="#64748b" />
                <Text className="text-sm text-gray-400">Dosya seçmek için dokunun</Text>
              </TouchableOpacity>
            )}

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
