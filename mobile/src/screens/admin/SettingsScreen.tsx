import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  Alert, RefreshControl, ActivityIndicator, ScrollView,
} from 'react-native';
import apiClient from '../../lib/apiClient';
import { Building2, Plus, Trash2, Pencil, Check, X, Hash, BookOpen } from 'lucide-react-native';
import { StudentPrefix } from '../../types/project';

type Tab = 'departments' | 'prefixes';

// ── Bölüm Yönetimi ───────────────────────────────────────────────────────────
interface Department { id: string; name: string; created_at: string; }

const DepartmentTab = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const fetch = useCallback(async () => {
    try {
      const { data } = await apiClient.get<Department[]>('/api/v1/admin/departments');
      setDepartments(data);
    } catch { Alert.alert('Hata', 'Bölümler yüklenemedi.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    try {
      const { data } = await apiClient.post<Department>('/api/v1/admin/departments', { name });
      setDepartments(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name, 'tr')));
      setNewName('');
    } catch (err: any) {
      Alert.alert('Hata', err.response?.data?.detail || 'Bölüm eklenemedi.');
    } finally { setAdding(false); }
  };

  const handleEditSave = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    try {
      const { data } = await apiClient.patch<Department>(`/api/v1/admin/departments/${id}`, { name });
      setDepartments(prev => prev.map(d => d.id === id ? data : d).sort((a, b) => a.name.localeCompare(b.name, 'tr')));
      setEditingId(null);
    } catch (err: any) { Alert.alert('Hata', err.response?.data?.detail || 'Güncellenemedi.'); }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Sil', `"${name}" bölümünü silmek istediğinize emin misiniz?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        try {
          await apiClient.delete(`/api/v1/admin/departments/${id}`);
          setDepartments(prev => prev.filter(d => d.id !== id));
        } catch (err: any) { Alert.alert('Hata', err.response?.data?.detail || 'Silinemedi.'); }
      }},
    ]);
  };

  if (loading) return <View className="flex-1 items-center justify-center"><ActivityIndicator color="#818cf8" /></View>;

  return (
    <View className="flex-1">
      <View className="flex-row items-center gap-2 px-4 mb-3">
        <TextInput value={newName} onChangeText={setNewName} placeholder="Yeni bölüm adı..."
          placeholderTextColor="#64748b" className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white"
          onSubmitEditing={handleAdd} returnKeyType="done" />
        <TouchableOpacity onPress={handleAdd} disabled={adding || !newName.trim()}
          className="h-12 w-12 items-center justify-center rounded-xl bg-indigo-600"
          style={{ opacity: adding || !newName.trim() ? 0.5 : 1 }}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      <FlatList data={departments} keyExtractor={i => i.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor="#818cf8" />}
        ListEmptyComponent={
          <View className="mt-10 items-center rounded-2xl border border-dashed border-slate-700 p-10">
            <Building2 size={32} color="#475569" />
            <Text className="text-sm text-gray-500 mt-3 text-center">Henüz bölüm eklenmemiş.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="mb-2 flex-row items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3">
            <Building2 size={16} color="#64748b" />
            {editingId === item.id ? (
              <View className="flex-1 flex-row items-center gap-2">
                <TextInput value={editName} onChangeText={setEditName} autoFocus
                  className="flex-1 rounded-lg border border-indigo-500 bg-slate-800 px-3 py-1.5 text-sm text-white"
                  onSubmitEditing={() => handleEditSave(item.id)} returnKeyType="done" />
                <TouchableOpacity onPress={() => handleEditSave(item.id)} className="h-8 w-8 items-center justify-center rounded-lg bg-emerald-700">
                  <Check size={14} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditingId(null)} className="h-8 w-8 items-center justify-center rounded-lg bg-slate-700">
                  <X size={14} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text className="flex-1 text-sm font-medium text-white">{item.name}</Text>
                <TouchableOpacity onPress={() => { setEditingId(item.id); setEditName(item.name); }}
                  className="h-8 w-8 items-center justify-center rounded-lg bg-slate-800">
                  <Pencil size={13} color="#94a3b8" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id, item.name)}
                  className="h-8 w-8 items-center justify-center rounded-lg bg-red-900/30">
                  <Trash2 size={13} color="#f87171" />
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      />
    </View>
  );
};

// ── Prefix Yönetimi ──────────────────────────────────────────────────────────
const PrefixTab = () => {
  const [prefixes, setPrefixes] = useState<StudentPrefix[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newPrefix, setNewPrefix] = useState('');
  const [newYear, setNewYear] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [adding, setAdding] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const { data } = await apiClient.get<StudentPrefix[]>('/api/v1/admin/year-prefixes');
      setPrefixes(data);
    } catch { Alert.alert('Hata', 'Prefix listesi yüklenemedi.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleAdd = async () => {
    if (newPrefix.length !== 6 || !/^\d{6}$/.test(newPrefix)) {
      Alert.alert('Hata', 'Prefix tam 6 haneli rakam olmalıdır.');
      return;
    }
    const year = parseInt(newYear);
    if (!year || year < 2000 || year > 2100) {
      Alert.alert('Hata', 'Geçerli bir yıl giriniz (2000-2100).');
      return;
    }
    if (!newLabel.trim()) {
      Alert.alert('Hata', 'Sınıf etiketi boş olamaz.');
      return;
    }
    setAdding(true);
    try {
      const { data } = await apiClient.post<StudentPrefix>('/api/v1/admin/year-prefixes', {
        prefix: newPrefix, entry_year: year, label: newLabel.trim(),
      });
      setPrefixes(prev => [data, ...prev]);
      setNewPrefix(''); setNewYear(''); setNewLabel('');
    } catch (err: any) {
      Alert.alert('Hata', err.response?.data?.detail || 'Eklenemedi.');
    } finally { setAdding(false); }
  };

  const handleDelete = (id: string, prefix: string) => {
    Alert.alert('Sil', `"${prefix}" prefix'ini silmek istediğinize emin misiniz?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        try {
          await apiClient.delete(`/api/v1/admin/year-prefixes/${id}`);
          setPrefixes(prev => prev.filter(p => p.id !== id));
        } catch (err: any) { Alert.alert('Hata', err.response?.data?.detail || 'Silinemedi.'); }
      }},
    ]);
  };

  if (loading) return <View className="flex-1 items-center justify-center"><ActivityIndicator color="#818cf8" /></View>;

  return (
    <ScrollView className="flex-1"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor="#818cf8" />}>
      {/* Yeni Prefix Formu */}
      <View className="px-4 mb-4">
        <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Yeni Prefix Ekle</Text>
        <View className="rounded-2xl border border-slate-700 bg-slate-900 p-4 gap-3">
          <View>
            <Text className="text-xs text-gray-400 mb-1">6 Haneli Prefix</Text>
            <TextInput value={newPrefix} onChangeText={setNewPrefix} placeholder="ör: 245235"
              placeholderTextColor="#475569" keyboardType="numeric" maxLength={6}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white font-mono" />
          </View>
          <View>
            <Text className="text-xs text-gray-400 mb-1">Giriş Yılı</Text>
            <TextInput value={newYear} onChangeText={setNewYear} placeholder="ör: 2024"
              placeholderTextColor="#475569" keyboardType="numeric" maxLength={4}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white" />
          </View>
          <View>
            <Text className="text-xs text-gray-400 mb-1">Sınıf Etiketi</Text>
            <TextInput value={newLabel} onChangeText={setNewLabel} placeholder="ör: 2. Sınıf"
              placeholderTextColor="#475569"
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white" />
          </View>
          <TouchableOpacity onPress={handleAdd} disabled={adding}
            className="rounded-xl bg-indigo-600 py-3 items-center"
            style={{ opacity: adding ? 0.5 : 1 }}>
            <Text className="text-sm font-bold text-white">{adding ? 'Ekleniyor...' : 'Ekle'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Prefix Listesi */}
      <View className="px-4 pb-8">
        <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tanımlı Prefix'ler</Text>
        {prefixes.length === 0 ? (
          <View className="mt-4 items-center rounded-2xl border border-dashed border-slate-700 p-10">
            <Hash size={32} color="#475569" />
            <Text className="text-sm text-gray-500 mt-3 text-center">Henüz prefix tanımlanmamış.</Text>
          </View>
        ) : prefixes.map(p => (
          <View key={p.id} className="mb-2 flex-row items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3">
            <View className="rounded-lg bg-indigo-900/30 border border-indigo-500/20 px-2.5 py-1.5">
              <Text className="text-sm font-mono font-bold text-indigo-400">{p.prefix}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-white">{p.label}</Text>
              <Text className="text-xs text-gray-500">{p.entry_year} Girişi</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(p.id, p.prefix)}
              className="h-8 w-8 items-center justify-center rounded-lg bg-red-900/30">
              <Trash2 size={13} color="#f87171" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

// ── Ana Ekran ────────────────────────────────────────────────────────────────
export const SettingsScreen = () => {
  const [activeTab, setActiveTab] = useState<Tab>('departments');

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'departments', label: 'Bölümler', icon: <Building2 size={14} color={activeTab === 'departments' ? '#fff' : '#64748b'} /> },
    { key: 'prefixes', label: 'Prefix', icon: <Hash size={14} color={activeTab === 'prefixes' ? '#fff' : '#64748b'} /> },
  ];

  return (
    <View className="flex-1 bg-slate-950">
      {/* Başlık */}
      <View className="px-4 pt-6 pb-4">
        <Text className="text-2xl font-bold text-white">Ayarlar</Text>
        <Text className="text-sm text-gray-400 mt-1">Sistem ayarlarını yönetin.</Text>
      </View>

      {/* Tab Bar */}
      <View className="flex-row mx-4 mb-4 rounded-xl bg-slate-900 p-1">
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-lg ${activeTab === tab.key ? 'bg-indigo-600' : ''}`}
            onPress={() => setActiveTab(tab.key)}
          >
            {tab.icon}
            <Text className={`text-xs font-semibold ${activeTab === tab.key ? 'text-white' : 'text-gray-400'}`}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* İçerik */}
      {activeTab === 'departments' && <DepartmentTab />}
      {activeTab === 'prefixes' && <PrefixTab />}
    </View>
  );
};
