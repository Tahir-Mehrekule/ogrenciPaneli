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
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { FolderKanban, ChevronDown, Send, User, Users, Lock } from 'lucide-react-native';
import { Course } from '../../types/course';

type CourseProjectType = 'individual' | 'team' | 'both';
type ChosenProjectType = 'individual' | 'team';

const safeErrorMsg = (error: any, fallback: string) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d: any) => d.msg).join('\n');
  return fallback;
};

export const ProjectCreateScreen = ({ navigation }: any) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedCourseName, setSelectedCourseName] = useState('Ders seçin');
  const [courses, setCourses] = useState<Course[]>([]);
  const [showCourseList, setShowCourseList] = useState(false);
  // Seçilen dersin proje tipi politikası (both = öğrenci seçer, diğerleri sabit)
  const [courseProjectType, setCourseProjectType] = useState<CourseProjectType | null>(null);
  const [chosenProjectType, setChosenProjectType] = useState<ChosenProjectType>('individual');
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

  /** Ders seçimi — detay çekip proje tipi politikasını belirler (web ile aynı mantık) */
  const handleCourseSelect = async (course: Course | null) => {
    setShowCourseList(false);
    setCourseProjectType(null);
    if (!course) {
      setSelectedCourseId(null);
      setSelectedCourseName('Ders seçin');
      return;
    }
    setSelectedCourseId(course.id);
    setSelectedCourseName(`${course.code} — ${course.name}`);
    try {
      const { data } = await apiClient.get<Course>(`/api/v1/courses/${course.id}`);
      const pt = (data.project_type ?? 'both') as CourseProjectType;
      setCourseProjectType(pt);
      if (pt === 'individual') setChosenProjectType('individual');
      else if (pt === 'team') setChosenProjectType('team');
    } catch {
      setCourseProjectType('both');
    }
  };

  /** Backend'e gönderilecek proje tipi — ders yoksa undefined */
  const resolvedProjectType = (): ChosenProjectType | undefined => {
    if (!selectedCourseId) return undefined;
    if (courseProjectType === 'individual') return 'individual';
    if (courseProjectType === 'team') return 'team';
    return chosenProjectType;
  };

  const handleSubmit = async (submitForApproval: boolean) => {
    if (!title.trim() || title.trim().length < 3) {
      return Alert.alert('Hata', 'Proje başlığı en az 3 karakter olmalı.');
    }
    if (!description.trim() || description.trim().length < 10) {
      return Alert.alert('Hata', 'Proje açıklaması en az 10 karakter olmalı.');
    }
    if (!selectedCourseId) {
      return Alert.alert('Hata', 'Ders seçimi zorunludur.');
    }

    const pt = resolvedProjectType();

    try {
      setIsLoading(true);
      const { data } = await apiClient.post('/api/v1/projects', {
        title: title.trim(),
        description: description.trim(),
        ...(selectedCourseId ? { course_id: selectedCourseId } : {}),
        ...(pt ? { project_type: pt } : {}),
        ...(githubUrl.trim() ? { github_url: githubUrl.trim() } : {}),
      });

      // Onaya gönder seçildiyse submit endpoint'ini de çağır
      if (submitForApproval) {
        try {
          await apiClient.post(`/api/v1/projects/${data.id}/submit`);
        } catch {
          // submit başarısız olsa bile proje DRAFT olarak oluşturuldu
        }
      }

      const msg = submitForApproval
        ? 'Projeniz oluşturuldu ve öğretmeninizin onayına gönderildi! 🚀'
        : 'Projeniz TASLAK olarak kaydedildi! 📝';
      Alert.alert('Başarılı', msg, [
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
              İstersen taslak olarak kaydet, istersen hemen onaya gönder.
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
              placeholder="Projenizin amacını ve kapsamını açıklayın..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />

            <Input
              label="GitHub Repo (Opsiyonel)"
              placeholder="https://github.com/kullanıcı/repo"
              value={githubUrl}
              onChangeText={setGithubUrl}
              autoCapitalize="none"
              keyboardType="url"
            />

            {/* Ders Seçimi Dropdown */}
            <Text className="text-sm font-medium text-gray-300 mb-1.5 mt-2">
              Ders <Text className="text-red-400">*</Text>
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
                {courses.map((course) => (
                  <TouchableOpacity
                    key={course.id}
                    className="px-4 py-3 border-b border-slate-700"
                    onPress={() => handleCourseSelect(course)}
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

            {/* Proje Tipi — ders seçilince görünür */}
            {selectedCourseId && courseProjectType && (
              <View className="rounded-xl border border-slate-700 p-4 mb-3">
                <Text className="text-sm font-medium text-gray-300 mb-3">Proje Tipi</Text>

                {courseProjectType === 'both' ? (
                  <View className="gap-2">
                    {([
                      { value: 'individual' as const, label: 'Bireysel Proje', desc: 'Sadece sen çalışırsın', Icon: User, color: '#a78bfa' },
                      { value: 'team' as const, label: 'Ekip Projesi', desc: 'Takım arkadaşı davet edebilirsin', Icon: Users, color: '#22d3ee' },
                    ]).map((opt) => {
                      const active = chosenProjectType === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          onPress={() => setChosenProjectType(opt.value)}
                          className={`flex-row items-center gap-3 rounded-lg border p-3 ${
                            active ? 'border-indigo-500 bg-indigo-900/20' : 'border-slate-600'
                          }`}
                        >
                          <View className={`h-4 w-4 rounded-full border-2 items-center justify-center ${active ? 'border-indigo-500' : 'border-slate-500'}`}>
                            {active && <View className="h-2 w-2 rounded-full bg-indigo-500" />}
                          </View>
                          <opt.Icon size={16} color={opt.color} />
                          <View className="flex-1">
                            <Text className="text-sm font-medium text-gray-200">{opt.label}</Text>
                            <Text className="text-xs text-gray-400">{opt.desc}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <View className={`flex-row items-center gap-3 rounded-lg border p-3 ${
                    courseProjectType === 'team' ? 'border-cyan-500/40 bg-cyan-500/10' : 'border-violet-500/40 bg-violet-500/10'
                  }`}>
                    <Lock size={16} color="#94a3b8" />
                    {courseProjectType === 'team'
                      ? <Users size={16} color="#22d3ee" />
                      : <User size={16} color="#a78bfa" />}
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-gray-200">
                        {courseProjectType === 'team' ? 'Ekip Projesi (Zorunlu)' : 'Bireysel Proje (Zorunlu)'}
                      </Text>
                      <Text className="text-xs text-gray-400">
                        Bu ders için öğretmen proje tipini sabitlemiştir.
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* İki Buton: Taslak Kaydet / Onaya Gönder */}
            <View className="flex-row gap-3 mt-1">
              <TouchableOpacity
                disabled={isLoading}
                onPress={() => handleSubmit(false)}
                className={`flex-1 h-12 flex-row items-center justify-center rounded-xl border border-slate-600 bg-slate-700 active:bg-slate-600 ${isLoading ? 'opacity-50' : ''}`}
              >
                <Text className="text-sm font-semibold text-gray-200">
                  {isLoading ? 'Kaydediliyor...' : '💾 Taslak Kaydet'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={isLoading}
                onPress={() => handleSubmit(true)}
                className={`flex-1 h-12 flex-row items-center justify-center gap-2 rounded-xl bg-indigo-600 active:bg-indigo-700 ${isLoading ? 'opacity-50' : ''}`}
              >
                <Send size={16} color="#ffffff" />
                <Text className="text-sm font-semibold text-white">
                  {isLoading ? 'Gönderiliyor...' : 'Onaya Gönder'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text className="text-xs text-center text-gray-400 mt-3">
              💡 Taslak olarak kaydedip daha sonra da onaya gönderebilirsin
            </Text>
          </CardContent>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
