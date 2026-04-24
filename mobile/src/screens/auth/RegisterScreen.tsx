import React, { useState, useEffect } from 'react';
import {
  View, Text, KeyboardAvoidingView, Platform,
  ScrollView, Alert, Modal, TouchableOpacity,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { BookOpen, GraduationCap, Clock, Mail, Users, ChevronDown, X } from 'lucide-react-native';
import apiClient from '../../lib/apiClient';
import type { DepartmentInfo } from '../../types/auth';

type SelectedRole = 'STUDENT' | 'TEACHER';
const isStudentEmail = (email: string) => email.toLowerCase().includes('@ogr.');

export const RegisterScreen = ({ navigation }: any) => {
  const { register } = useAuth();
  const [selectedRole, setSelectedRole] = useState<SelectedRole>('STUDENT');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentNo, setStudentNo] = useState('');
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [departments, setDepartments] = useState<DepartmentInfo[]>([]);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);

  const isStudent = selectedRole === 'STUDENT';

  useEffect(() => {
    apiClient
      .get<DepartmentInfo[]>('/api/v1/admin/departments')
      .then(({ data }) => setDepartments(data))
      .catch(() => {});
  }, []);

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (isStudentEmail(val)) setSelectedRole('STUDENT');
    else if (selectedRole === 'STUDENT') setSelectedRole('TEACHER');
  };

  const toggleDept = (id: string) => {
    if (isStudent) {
      setDepartmentIds((prev) => (prev.includes(id) ? [] : [id]));
      setShowDeptModal(false);
    } else {
      setDepartmentIds((prev) =>
        prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
      );
    }
  };

  const selectedDeptNames = departments
    .filter((d) => departmentIds.includes(d.id))
    .map((d) => d.name);

  const handleRegister = async () => {
    if (!firstName.trim() || !lastName.trim() || !email || !password) {
      return Alert.alert('Hata', 'Zorunlu alanları doldurun.');
    }
    if (isStudentEmail(email) && !isStudent) {
      return Alert.alert('Hata', '@ogr. mail ile sadece öğrenci kaydı yapılabilir.');
    }
    if (isStudent && !/^\d{9}$/.test(studentNo)) {
      return Alert.alert('Hata', 'Öğrenci numarası 9 haneli rakamdan oluşmalıdır.');
    }

    try {
      setIsLoading(true);
      const payload: any = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email,
        password,
        role: selectedRole,
        department_ids: departmentIds,
      };
      if (isStudent) payload.student_no = studentNo;

      const result = await register(payload);

      if (result.approval_status === 'pending') {
        setShowPendingModal(true);
      }
    } catch (error: any) {
      let msg = 'Kayıt sırasında bir hata oluştu.';
      const detail = error.response?.data?.detail;
      if (typeof detail === 'string') msg = detail;
      else if (Array.isArray(detail)) msg = detail.map((d: any) => `${d.loc?.[1] || ''}: ${d.msg}`).join('\n');
      Alert.alert('Kayıt Hatası', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-slate-950">
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
          <Card className="shadow-xl border-slate-800 bg-slate-900">
            <CardHeader className="items-center">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-emerald-900/50 mb-4">
                <BookOpen size={28} color="#10b981" />
              </View>
              <CardTitle>Yeni Hesap Oluştur</CardTitle>

              {/* Rol Toggle */}
              <View className="flex-row mt-4 rounded-xl border border-slate-700 overflow-hidden">
                <TouchableOpacity
                  onPress={() => setSelectedRole('STUDENT')}
                  className={`flex-1 flex-row items-center justify-center gap-2 py-2.5 ${isStudent ? 'bg-emerald-700' : 'bg-slate-800'}`}
                >
                  <GraduationCap size={16} color={isStudent ? '#fff' : '#94a3b8'} />
                  <Text className={`text-sm font-semibold ${isStudent ? 'text-white' : 'text-slate-400'}`}>Öğrenci</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSelectedRole('TEACHER')}
                  className={`flex-1 flex-row items-center justify-center gap-2 py-2.5 ${!isStudent ? 'bg-indigo-700' : 'bg-slate-800'}`}
                >
                  <Users size={16} color={!isStudent ? '#fff' : '#94a3b8'} />
                  <Text className={`text-sm font-semibold ${!isStudent ? 'text-white' : 'text-slate-400'}`}>Öğretmen</Text>
                </TouchableOpacity>
              </View>
            </CardHeader>

            <CardContent>
              {/* Ad + Soyad yan yana */}
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Input label="Ad" placeholder="Ahmet" value={firstName} onChangeText={setFirstName} />
                </View>
                <View className="flex-1">
                  <Input label="Soyad" placeholder="Yılmaz" value={lastName} onChangeText={setLastName} />
                </View>
              </View>

              <Input
                label="E-posta"
                placeholder={isStudent ? 'ahmet@ogr.unvan.edu.tr' : 'hoca@unvan.edu.tr'}
                value={email}
                onChangeText={handleEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {isStudent && (
                <View>
                  <Input
                    label="Öğrenci Numarası"
                    placeholder="123456789"
                    value={studentNo}
                    onChangeText={(v) => setStudentNo(v.replace(/\D/g, '').slice(0, 9))}
                    keyboardType="numeric"
                    maxLength={9}
                  />
                  <Text className="text-xs text-gray-500 -mt-2 mb-2">
                    9 haneli numara — sınıfınız otomatik belirlenir
                  </Text>
                </View>
              )}

              {/* Bölüm seçici */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-300 mb-1.5">
                  {isStudent ? 'Bölüm' : 'Bölümler'}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowDeptModal(true)}
                  className="flex-row items-center justify-between rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-3"
                >
                  <Text className={`text-sm ${selectedDeptNames.length > 0 ? 'text-gray-200' : 'text-gray-500'}`} numberOfLines={1}>
                    {selectedDeptNames.length > 0 ? selectedDeptNames.join(', ') : 'Bölüm seçin...'}
                  </Text>
                  <ChevronDown size={16} color="#64748b" />
                </TouchableOpacity>
              </View>

              <Input
                label="Şifre"
                placeholder="En az 6 karakter"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              {isStudent && (
                <View className="rounded-xl border border-amber-800/40 bg-amber-900/20 p-3 mb-4 flex-row items-start gap-2">
                  <Clock size={14} color="#fbbf24" style={{ marginTop: 1 }} />
                  <Text className="text-xs text-amber-400 flex-1">
                    Kaydınız öğretmeninizin onayını bekleyecektir.
                  </Text>
                </View>
              )}

              <Button
                title={isStudent ? 'Kayıt Başvurusu Yap' : 'Kayıt Ol ve Giriş Yap'}
                onPress={handleRegister}
                isLoading={isLoading}
                className={isStudent ? 'bg-emerald-700' : 'bg-indigo-700'}
              />

              <TouchableOpacity onPress={() => navigation.navigate('Login')} className="mt-4 items-center">
                <Text className="text-sm text-gray-500">
                  Zaten hesabınız var mı?{' '}
                  <Text className="text-emerald-400 font-medium">Giriş yapın</Text>
                </Text>
              </TouchableOpacity>
            </CardContent>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bölüm Seçim Modalı */}
      <Modal visible={showDeptModal} transparent animationType="slide" onRequestClose={() => setShowDeptModal(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="rounded-t-2xl bg-slate-900 px-4 pb-8">
            <View className="flex-row items-center justify-between py-4">
              <Text className="text-base font-bold text-white">Bölüm Seç</Text>
              <TouchableOpacity onPress={() => setShowDeptModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 320 }}>
              {departments.map((dept) => {
                const checked = departmentIds.includes(dept.id);
                return (
                  <TouchableOpacity
                    key={dept.id}
                    onPress={() => toggleDept(dept.id)}
                    className={`flex-row items-center justify-between rounded-xl px-4 py-3 mb-1 ${checked ? 'bg-indigo-900/40' : 'bg-slate-800'}`}
                  >
                    <Text className={`text-sm ${checked ? 'font-semibold text-indigo-300' : 'text-gray-300'}`}>
                      {dept.name}
                    </Text>
                    {checked && <View className="h-2 w-2 rounded-full bg-indigo-400" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {!isStudent && (
              <TouchableOpacity onPress={() => setShowDeptModal(false)} className="mt-4 items-center bg-indigo-700 rounded-xl py-3">
                <Text className="text-sm font-semibold text-white">Tamam</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Onay Bekleniyor Modal */}
      <Modal visible={showPendingModal} transparent animationType="fade" onRequestClose={() => {}}>
        <View className="flex-1 items-center justify-center bg-black/60 px-6">
          <View className="w-full rounded-2xl bg-slate-900 overflow-hidden">
            <View className="h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500" />
            <View className="p-6 items-center">
              <View className="h-20 w-20 rounded-full bg-emerald-900/40 items-center justify-center mb-4">
                <GraduationCap size={36} color="#10b981" />
              </View>
              <Text className="text-xl font-bold text-white mb-1">Başvurunuz Alındı!</Text>
              <Text className="text-sm text-emerald-400 mb-4">Onay bekleniyor</Text>
              <Text className="text-sm text-center text-gray-400 mb-4">
                Kaydınız öğretmeniniz veya yetkili tarafından onaylandıktan sonra giriş yapabilirsiniz.
              </Text>
              <View className="flex-row items-center gap-2 rounded-xl bg-slate-800 px-4 py-3 mb-4 w-full">
                <Mail size={14} color="#94a3b8" />
                <Text className="text-xs text-gray-400 flex-1">Onay sonrası öğretmeninizle iletişime geçin.</Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                className="w-full rounded-xl bg-emerald-700 py-3 items-center"
              >
                <Text className="text-sm font-semibold text-white">Giriş Sayfasına Dön</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};
