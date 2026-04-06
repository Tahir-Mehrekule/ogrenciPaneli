import React, { useState, useEffect } from 'react';
import {
  View, Text, KeyboardAvoidingView, Platform,
  ScrollView, Alert, Switch, TouchableOpacity,
} from 'react-native';
import apiClient from '../../lib/apiClient';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { BookOpen, Trash2 } from 'lucide-react-native';
import { Course } from '../../types/course';

const safeErrorMsg = (error: any, fallback: string) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d: any) => d.msg).join('\n');
  return fallback;
};

export const CourseEditScreen = ({ route, navigation }: any) => {
  const { courseId } = route.params;
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [name, setName] = useState('');
  const [semester, setSemester] = useState('');
  const [requireYoutube, setRequireYoutube] = useState(false);
  const [requireFile, setRequireFile] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const { data } = await apiClient.get<Course>(`/api/v1/courses/${courseId}`);
        setCourse(data);
        setName(data.name);
        setSemester(data.semester);
        setRequireYoutube(data.require_youtube);
        setRequireFile(data.require_file);
      } catch (error) {
        Alert.alert('Hata', safeErrorMsg(error, 'Ders bilgileri yüklenemedi.'), [
          { text: 'Tamam', onPress: () => navigation.goBack() },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [courseId]);

  const handleUpdate = async () => {
    if (!name.trim() || !semester.trim()) {
      return Alert.alert('Hata', 'Ders adı ve dönem boş bırakılamaz.');
    }
    try {
      setSaving(true);
      await apiClient.patch(`/api/v1/courses/${courseId}`, {
        name: name.trim(),
        semester: semester.trim(),
        require_youtube: requireYoutube,
        require_file: requireFile,
      });
      Alert.alert('Başarılı', 'Ders bilgileri güncellendi!', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Hata', safeErrorMsg(error, 'Güncelleme başarısız.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Dersi Sil',
      'Bu dersi silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/api/v1/courses/${courseId}`);
              Alert.alert('Başarılı', 'Ders silindi.', [
                { text: 'Tamam', onPress: () => navigation.goBack() },
              ]);
            } catch (error) {
              Alert.alert('Hata', safeErrorMsg(error, 'Ders silinemedi.'));
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center">
        <Text className="text-gray-400">Ders bilgileri yükleniyor...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-slate-950">
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }}>
        <Card className="shadow-xl border-slate-800 bg-slate-900">
          <CardHeader className="items-center">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-indigo-900/50 mb-4">
              <BookOpen size={28} color="#818cf8" />
            </View>
            <CardTitle>Ders Düzenle</CardTitle>
            <Text className="text-sm text-center text-gray-400 mt-2">
              <Text className="font-semibold text-indigo-400">{course?.code}</Text> kodlu dersin bilgilerini güncelleyin.
            </Text>
          </CardHeader>
          <CardContent>
            {/* Ders Kodu (salt okunur) */}
            <View className="mb-3">
              <Text className="text-sm font-medium text-gray-300 mb-1.5">Ders Kodu</Text>
              <View className="rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-3">
                <Text className="text-sm text-gray-400">{course?.code}</Text>
              </View>
              <Text className="text-xs text-gray-500 mt-1">Ders kodu değiştirilemez.</Text>
            </View>

            <Input
              label="Ders Adı *"
              placeholder="Yazılım Mühendisliği"
              value={name}
              onChangeText={setName}
            />
            <Input
              label="Dönem *"
              placeholder="2025-2026 Güz"
              value={semester}
              onChangeText={setSemester}
            />

            {/* Rapor Gereksinimleri */}
            <View className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 mt-2 mb-4">
              <Text className="text-sm font-medium text-gray-300 mb-1">
                Haftalık Rapor Gereksinimleri
              </Text>
              <Text className="text-xs text-gray-500 mb-4">
                Öğrencilerin rapor teslim ederken uyması gereken zorunluluklar.
              </Text>

              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-1 mr-3">
                  <Text className="text-sm text-gray-200">YouTube video zorunlu</Text>
                  <Text className="text-xs text-gray-500">Rapor tesliminde video linki şartı</Text>
                </View>
                <Switch
                  value={requireYoutube}
                  onValueChange={setRequireYoutube}
                  trackColor={{ false: '#334155', true: '#818cf8' }}
                  thumbColor={requireYoutube ? '#ffffff' : '#94a3b8'}
                />
              </View>

              <View className="flex-row items-center justify-between">
                <View className="flex-1 mr-3">
                  <Text className="text-sm text-gray-200">Dosya ekleme zorunlu</Text>
                  <Text className="text-xs text-gray-500">Rapor tesliminde en az bir dosya şartı</Text>
                </View>
                <Switch
                  value={requireFile}
                  onValueChange={setRequireFile}
                  trackColor={{ false: '#334155', true: '#818cf8' }}
                  thumbColor={requireFile ? '#ffffff' : '#94a3b8'}
                />
              </View>
            </View>

            <Button
              title={saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              onPress={handleUpdate}
              isLoading={saving}
            />

            <TouchableOpacity
              className="mt-3 flex-row items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-3"
              onPress={handleDelete}
            >
              <Trash2 size={16} color="#f87171" />
              <Text className="text-sm font-semibold text-red-400">Dersi Sil</Text>
            </TouchableOpacity>
          </CardContent>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
