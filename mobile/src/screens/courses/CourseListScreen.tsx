import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../lib/apiClient';
import { Card, CardContent } from '../../components/ui/Card';
import { BookOpen, Users, Plus } from 'lucide-react-native';
import { Course, PaginatedResponse } from '../../types/course';

export const CourseListScreen = ({ navigation }: any) => {
  const { user } = useAuth();
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

  const handleEnroll = async (courseId: string) => {
    try {
      await apiClient.post(`/api/v1/courses/${courseId}/enroll`);
      Alert.alert('Başarılı', 'Derse kaydınız yapıldı!');
      fetchCourses();
    } catch (error: any) {
      const msg = error.response?.data?.detail;
      Alert.alert('Hata', typeof msg === 'string' ? msg : 'Kayıt işlemi başarısız.');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCourses();
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
        <View>
          <Text className="text-2xl font-bold text-white">
            {user?.role === 'TEACHER' ? 'Verdiğim Dersler' : 'Ders Kataloğu'}
          </Text>
          <Text className="text-sm text-gray-400 mt-1">
            {user?.role === 'TEACHER'
              ? 'Oluşturduğunuz dersler burada listelenir.'
              : 'Kayıt olabileceğiniz tüm dersler.'}
          </Text>
        </View>
        {user?.role === 'TEACHER' && (
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
              {user?.role === 'TEACHER'
                ? 'Henüz bir ders oluşturmadınız.'
                : 'Henüz açılmış ders bulunmuyor.'}
            </Text>
          </CardContent>
        </Card>
      ) : (
        courses.map((course) => (
          <TouchableOpacity
            key={course.id}
            activeOpacity={user?.role === 'TEACHER' ? 0.7 : 1}
            onPress={() => {
              if (user?.role === 'TEACHER') {
                navigation.navigate('CourseEdit', { courseId: course.id });
              }
            }}
          >
            <Card className="mb-3">
              <CardContent className="pt-5 pb-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 mr-3">
                    <View className="flex-row items-center mb-1">
                      <View className="bg-indigo-900/50 rounded-lg px-2 py-0.5 mr-2">
                        <Text className="text-xs font-bold text-indigo-400">{course.code}</Text>
                      </View>
                      <Text className="text-xs text-gray-500">{course.semester}</Text>
                    </View>
                    <Text className="text-base font-semibold text-white mt-1">{course.name}</Text>
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
                    {user?.role === 'TEACHER' && (
                      <Text className="text-xs text-gray-500 mt-2">Düzenlemek için dokunun</Text>
                    )}
                  </View>

                  {user?.role === 'STUDENT' && (
                    <TouchableOpacity
                      className="bg-indigo-600 rounded-lg px-4 py-2"
                      onPress={() => handleEnroll(course.id)}
                    >
                      <Text className="text-white text-xs font-semibold">Kayıt Ol</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </CardContent>
            </Card>
          </TouchableOpacity>
        ))
      )}

      <View className="h-8" />
    </ScrollView>
  );
};
