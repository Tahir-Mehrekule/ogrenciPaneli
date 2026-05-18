import React, { useState, useEffect } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Alert, Switch } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../lib/apiClient';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ModalPicker, PickerOption } from '../../components/ui/ModalPicker';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { BookOpen } from 'lucide-react-native';
import { ProjectType } from '../../types/course';

interface Department { id: string; name: string; }
interface TeacherOption { id: string; full_name: string; email: string; }

const PROJECT_TYPE_OPTIONS: { value: ProjectType; label: string; desc: string }[] = [
  { value: 'both',       label: 'Her İkisi',             desc: 'Öğrenci bireysel veya ekip seçer' },
  { value: 'individual', label: 'Bireysel Proje Zorunlu', desc: 'Sadece bireysel proje açılabilir' },
  { value: 'team',       label: 'Ekip Projesi Zorunlu',  desc: 'Sadece ekip projesi açılabilir' },
];

export const CourseCreateScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

  // Admin guard — sadece ADMIN erişebilir
  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Yetkisiz', 'Bu sayfaya sadece adminler erişebilir.', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
    }
  }, [isAdmin]);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [semester, setSemester] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [branch, setBranch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('both');
  const [requireYoutube, setRequireYoutube] = useState(false);
  const [requireFile, setRequireFile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);

  // Bölüm ve öğretmen listesini çek
  useEffect(() => {
    if (!isAdmin) return;

    apiClient.get<Department[]>('/api/v1/departments')
      .then(({ data }) => {
        const items = Array.isArray(data) ? data : (data as any)?.items ?? [];
        setDepartments(items);
      })
      .catch(() => {});

    apiClient.get<{ items: TeacherOption[] }>('/api/v1/users?role=teacher&is_active=true&size=200')
      .then(({ data }) => setTeachers(data?.items ?? []))
      .catch(() => {});
  }, [isAdmin]);

  const departmentOptions: PickerOption[] = departments.map((d) => ({
    label: d.name,
    value: d.id,
  }));

  const teacherOptions: PickerOption[] = teachers.map((t) => ({
    label: t.full_name,
    value: t.id,
    subtitle: t.email,
  }));

  const handleCreate = async () => {
    if (!name || !code || !semester) {
      return Alert.alert('Hata', 'Ders adı, kodu ve dönemi zorunludur.');
    }
    if (!departmentId) {
      return Alert.alert('Hata', 'Bölüm seçimi zorunludur.');
    }
    if (!teacherId) {
      return Alert.alert('Hata', 'Atanacak öğretmen seçimi zorunludur.');
    }
    try {
      setIsLoading(true);
      await apiClient.post('/api/v1/courses', {
        name,
        code,
        semester,
        grade_level: gradeLevel || undefined,
        branch: branch || undefined,
        department_id: departmentId,
        teacher_id: teacherId,
        project_type: projectType,
        require_youtube: requireYoutube,
        require_file: requireFile,
      });
      Alert.alert('Başarılı', 'Ders başarıyla oluşturuldu!', [
        { text: 'Tamam', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      let errorMessage = 'Ders oluşturulamadı.';
      const detail = error.response?.data?.detail;
      if (typeof detail === 'string') {
        errorMessage = detail;
      } else if (Array.isArray(detail)) {
        errorMessage = detail.map((d: any) => d.msg).join('\n');
      }
      Alert.alert('Hata', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-slate-950">
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }}>
        <Card className="shadow-xl border-slate-800 bg-slate-900">
          <CardHeader className="items-center">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-indigo-900/50 mb-4">
              <BookOpen size={28} color="#818cf8" />
            </View>
            <CardTitle>Yeni Ders Oluştur</CardTitle>
            <Text className="text-sm text-center text-gray-400 mt-2">
              Bölümdeki öğrenciler bu dersi otomatik olarak görür.
            </Text>
          </CardHeader>
          <CardContent>
            <Input
              label="Ders Adı"
              placeholder="Yazılım Mühendisliği"
              value={name}
              onChangeText={setName}
            />
            <Input
              label="Ders Kodu"
              placeholder="CENG314"
              autoCapitalize="characters"
              value={code}
              onChangeText={setCode}
            />
            <Input
              label="Dönem"
              placeholder="2025-2026 Güz"
              value={semester}
              onChangeText={setSemester}
            />

            {/* Bölüm Seçimi (Zorunlu) */}
            <ModalPicker
              label="Bölüm"
              placeholder="— Bölüm seçin —"
              options={departmentOptions}
              value={departmentId}
              onChange={setDepartmentId}
              required
              searchable={departments.length > 5}
            />

            {/* Öğretmen Atama (Zorunlu) */}
            <ModalPicker
              label="Atanacak Öğretmen"
              placeholder="— Öğretmen seçin —"
              options={teacherOptions}
              value={teacherId}
              onChange={setTeacherId}
              required
              searchable
            />

            {/* Sınıf / Şube */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Input
                  label="Sınıf / Yıl (Opsiyonel)"
                  placeholder="2. Sınıf"
                  value={gradeLevel}
                  onChangeText={setGradeLevel}
                />
              </View>
              <View className="flex-1">
                <Input
                  label="Şube (Opsiyonel)"
                  placeholder="A Şubesi"
                  value={branch}
                  onChangeText={setBranch}
                />
              </View>
            </View>

            {/* Proje Tipi Seçimi */}
            <View className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 mt-2 mb-4">
              <Text className="text-sm font-medium text-gray-300 mb-1">Proje Tipi</Text>
              <Text className="text-xs text-gray-500 mb-3">
                Bu derse öğrencilerin oluşturabileceği proje türü.
              </Text>
              {PROJECT_TYPE_OPTIONS.map((opt) => {
                const selected = projectType === opt.value;
                return (
                  <View
                    key={opt.value}
                    className={`flex-row items-center rounded-xl border px-3 py-3 mb-2 ${
                      selected
                        ? 'border-indigo-500 bg-indigo-900/20'
                        : 'border-slate-600'
                    }`}
                  >
                    <Switch
                      value={selected}
                      onValueChange={() => setProjectType(opt.value)}
                      trackColor={{ false: '#334155', true: '#818cf8' }}
                      thumbColor={selected ? '#ffffff' : '#94a3b8'}
                    />
                    <View className="ml-3 flex-1">
                      <Text className={`text-sm font-medium ${selected ? 'text-indigo-300' : 'text-gray-200'}`}>
                        {opt.label}
                      </Text>
                      <Text className="text-xs text-gray-500">{opt.desc}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

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
              title="Dersi Oluştur"
              onPress={handleCreate}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
