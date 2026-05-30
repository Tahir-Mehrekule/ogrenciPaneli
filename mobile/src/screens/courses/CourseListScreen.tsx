import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../lib/apiClient';
import { Card, CardContent } from '../../components/ui/Card';
import { BookOpen, Users, Plus, User, ArrowLeft } from 'lucide-react-native';
import { Course, PaginatedResponse, ProjectType } from '../../types/course';

/** Proje tipi badge renkleri — web paneli ile tutarlı */
const PROJECT_TYPE_BADGE: Record<ProjectType, { label: string; bgClass: string; textClass: string }> = {
  individual: { label: 'Bireysel', bgClass: 'bg-violet-900/30', textClass: 'text-violet-400' },
  team:       { label: 'Ekip',     bgClass: 'bg-cyan-900/30',   textClass: 'text-cyan-400' },
  both:       { label: 'Serbest',  bgClass: 'bg-gray-700/50',   textClass: 'text-gray-400' },
};

export const CourseListScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const role = user?.role?.toUpperCase();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCourses = useCallback(async () => {
    try {
      const { data } = await apiClient.get<PaginatedResponse<Course>>('/api/v1/courses');
      setCourses(data.items);
    } catch (error: any) {
      const msg = error.response?.data?.detail;
      Alert.alert('Hata', typeof msg === 'string' ? msg : 'Dersler yüklenemedi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCourses();
  };

  /** Ders düzenlemeye erişim: ADMIN ve TEACHER */
  const isEditable = role === 'TEACHER' || role === 'ADMIN';
  /** Ders oluşturma: Sadece ADMIN (web paneli ile tutarlı) */
  const canCreateCourse = role === 'ADMIN';

  /** Rol bazlı başlık */
  const getTitle = () => {
    if (role === 'ADMIN') return 'Tüm Dersler';
    if (role === 'TEACHER') return 'Verdiğim Dersler';
    return 'Ders Kataloğu';
  };

  const getSubtitle = () => {
    if (role === 'ADMIN') return 'Sistemdeki tüm dersler ve proje ayarları.';
    if (role === 'TEACHER') return 'Oluşturduğunuz dersler burada listelenir.';
    return 'Kayıt olabileceğiniz tüm dersler.';
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center">
        <Text className="text-gray-400">Dersler yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-950 p-4"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#818cf8" />}
    >
      {/* Başlık */}
      <View className="mb-4 mt-2 flex-row items-center justify-between">
        <View className="flex-row items-center flex-1 mr-3">
          {/* Geri butonu — CoursesModal stack'ini kapatır, Ana Sayfa'ya döner */}
          <TouchableOpacity
            className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-slate-800"
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={20} color="#818cf8" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-2xl font-bold text-white">{getTitle()}</Text>
            <Text className="text-sm text-gray-400 mt-1">{getSubtitle()}</Text>
          </View>
        </View>
        {canCreateCourse && (
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-xl bg-indigo-600"
            onPress={() => navigation.navigate('CourseCreate')}
          >
            <Plus size={20} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Ders Listesi */}
      {courses.length === 0 ? (
        <Card className="mt-4">
          <CardContent className="items-center justify-center p-8">
            <BookOpen size={40} color="#64748b" />
            <Text className="text-gray-400 mt-4 text-center">
              {isEditable
                ? 'Henüz bir ders oluşturulmamış.'
                : 'Henüz açılmış ders bulunmuyor.'}
            </Text>
          </CardContent>
        </Card>
      ) : (
        courses.map((course) => {
          const typeBadge = PROJECT_TYPE_BADGE[course.project_type ?? 'both'];
          return (
            <TouchableOpacity
              key={course.id}
              activeOpacity={isEditable ? 0.7 : 1}
              onPress={() => {
                if (isEditable) {
                  navigation.navigate('CourseEdit', { courseId: course.id });
                }
              }}
            >
              <Card className="mb-3">
                <CardContent className="pt-5 pb-4">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 mr-3">
                      {/* Kod + Dönem + Proje Tipi */}
                      <View className="flex-row items-center flex-wrap gap-1.5 mb-1">
                        <View className="bg-indigo-900/50 rounded-lg px-2 py-0.5">
                          <Text className="text-xs font-bold text-indigo-400">{course.code}</Text>
                        </View>
                        <Text className="text-xs text-gray-500">{course.semester}</Text>
                        {typeBadge && (
                          <View className={`rounded-md border border-slate-600 px-1.5 py-0.5 ${typeBadge.bgClass}`}>
                            <Text className={`text-[10px] font-semibold ${typeBadge.textClass}`}>
                              {typeBadge.label}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Ders Adı */}
                      <Text className="text-base font-semibold text-white mt-1">{course.name}</Text>

                      {/* Öğretmen adı (Student + Admin görünümü; öğretmen kendi dersi olduğu için görmez) */}
                      {role !== 'TEACHER' && course.teacher_name && (
                        <View className="flex-row items-center gap-1.5 mt-1.5">
                          <User size={12} color="#64748b" />
                          <Text className="text-xs text-gray-500">{course.teacher_name}</Text>
                        </View>
                      )}

                      {/* Zorunluluk badge'leri */}
                      {(course.require_youtube || course.require_file) && (
                        <View className="flex-row gap-1.5 mt-2">
                          {course.require_youtube && (
                            <View className="rounded-md bg-amber-900/30 border border-amber-500/20 px-1.5 py-0.5">
                              <Text className="text-[10px] font-semibold text-amber-400">Video zorunlu</Text>
                            </View>
                          )}
                          {course.require_file && (
                            <View className="rounded-md bg-blue-900/30 border border-blue-500/20 px-1.5 py-0.5">
                              <Text className="text-[10px] font-semibold text-blue-400">Dosya zorunlu</Text>
                            </View>
                          )}
                        </View>
                      )}

                      {isEditable && (
                        <Text className="text-xs text-gray-500 mt-2">Düzenlemek için dokunun</Text>
                      )}
                    </View>

                  </View>
                </CardContent>
              </Card>
            </TouchableOpacity>
          );
        })
      )}

      <View className="h-8" />
    </ScrollView>
  );
};
