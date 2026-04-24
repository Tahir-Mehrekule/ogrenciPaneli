import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  Modal, ScrollView, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Search, X, Edit2, ChevronDown } from 'lucide-react-native';
import apiClient from '../../lib/apiClient';

interface Student {
  id: string;
  full_name: string;
  email: string;
  student_no?: string;
  grade_label?: string;
  departments: { id: string; name: string }[];
}

interface EditState {
  student: Student;
  student_no: string;
  grade_label: string;
}

const GRADE_OPTIONS = ['', '1. Sınıf', '2. Sınıf', '3. Sınıf', '4. Sınıf'];

export const StudentListScreen = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [showGradeModal, setShowGradeModal] = useState(false);

  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  const SIZE = 20;

  const fetchStudents = useCallback(async (reset = false) => {
    const currentPage = reset ? 1 : page;
    if (!reset && !hasMore) return;

    if (reset) setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(currentPage), size: String(SIZE) });
      if (search) params.set('search', search);
      if (gradeFilter) params.set('grade_label', gradeFilter);

      const { data } = await apiClient.get(`/api/v1/users/my-students?${params}`);
      if (reset) {
        setStudents(data.items);
        setPage(2);
      } else {
        setStudents((prev) => [...prev, ...data.items]);
        setPage((p) => p + 1);
      }
      setTotal(data.total);
      setHasMore(data.items.length === SIZE);
    } catch {
      Alert.alert('Hata', 'Öğrenciler yüklenemedi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, search, gradeFilter, hasMore]);

  useEffect(() => {
    fetchStudents(true);
  }, [search, gradeFilter]);

  const onRefresh = () => { setRefreshing(true); fetchStudents(true); };

  const saveEdit = async () => {
    if (!editState) return;
    if (editState.student_no && !/^\d{9}$/.test(editState.student_no)) {
      return Alert.alert('Hata', 'Öğrenci numarası 9 haneli rakamdan oluşmalıdır.');
    }
    setSaving(true);
    try {
      await apiClient.patch(`/api/v1/users/${editState.student.id}/student-info`, {
        student_no: editState.student_no || undefined,
        grade_label: editState.grade_label || undefined,
      });
      setEditState(null);
      fetchStudents(true);
    } catch (err: any) {
      const msg = err.response?.data?.detail;
      Alert.alert('Hata', msg || 'Güncelleme başarısız.');
    } finally {
      setSaving(false);
    }
  };

  const renderStudent = ({ item }: { item: Student }) => (
    <View className="flex-row items-center px-4 py-3 border-b border-slate-800">
      <View className="flex-1">
        <Text className="text-sm font-semibold text-white">{item.full_name}</Text>
        <Text className="text-xs text-gray-500 mt-0.5">
          {item.student_no ? `No: ${item.student_no}` : 'No girilmemiş'}
          {item.grade_label ? ` · ${item.grade_label}` : ''}
        </Text>
        {item.departments.length > 0 && (
          <Text className="text-xs text-indigo-400 mt-0.5">
            {item.departments.map((d) => d.name).join(', ')}
          </Text>
        )}
      </View>
      <TouchableOpacity
        onPress={() => setEditState({ student: item, student_no: item.student_no ?? '', grade_label: item.grade_label ?? '' })}
        className="p-2 rounded-lg bg-slate-800"
      >
        <Edit2 size={14} color="#818cf8" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View className="flex-1 bg-slate-950">
      {/* Filtre Çubuğu */}
      <View className="px-4 py-3 border-b border-slate-800 gap-2">
        <View className="flex-row items-center bg-slate-800 rounded-xl px-3 gap-2">
          <Search size={14} color="#64748b" />
          <TextInput
            className="flex-1 py-2.5 text-sm text-gray-200"
            placeholder="Ara..."
            placeholderTextColor="#64748b"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={14} color="#64748b" />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          onPress={() => setShowGradeModal(true)}
          className="flex-row items-center justify-between bg-slate-800 rounded-xl px-3 py-2.5"
        >
          <Text className={`text-sm ${gradeFilter ? 'text-indigo-300' : 'text-gray-500'}`}>
            {gradeFilter || 'Tüm Sınıflar'}
          </Text>
          <ChevronDown size={14} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Toplam */}
      <View className="px-4 py-2">
        <Text className="text-xs text-gray-500">Toplam {total} öğrenci</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#818cf8" />
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item.id}
          renderItem={renderStudent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#818cf8" />}
          onEndReached={() => fetchStudents(false)}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Text className="text-gray-500 text-sm">Öğrenci bulunamadı.</Text>
            </View>
          }
        />
      )}

      {/* Sınıf Filtre Modal */}
      <Modal visible={showGradeModal} transparent animationType="slide" onRequestClose={() => setShowGradeModal(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="rounded-t-2xl bg-slate-900 px-4 pb-8 pt-4">
            <Text className="text-base font-bold text-white mb-3">Sınıf Filtresi</Text>
            {GRADE_OPTIONS.map((g) => (
              <TouchableOpacity
                key={g}
                onPress={() => { setGradeFilter(g); setShowGradeModal(false); }}
                className={`rounded-xl px-4 py-3 mb-1 ${gradeFilter === g ? 'bg-indigo-900/40' : 'bg-slate-800'}`}
              >
                <Text className={`text-sm ${gradeFilter === g ? 'font-semibold text-indigo-300' : 'text-gray-300'}`}>
                  {g || 'Tüm Sınıflar'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Düzenleme Modal */}
      {editState && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setEditState(null)}>
          <View className="flex-1 items-center justify-center bg-black/60 px-6">
            <View className="w-full rounded-2xl bg-slate-900 p-5">
              <Text className="text-base font-bold text-white mb-1">Bilgileri Düzenle</Text>
              <Text className="text-sm text-gray-400 mb-4">{editState.student.full_name}</Text>

              <Text className="text-sm font-medium text-gray-300 mb-1.5">Öğrenci Numarası</Text>
              <TextInput
                className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-3 text-sm text-gray-200 font-mono mb-1"
                placeholder="123456789"
                placeholderTextColor="#64748b"
                maxLength={9}
                keyboardType="numeric"
                value={editState.student_no}
                onChangeText={(v) => setEditState((s) => s && { ...s, student_no: v.replace(/\D/g, '').slice(0, 9) })}
              />
              <Text className="text-xs text-gray-500 mb-4">9 haneli numara girilirse sınıf otomatik güncellenir</Text>

              <Text className="text-sm font-medium text-gray-300 mb-1.5">Sınıf (opsiyonel override)</Text>
              <View className="flex-row flex-wrap gap-2 mb-5">
                {GRADE_OPTIONS.map((g) => (
                  <TouchableOpacity
                    key={g}
                    onPress={() => setEditState((s) => s && { ...s, grade_label: g })}
                    className={`rounded-lg px-3 py-1.5 ${editState.grade_label === g ? 'bg-indigo-700' : 'bg-slate-800'}`}
                  >
                    <Text className={`text-xs font-medium ${editState.grade_label === g ? 'text-white' : 'text-gray-400'}`}>
                      {g || 'Otomatik'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View className="flex-row gap-3">
                <TouchableOpacity onPress={() => setEditState(null)} className="flex-1 rounded-xl border border-slate-700 py-3 items-center">
                  <Text className="text-sm font-medium text-gray-400">İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={saveEdit} disabled={saving} className="flex-1 rounded-xl bg-indigo-700 py-3 items-center opacity-100 disabled:opacity-60">
                  <Text className="text-sm font-semibold text-white">{saving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};
