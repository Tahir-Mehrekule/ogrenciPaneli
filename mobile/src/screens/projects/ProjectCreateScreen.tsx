import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import apiClient from '../../lib/apiClient';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { FolderKanban, ChevronDown } from 'lucide-react-native';
import { Course } from '../../types/course';

const safeErrorMsg = (error: any, fallback: string) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d: any) => d.msg).join('\n');
  return fallback;
};

export const ProjectCreateScreen = ({ navigation }: any) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedCourseName, setSelectedCourseName] = useState('Ders seçin (opsiyonel)');
  const [courses, setCourses] = useState<Course[]>([]);
  const [showCourseList, setShowCourseList] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const { data } = await apiClient.get('/api/v1/courses');
        setCourses(data.items ?? []);
      } catch {
        // Ders yüklenemese bile form çalışmaya devam eder
      }
    };
    fetchCourses();
  }, []);

  const handleCreate = async () => {
    if (!title.trim() || title.trim().length < 3) {
      return Alert.alert('Hata', 'Proje başlığı en az 3 karakter olmalı.');
    }
    if (!description.trim() || description.trim().length < 10) {
      return Alert.alert('Hata', 'Proje açıklaması en az 10 karakter olmalı.');
    }

    try {
      setIsLoading(true);
      await apiClient.post('/api/v1/projects', {
        title: title.trim(),
        description: description.trim(),
        ...(selectedCourseId ? { course_id: selectedCourseId } : {}),
      });
      Alert.alert('Başarılı', 'Projeniz TASLAK olarak oluşturuldu!', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Hata', safeErrorMsg(error, 'Proje oluşturulamadı.'));
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
              <FolderKanban size={28} color="#818cf8" />
            </View>
            <CardTitle>Yeni Proje Oluştur</CardTitle>
            <Text className="text-sm text-center text-gray-400 mt-2">
              Proje TASLAK statüsünde başlar. Hazır olunca öğretmeninize onay için gönderebilirsiniz.
            </Text>
          </CardHeader>

          <CardContent>
            <Input
              label="Proje Başlığı"
              placeholder="örn. Yapay Zeka Destekli Not Uygulaması"
              value={title}
              onChangeText={setTitle}
            />

            <Input
              label="Proje Açıklaması"
              placeholder="Projenizin amacını ve kapsamını kısaca açıklayın..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />

            {/* Ders Seçimi Dropdown */}
            <Text className="text-sm font-medium text-gray-300 mb-1.5 mt-2">
              Ders (Opsiyonel)
            </Text>
            <TouchableOpacity
              className="flex-row items-center justify-between rounded-xl border border-slate-600 bg-slate-700 px-4 py-3 mb-3"
              onPress={() => setShowCourseList(!showCourseList)}
            >
              <Text className={selectedCourseId ? 'text-white text-sm' : 'text-gray-400 text-sm'}>
                {selectedCourseName}
              </Text>
              <ChevronDown size={16} color="#64748b" />
            </TouchableOpacity>

            {showCourseList && (
              <View className="rounded-xl border border-slate-600 bg-slate-800 mb-3 overflow-hidden">
                <TouchableOpacity
                  className="px-4 py-3 border-b border-slate-700"
                  onPress={() => {
                    setSelectedCourseId(null);
                    setSelectedCourseName('Ders seçin (opsiyonel)');
                    setShowCourseList(false);
                  }}
                >
                  <Text className="text-gray-400 text-sm">— Ders seçme</Text>
                </TouchableOpacity>
                {courses.map((course) => (
                  <TouchableOpacity
                    key={course.id}
                    className="px-4 py-3 border-b border-slate-700"
                    onPress={() => {
                      setSelectedCourseId(course.id);
                      setSelectedCourseName(`${course.code} — ${course.name}`);
                      setShowCourseList(false);
                    }}
                  >
                    <Text className="text-white text-sm">{course.code} — {course.name}</Text>
                    <Text className="text-gray-500 text-xs mt-0.5">{course.semester}</Text>
                  </TouchableOpacity>
                ))}
                {courses.length === 0 && (
                  <View className="px-4 py-3">
                    <Text className="text-gray-500 text-sm">Kayıtlı ders bulunamadı.</Text>
                  </View>
                )}
              </View>
            )}

            <Button
              title="Projeyi Oluştur"
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
