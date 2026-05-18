/**
 * UserDetailModal — Kullanıcı detaylarını görüntüleme ve admin düzenleme modal'ı.
 * Web panelindeki detay panelinin mobil karşılığı.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { X, Save, Trash2, UserX, RotateCcw } from 'lucide-react-native';
import apiClient from '../../lib/apiClient';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import { ModalPicker, PickerOption } from '../../components/ui/ModalPicker';

interface Department { id: string; name: string; }

interface UserItem {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  student_no?: string;
  grade_label?: string;
  is_active: boolean;
  departments: Department[];
  created_at: string;
}

const ROLE_LABEL: Record<string, string> = {
  STUDENT: 'Öğrenci',
  TEACHER: 'Öğretmen',
  ADMIN: 'Admin',
};

const GRADE_OPTIONS = ['1. Sınıf', '2. Sınıf', '3. Sınıf', '4. Sınıf'];

interface Props {
  visible: boolean;
  userId: string | null;
  onClose: () => void;
  onUpdated: () => void;
}

export const UserDetailModal: React.FC<Props> = ({ visible, userId, onClose, onUpdated }) => {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role?.toUpperCase() === 'ADMIN';

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserItem | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [saving, setSaving] = useState(false);

  // Edit state (admin only)
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editStudentNo, setEditStudentNo] = useState('');
  const [editGradeLabel, setEditGradeLabel] = useState('');
  const [editDeptIds, setEditDeptIds] = useState<string[]>([]);

  const fetchUser = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data } = await apiClient.get<UserItem>(`/api/v1/users/${userId}`);
      setUserData(data);
      // Edit state'i doldur
      setEditFirstName(data.first_name ?? '');
      setEditLastName(data.last_name ?? '');
      setEditEmail(data.email ?? '');
      setEditRole(data.role?.toUpperCase() ?? 'STUDENT');
      setEditStudentNo(data.student_no ?? '');
      setEditGradeLabel(data.grade_label ?? '');
      setEditDeptIds(data.departments.map((d) => d.id));
    } catch {
      Alert.alert('Hata', 'Kullanıcı bilgileri yüklenemedi.');
      onClose();
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (visible && userId) {
      fetchUser();
    }
  }, [visible, userId]);

  useEffect(() => {
    if (isAdmin) {
      apiClient.get<Department[]>('/api/v1/admin/departments')
        .then(({ data }) => setDepartments(data))
        .catch(() => {});
    }
  }, [isAdmin]);

  const handleSave = async () => {
    if (!userData || !isAdmin) return;
    setSaving(true);
    try {
      // Kullanıcı bilgilerini güncelle
      await apiClient.patch(`/api/v1/users/${userData.id}`, {
        email: editEmail.trim().toLowerCase() || undefined,
        first_name: editFirstName.trim() || undefined,
        last_name: editLastName.trim() || undefined,
        role: editRole !== userData.role?.toUpperCase() ? editRole.toLowerCase() : undefined,
        department_ids: editDeptIds.length > 0 ? editDeptIds : undefined,
      });

      // Öğrenci bilgilerini güncelle
      if (editRole === 'STUDENT' || userData.role?.toUpperCase() === 'STUDENT') {
        await apiClient.patch(`/api/v1/users/${userData.id}/student-info`, {
          student_no: editStudentNo.trim() || undefined,
          grade_label: editGradeLabel || undefined,
        });
      }

      Alert.alert('Başarılı', 'Kullanıcı bilgileri güncellendi.');
      onUpdated();
      fetchUser();
    } catch (error: any) {
      const msg = error?.response?.data?.detail;
      Alert.alert('Hata', typeof msg === 'string' ? msg : 'Güncelleme başarısız.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = () => {
    if (!userData || !isAdmin) return;
    const action = userData.is_active ? 'pasif' : 'aktif';
    Alert.alert(
      `Kullanıcıyı ${action === 'pasif' ? 'Pasife Al' : 'Aktif Et'}`,
      `${userData.full_name} adlı kullanıcı ${action} duruma getirilecek.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: action === 'pasif' ? 'Pasife Al' : 'Aktif Et',
          style: action === 'pasif' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await apiClient.patch(`/api/v1/users/${userData.id}`, {
                is_active: !userData.is_active,
              });
              Alert.alert('Başarılı', `Kullanıcı ${action} duruma getirildi.`);
              onUpdated();
              fetchUser();
            } catch (error: any) {
              const msg = error?.response?.data?.detail;
              Alert.alert('Hata', typeof msg === 'string' ? msg : 'İşlem başarısız.');
            }
          },
        },
      ],
    );
  };

  const handleDelete = () => {
    if (!userData || !isAdmin) return;
    Alert.alert(
      'Kullanıcıyı Kalıcı Sil',
      `${userData.full_name} adlı kullanıcı kalıcı olarak silinecek. Bu işlem geri alınamaz.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kalıcı Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/api/v1/users/${userData.id}`);
              Alert.alert('Başarılı', 'Kullanıcı silindi.');
              onUpdated();
              onClose();
            } catch (error: any) {
              const msg = error?.response?.data?.detail;
              Alert.alert('Hata', typeof msg === 'string' ? msg : 'Silinemedi.');
            }
          },
        },
      ],
    );
  };

  const roleOptions: PickerOption[] = [
    { label: 'Öğrenci', value: 'STUDENT' },
    { label: 'Öğretmen', value: 'TEACHER' },
    { label: 'Admin', value: 'ADMIN' },
  ];

  const gradeOptions: PickerOption[] = GRADE_OPTIONS.map((g) => ({ label: g, value: g }));

  const deptOptions: PickerOption[] = departments.map((d) => ({ label: d.name, value: d.id }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="max-h-[92%] rounded-t-2xl bg-slate-900 border-t border-slate-700">
          {/* Durum çizgisi */}
          <View className={`h-1 rounded-t-2xl ${userData?.is_active ? 'bg-emerald-500' : 'bg-slate-600'}`} />

          {/* Başlık */}
          <View className="flex-row items-center justify-between px-4 pt-4 pb-3 border-b border-slate-700">
            <View className="flex-1 mr-3">
              <Text className="text-lg font-semibold text-white" numberOfLines={1}>
                {userData?.full_name ?? 'Yükleniyor...'}
              </Text>
              <Text className="text-xs text-gray-400" numberOfLines={1}>
                {userData?.email}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-2 rounded-lg bg-slate-800">
              <X size={16} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View className="py-16 items-center">
              <ActivityIndicator color="#818cf8" />
            </View>
          ) : userData && (
            <>
              <ScrollView className="px-4 py-4" contentContainerStyle={{ paddingBottom: 24 }}>
                {isAdmin ? (
                  /* ── Admin Düzenleme Modu ── */
                  <>
                    <View className="flex-row gap-3">
                      <View className="flex-1">
                        <Input label="Ad" value={editFirstName} onChangeText={setEditFirstName} />
                      </View>
                      <View className="flex-1">
                        <Input label="Soyad" value={editLastName} onChangeText={setEditLastName} />
                      </View>
                    </View>
                    <Input label="E-posta" value={editEmail} onChangeText={setEditEmail} keyboardType="email-address" />

                    <ModalPicker
                      label="Rol"
                      options={roleOptions}
                      value={editRole}
                      onChange={setEditRole}
                    />

                    {/* Durum (salt okunur) */}
                    <View className="mb-3">
                      <Text className="text-sm font-medium text-gray-300 mb-1.5">Durum</Text>
                      <View className={`rounded-xl border px-4 py-3 ${
                        userData.is_active
                          ? 'border-emerald-700/40 bg-emerald-900/20'
                          : 'border-slate-600 bg-slate-800'
                      }`}>
                        <Text className={userData.is_active ? 'text-sm text-emerald-400' : 'text-sm text-gray-400'}>
                          {userData.is_active ? 'Aktif' : 'Pasif'}
                        </Text>
                      </View>
                    </View>

                    {/* Bölüm Seçimi */}
                    {departments.length > 0 && (
                      <View className="mb-3">
                        <Text className="text-sm font-medium text-gray-300 mb-1.5">Bölümler</Text>
                        <View className="rounded-xl border border-slate-700 bg-slate-800/50 p-3 gap-1.5">
                          {deptOptions.map((d) => {
                            const checked = editDeptIds.includes(d.value);
                            return (
                              <TouchableOpacity
                                key={d.value}
                                onPress={() => {
                                  setEditDeptIds((prev) =>
                                    checked
                                      ? prev.filter((id) => id !== d.value)
                                      : [...prev, d.value]
                                  );
                                }}
                                className={`flex-row items-center rounded-lg px-3 py-2 ${
                                  checked ? 'bg-indigo-900/30' : 'bg-slate-800'
                                }`}
                              >
                                <View className={`h-4 w-4 rounded border mr-3 items-center justify-center ${
                                  checked ? 'bg-indigo-600 border-indigo-500' : 'border-slate-600'
                                }`}>
                                  {checked && <Text className="text-white text-[10px] font-bold">✓</Text>}
                                </View>
                                <Text className={`text-sm ${checked ? 'text-indigo-300' : 'text-gray-300'}`}>
                                  {d.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    {/* Öğrenci alanları */}
                    {editRole === 'STUDENT' && (
                      <View className="flex-row gap-3">
                        <View className="flex-1">
                          <Input
                            label="Öğrenci No"
                            value={editStudentNo}
                            onChangeText={setEditStudentNo}
                            maxLength={9}
                            keyboardType="numeric"
                            placeholder="123456789"
                          />
                        </View>
                        <View className="flex-1">
                          <ModalPicker
                            label="Sınıf"
                            placeholder="Seçiniz"
                            options={gradeOptions}
                            value={editGradeLabel}
                            onChange={setEditGradeLabel}
                          />
                        </View>
                      </View>
                    )}
                  </>
                ) : (
                  /* ── Teacher: Salt Okunur Görünüm ── */
                  <>
                    <View className="flex-row gap-3 mb-3">
                      <View className="flex-1 rounded-xl border border-slate-700 bg-slate-800/50 p-4">
                        <Text className="text-xs font-semibold uppercase tracking-wider text-gray-500">Rol</Text>
                        <Text className="mt-1 text-sm font-medium text-gray-200">
                          {ROLE_LABEL[userData.role?.toUpperCase()] ?? userData.role}
                        </Text>
                      </View>
                      <View className="flex-1 rounded-xl border border-slate-700 bg-slate-800/50 p-4">
                        <Text className="text-xs font-semibold uppercase tracking-wider text-gray-500">Durum</Text>
                        <Text className={`mt-1 text-sm font-medium ${userData.is_active ? 'text-emerald-400' : 'text-gray-400'}`}>
                          {userData.is_active ? 'Aktif' : 'Pasif'}
                        </Text>
                      </View>
                    </View>
                    <View className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 mb-3">
                      <Text className="text-xs font-semibold uppercase tracking-wider text-gray-500">Bölümler</Text>
                      <Text className="mt-1 text-sm text-gray-200">
                        {userData.departments.map((d) => d.name).join(', ') || '—'}
                      </Text>
                    </View>
                    {userData.role?.toUpperCase() === 'STUDENT' && (
                      <View className="flex-row gap-3 mb-3">
                        <View className="flex-1 rounded-xl border border-slate-700 bg-slate-800/50 p-4">
                          <Text className="text-xs font-semibold uppercase tracking-wider text-gray-500">Öğrenci No</Text>
                          <Text className="mt-1 text-sm font-medium text-gray-200">{userData.student_no ?? '—'}</Text>
                        </View>
                        <View className="flex-1 rounded-xl border border-slate-700 bg-slate-800/50 p-4">
                          <Text className="text-xs font-semibold uppercase tracking-wider text-gray-500">Sınıf</Text>
                          <Text className="mt-1 text-sm font-medium text-gray-200">{userData.grade_label ?? '—'}</Text>
                        </View>
                      </View>
                    )}
                  </>
                )}
              </ScrollView>

              {/* Footer — Kayıt tarihi + Eylem butonları */}
              <View className="px-4 pb-8 pt-3 border-t border-slate-700">
                <Text className="text-xs text-gray-500 mb-3">
                  Kayıt: {new Date(userData.created_at).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })}
                </Text>
                {isAdmin && (
                  <View className="gap-2">
                    <TouchableOpacity
                      onPress={handleSave}
                      disabled={saving}
                      className="flex-row items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3"
                      style={{ opacity: saving ? 0.6 : 1 }}
                    >
                      <Save size={16} color="#fff" />
                      <Text className="text-sm font-semibold text-white">
                        {saving ? 'Kaydediliyor...' : 'Kaydet'}
                      </Text>
                    </TouchableOpacity>

                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        onPress={handleToggleActive}
                        className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl border py-3 ${
                          userData.is_active
                            ? 'border-amber-700/40 bg-amber-500/10'
                            : 'border-emerald-700/40 bg-emerald-500/10'
                        }`}
                      >
                        {userData.is_active
                          ? <UserX size={14} color="#fbbf24" />
                          : <RotateCcw size={14} color="#34d399" />
                        }
                        <Text className={`text-xs font-semibold ${userData.is_active ? 'text-amber-300' : 'text-emerald-300'}`}>
                          {userData.is_active ? 'Pasif Yap' : 'Aktif Et'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleDelete}
                        className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-red-800/50 bg-red-500/10 py-3"
                      >
                        <Trash2 size={14} color="#f87171" />
                        <Text className="text-xs font-semibold text-red-400">Kalıcı Sil</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};
