import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  Modal, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Search, X, ChevronDown, ChevronRight, UserPlus } from 'lucide-react-native';
import apiClient from '../../lib/apiClient';
import { useAuth } from '../../hooks/useAuth';
import { UserDetailModal } from './UserDetailModal';
import { AdminCreateUserModal } from './AdminCreateUserModal';

interface Department {
  id: string;
  name: string;
}

interface UserItem {
  id: string;
  full_name: string;
  email: string;
  role: string;
  student_no?: string;
  grade_label?: string;
  approval_status: string;
  is_active: boolean;
  departments: Department[];
}

type RoleFilter = '' | 'STUDENT' | 'TEACHER';

const ROLE_OPTIONS: { label: string; value: RoleFilter }[] = [
  { label: 'Tümü', value: '' },
  { label: 'Öğrenci', value: 'STUDENT' },
  { label: 'Öğretmen', value: 'TEACHER' },
];

const ROLE_COLORS: Record<string, string> = {
  STUDENT: 'text-emerald-400',
  TEACHER: 'text-indigo-400',
  ADMIN: 'text-amber-400',
};

const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Öğrenci',
  TEACHER: 'Öğretmen',
  ADMIN: 'Admin',
};

export const UserListScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('');
  const [showRoleModal, setShowRoleModal] = useState(false);

  // Detail & Create modals
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const SIZE = 20;

  const fetchUsers = useCallback(async (reset = false) => {
    const currentPage = reset ? 1 : page;
    if (!reset && !hasMore) return;

    if (reset) setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(currentPage), size: String(SIZE) });
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);

      const { data } = await apiClient.get(`/api/v1/users?${params}`);
      if (reset) {
        setUsers(data.items);
        setPage(2);
      } else {
        setUsers((prev) => [...prev, ...data.items]);
        setPage((p) => p + 1);
      }
      setTotal(data.total);
      setHasMore(data.items.length === SIZE);
    } catch {
      Alert.alert('Hata', 'Kullanıcılar yüklenemedi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, search, roleFilter, hasMore]);

  useEffect(() => {
    fetchUsers(true);
  }, [search, roleFilter]);

  // Header'a + butonu ekle (Admin)
  useEffect(() => {
    if (isAdmin && navigation) {
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
            className="mr-4 h-8 w-8 items-center justify-center rounded-lg bg-indigo-600"
          >
            <UserPlus size={16} color="#ffffff" />
          </TouchableOpacity>
        ),
      });
    }
  }, [isAdmin, navigation]);

  const onRefresh = () => { setRefreshing(true); fetchUsers(true); };

  const renderUser = ({ item }: { item: UserItem }) => (
    <TouchableOpacity
      onPress={() => setSelectedUserId(item.id)}
      className="flex-row items-center px-4 py-3 border-b border-slate-800"
      activeOpacity={0.7}
    >
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-sm font-semibold text-white">{item.full_name}</Text>
          <Text className={`text-xs font-bold ${ROLE_COLORS[item.role] ?? 'text-gray-400'}`}>
            {ROLE_LABELS[item.role] ?? item.role}
          </Text>
        </View>
        <Text className="text-xs text-gray-500 mt-0.5">{item.email}</Text>
        {item.departments.length > 0 && (
          <Text className="text-xs text-indigo-400 mt-0.5" numberOfLines={1}>
            {item.departments.map((d) => d.name).join(', ')}
          </Text>
        )}
      </View>
      <View className="items-end gap-1 mr-1">
        <View className={`rounded-full px-2 py-0.5 ${
          item.is_active ? 'bg-emerald-900/30' : 'bg-slate-700'
        }`}>
          <Text className={`text-[10px] font-semibold ${
            item.is_active ? 'text-emerald-400' : 'text-gray-500'
          }`}>
            {item.is_active ? 'Aktif' : 'Pasif'}
          </Text>
        </View>
      </View>
      <ChevronRight size={14} color="#475569" />
    </TouchableOpacity>
  );

  const currentRoleLabel = ROLE_OPTIONS.find((r) => r.value === roleFilter)?.label ?? 'Tümü';

  return (
    <View className="flex-1 bg-slate-950">
      {/* Filtre Çubuğu */}
      <View className="px-4 py-3 border-b border-slate-800 gap-2">
        <View className="flex-row items-center bg-slate-800 rounded-xl px-3 gap-2">
          <Search size={14} color="#64748b" />
          <TextInput
            className="flex-1 py-2.5 text-sm text-gray-200"
            placeholder="İsim veya e-posta ara..."
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
          onPress={() => setShowRoleModal(true)}
          className="flex-row items-center justify-between bg-slate-800 rounded-xl px-3 py-2.5"
        >
          <Text className={`text-sm ${roleFilter ? 'text-indigo-300' : 'text-gray-500'}`}>
            {currentRoleLabel}
          </Text>
          <ChevronDown size={14} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Toplam */}
      <View className="px-4 py-2">
        <Text className="text-xs text-gray-500">Toplam {total} kullanıcı</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#818cf8" />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#818cf8" />}
          onEndReached={() => fetchUsers(false)}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Text className="text-gray-500 text-sm">Kullanıcı bulunamadı.</Text>
            </View>
          }
        />
      )}

      {/* Rol Filtre Modal */}
      <Modal visible={showRoleModal} transparent animationType="slide" onRequestClose={() => setShowRoleModal(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="rounded-t-2xl bg-slate-900 px-4 pb-8 pt-4">
            <Text className="text-base font-bold text-white mb-3">Rol Filtresi</Text>
            {ROLE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => { setRoleFilter(opt.value); setShowRoleModal(false); }}
                className={`rounded-xl px-4 py-3 mb-1 ${roleFilter === opt.value ? 'bg-indigo-900/40' : 'bg-slate-800'}`}
              >
                <Text className={`text-sm ${roleFilter === opt.value ? 'font-semibold text-indigo-300' : 'text-gray-300'}`}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Kullanıcı Detay Modal */}
      <UserDetailModal
        visible={!!selectedUserId}
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
        onUpdated={() => fetchUsers(true)}
      />

      {/* Yeni Kullanıcı Oluşturma Modal */}
      <AdminCreateUserModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => fetchUsers(true)}
      />
    </View>
  );
};
