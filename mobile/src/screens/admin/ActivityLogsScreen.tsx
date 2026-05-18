/**
 * ActivityLogsScreen — Admin aktivite logları ekranı.
 * Web panelindeki /dashboard/admin/logs sayfasının mobil karşılığı.
 * Backend: GET /api/v1/admin/activity-logs
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal,
  Alert, ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { ScrollText, Info, X, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react-native';
import apiClient from '../../lib/apiClient';

// ── Tipler ──
interface ActivityLog {
  id: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

interface PaginatedLogs {
  items: ActivityLog[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// ── Sözlükler (web paneli ile tutarlı) ──
const ACTION_LABELS: Record<string, string> = {
  user_login: 'Giriş',
  user_register: 'Kayıt',
  user_update: 'Kullanıcı Güncelleme',
  user_role_change: 'Rol Değişikliği',
  user_password_change: 'Şifre Değişikliği',
  project_create: 'Proje Oluşturma',
  project_approve: 'Proje Onayı',
  project_reject: 'Proje Reddi',
  project_delete: 'Proje Silme',
  project_restore: 'Proje Geri Yükleme',
  report_submit: 'Rapor Teslim',
  report_review: 'Rapor İnceleme',
  report_delete: 'Rapor Silme',
  report_restore: 'Rapor Geri Yükleme',
  course_create: 'Ders Oluşturma',
  course_update: 'Ders Güncelleme',
  course_delete: 'Ders Silme',
};

const ENTITY_LABELS: Record<string, string> = {
  user: 'Kullanıcı',
  project: 'Proje',
  report: 'Rapor',
  course: 'Ders',
  task: 'Görev',
};

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  user_login:          { bg: 'bg-blue-900/30',    text: 'text-blue-400' },
  user_register:       { bg: 'bg-emerald-900/30', text: 'text-emerald-400' },
  user_update:         { bg: 'bg-indigo-900/30',  text: 'text-indigo-400' },
  user_role_change:    { bg: 'bg-purple-900/30',  text: 'text-purple-400' },
  user_password_change: { bg: 'bg-amber-900/30',  text: 'text-amber-400' },
  project_create:      { bg: 'bg-emerald-900/30', text: 'text-emerald-400' },
  project_approve:     { bg: 'bg-emerald-900/30', text: 'text-emerald-400' },
  project_reject:      { bg: 'bg-red-900/30',     text: 'text-red-400' },
  project_delete:      { bg: 'bg-red-900/30',     text: 'text-red-400' },
  project_restore:     { bg: 'bg-cyan-900/30',    text: 'text-cyan-400' },
  report_submit:       { bg: 'bg-blue-900/30',    text: 'text-blue-400' },
  report_review:       { bg: 'bg-emerald-900/30', text: 'text-emerald-400' },
  report_delete:       { bg: 'bg-red-900/30',     text: 'text-red-400' },
  report_restore:      { bg: 'bg-cyan-900/30',    text: 'text-cyan-400' },
  course_create:       { bg: 'bg-emerald-900/30', text: 'text-emerald-400' },
  course_update:       { bg: 'bg-indigo-900/30',  text: 'text-indigo-400' },
  course_delete:       { bg: 'bg-red-900/30',     text: 'text-red-400' },
};

type FilterType = 'action' | 'entity' | 'size';

const ACTION_FILTER_OPTIONS = Object.entries(ACTION_LABELS)
  .sort((a, b) => a[1].localeCompare(b[1], 'tr'))
  .map(([value, label]) => ({ value, label }));

const ENTITY_FILTER_OPTIONS = Object.entries(ENTITY_LABELS)
  .map(([value, label]) => ({ value, label }));

const SIZE_OPTIONS = [5, 10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = 20;

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('tr-TR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export const ActivityLogsScreen = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [showFilterModal, setShowFilterModal] = useState<FilterType | null>(null);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Detay modal
  const [selected, setSelected] = useState<ActivityLog | null>(null);

  const fetchLogs = useCallback(async (targetPage: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        size: String(pageSize),
      });
      if (actionFilter) params.set('action', actionFilter);
      if (entityFilter) params.set('entity_type', entityFilter);

      const { data } = await apiClient.get<PaginatedLogs>(
        `/api/v1/admin/activity-logs?${params}`,
      );

      setLogs(data.items);
      setPage(targetPage);
      setTotal(data.total);
      setTotalPages(data.pages);
    } catch (err: any) {
      const msg = err?.response?.data?.detail;
      Alert.alert('Hata', typeof msg === 'string' ? msg : 'Loglar yüklenemedi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [actionFilter, entityFilter, pageSize]);

  useEffect(() => {
    fetchLogs(1);
  }, [actionFilter, entityFilter, pageSize]);

  const onRefresh = () => { setRefreshing(true); fetchLogs(page); };

  const hasActiveFilters = !!(actionFilter || entityFilter);

  const renderLog = ({ item }: { item: ActivityLog }) => {
    const actionLabel = ACTION_LABELS[item.action] ?? item.action;
    const colors = ACTION_COLORS[item.action] ?? { bg: 'bg-gray-700/50', text: 'text-gray-400' };

    return (
      <TouchableOpacity
        onPress={() => setSelected(item)}
        className="px-4 py-3 border-b border-slate-800"
        activeOpacity={0.7}
      >
        <View className="flex-row items-start justify-between mb-1">
          <View className={`rounded-md px-2 py-0.5 ${colors.bg}`}>
            <Text className={`text-[11px] font-semibold ${colors.text}`}>{actionLabel}</Text>
          </View>
          <Text className="text-[10px] text-gray-500">{formatDateTime(item.created_at)}</Text>
        </View>

        <View className="mt-1.5">
          {item.user_name ? (
            <Text className="text-sm text-white">{item.user_name}</Text>
          ) : (
            <Text className="text-xs text-gray-500">— (anonim)</Text>
          )}
          {item.entity_type && (
            <Text className="text-xs text-gray-400 mt-0.5">
              {ENTITY_LABELS[item.entity_type] ?? item.entity_type}
              {item.entity_id && ` · ${item.entity_id.slice(0, 8)}…`}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-slate-950">
      {/* Başlık ve filtreler */}
      <View className="px-4 pt-4 pb-3">
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-xl font-bold text-white">Aktivite Logları</Text>
            <Text className="text-xs text-gray-400 mt-0.5">Toplam {total} kayıt</Text>
          </View>
        </View>

        {/* Filtre Butonları */}
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => setShowFilterModal('action')}
            className={`flex-1 flex-row items-center justify-between rounded-xl px-3 py-2.5 ${
              actionFilter ? 'bg-indigo-900/30 border border-indigo-500/30' : 'bg-slate-800'
            }`}
          >
            <Text className={`text-xs ${actionFilter ? 'text-indigo-300' : 'text-gray-500'}`} numberOfLines={1}>
              {actionFilter ? (ACTION_LABELS[actionFilter] ?? actionFilter) : 'Tüm Aksiyonlar'}
            </Text>
            <ChevronDown size={12} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowFilterModal('entity')}
            className={`flex-1 flex-row items-center justify-between rounded-xl px-3 py-2.5 ${
              entityFilter ? 'bg-indigo-900/30 border border-indigo-500/30' : 'bg-slate-800'
            }`}
          >
            <Text className={`text-xs ${entityFilter ? 'text-indigo-300' : 'text-gray-500'}`} numberOfLines={1}>
              {entityFilter ? (ENTITY_LABELS[entityFilter] ?? entityFilter) : 'Tüm Hedefler'}
            </Text>
            <ChevronDown size={12} color="#64748b" />
          </TouchableOpacity>

          {hasActiveFilters && (
            <TouchableOpacity
              onPress={() => { setActionFilter(''); setEntityFilter(''); }}
              className="items-center justify-center rounded-xl bg-red-900/20 px-3"
            >
              <X size={14} color="#f87171" />
            </TouchableOpacity>
          )}
        </View>

        {/* Sayfa Boyutu Seçici */}
        <View className="flex-row items-center gap-2 mt-2">
          <Text className="text-xs text-gray-500">Göster:</Text>
          <View className="flex-row gap-1.5 flex-1">
            {SIZE_OPTIONS.map((size) => (
              <TouchableOpacity
                key={size}
                onPress={() => setPageSize(size)}
                className={`rounded-lg px-2.5 py-1.5 ${
                  pageSize === size
                    ? 'bg-indigo-600'
                    : 'bg-slate-800'
                }`}
              >
                <Text className={`text-xs font-semibold ${
                  pageSize === size ? 'text-white' : 'text-gray-400'
                }`}>{size}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Log listesi */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#818cf8" />
        </View>
      ) : logs.length === 0 ? (
        <View className="flex-1 items-center justify-center py-16">
          <ScrollText size={40} color="#475569" />
          <Text className="text-sm text-gray-500 mt-4 text-center">
            {hasActiveFilters
              ? 'Filtrelere uygun log bulunamadı.'
              : 'Henüz aktivite logu yok.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={renderLog}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#818cf8" />}
          ListFooterComponent={
            <View className="px-4 py-3 border-t border-slate-800">
              {/* Sayfa Bilgisi */}
              <Text className="text-xs text-gray-500 text-center mb-3">
                Sayfa {page} / {totalPages} · Toplam {total} kayıt
              </Text>

              {/* Sayfa Navigasyonu */}
              <View className="flex-row items-center justify-center gap-3">
                {/* Önceki Sayfa */}
                <TouchableOpacity
                  onPress={() => fetchLogs(page - 1)}
                  disabled={page <= 1}
                  className={`flex-row items-center gap-1 rounded-xl px-4 py-2.5 ${
                    page <= 1 ? 'bg-slate-800/50 opacity-40' : 'bg-slate-800'
                  }`}
                >
                  <ChevronLeft size={14} color={page <= 1 ? '#475569' : '#818cf8'} />
                  <Text className={`text-xs font-semibold ${page <= 1 ? 'text-gray-600' : 'text-indigo-400'}`}>Önceki</Text>
                </TouchableOpacity>

                {/* Sayfa Numaraları */}
                <View className="flex-row gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <TouchableOpacity
                        key={pageNum}
                        onPress={() => fetchLogs(pageNum)}
                        className={`h-8 w-8 items-center justify-center rounded-lg ${
                          pageNum === page ? 'bg-indigo-600' : 'bg-slate-800'
                        }`}
                      >
                        <Text className={`text-xs font-bold ${
                          pageNum === page ? 'text-white' : 'text-gray-400'
                        }`}>{pageNum}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Sonraki Sayfa */}
                <TouchableOpacity
                  onPress={() => fetchLogs(page + 1)}
                  disabled={page >= totalPages}
                  className={`flex-row items-center gap-1 rounded-xl px-4 py-2.5 ${
                    page >= totalPages ? 'bg-slate-800/50 opacity-40' : 'bg-slate-800'
                  }`}
                >
                  <Text className={`text-xs font-semibold ${page >= totalPages ? 'text-gray-600' : 'text-indigo-400'}`}>Sonraki</Text>
                  <ChevronRight size={14} color={page >= totalPages ? '#475569' : '#818cf8'} />
                </TouchableOpacity>
              </View>

              <View className="h-4" />
            </View>
          }
        />
      )}

      {/* Filtre Seçim Modal */}
      <Modal
        visible={!!showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(null)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="max-h-[60%] rounded-t-2xl bg-slate-900 px-4 pb-8 pt-4">
            <Text className="text-base font-bold text-white mb-3">
              {showFilterModal === 'action' ? 'Aksiyon Filtresi' : 'Hedef Filtresi'}
            </Text>

            {/* Tümü seçeneği */}
            <TouchableOpacity
              onPress={() => {
                if (showFilterModal === 'action') setActionFilter('');
                else setEntityFilter('');
                setShowFilterModal(null);
              }}
              className={`rounded-xl px-4 py-3 mb-1 ${
                (showFilterModal === 'action' ? !actionFilter : !entityFilter) ? 'bg-indigo-900/40' : 'bg-slate-800'
              }`}
            >
              <Text className={`text-sm ${
                (showFilterModal === 'action' ? !actionFilter : !entityFilter) ? 'font-semibold text-indigo-300' : 'text-gray-300'
              }`}>
                Tümü
              </Text>
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false}>
              {(showFilterModal === 'action' ? ACTION_FILTER_OPTIONS : ENTITY_FILTER_OPTIONS).map((opt) => {
                const isSelected = showFilterModal === 'action'
                  ? actionFilter === opt.value
                  : entityFilter === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => {
                      if (showFilterModal === 'action') setActionFilter(opt.value);
                      else setEntityFilter(opt.value);
                      setShowFilterModal(null);
                    }}
                    className={`rounded-xl px-4 py-3 mb-1 ${isSelected ? 'bg-indigo-900/40' : 'bg-slate-800'}`}
                  >
                    <Text className={`text-sm ${isSelected ? 'font-semibold text-indigo-300' : 'text-gray-300'}`}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Detay Modal */}
      {selected && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setSelected(null)}>
          <View className="flex-1 justify-center items-center bg-black/60 p-4">
            <View className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
              {/* Başlık */}
              <View className="flex-row items-center justify-between px-4 pt-4 pb-3 border-b border-slate-700">
                <View className="flex-row items-center gap-2">
                  <ScrollText size={18} color="#818cf8" />
                  <Text className="text-base font-semibold text-white">Log Detayı</Text>
                </View>
                <TouchableOpacity onPress={() => setSelected(null)} className="p-1.5 rounded-lg bg-slate-800">
                  <X size={16} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView className="px-4 py-4" style={{ maxHeight: 400 }}>
                {/* Zaman + IP */}
                <View className="flex-row gap-3 mb-3">
                  <View className="flex-1">
                    <Text className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Zaman</Text>
                    <Text className="mt-1 text-xs text-gray-300">{formatDateTime(selected.created_at)}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-[10px] font-bold uppercase tracking-wider text-gray-500">IP Adresi</Text>
                    <Text className="mt-1 text-xs font-mono text-gray-300">{selected.ip_address ?? '—'}</Text>
                  </View>
                </View>

                {/* Kullanıcı */}
                <View className="mb-3">
                  <Text className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Kullanıcı</Text>
                  <Text className="mt-1 text-sm text-gray-200">
                    {selected.user_name
                      ? `${selected.user_name} (${selected.user_email})`
                      : '— (anonim)'}
                  </Text>
                </View>

                {/* Aksiyon + Hedef */}
                <View className="flex-row gap-3 mb-3">
                  <View className="flex-1">
                    <Text className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Aksiyon</Text>
                    <Text className="mt-1 text-sm text-gray-200">
                      {ACTION_LABELS[selected.action] ?? selected.action}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Hedef</Text>
                    <Text className="mt-1 text-sm text-gray-200">
                      {selected.entity_type
                        ? `${ENTITY_LABELS[selected.entity_type] ?? selected.entity_type}${
                            selected.entity_id ? ` · ${selected.entity_id}` : ''
                          }`
                        : '—'}
                    </Text>
                  </View>
                </View>

                {/* Ek Detaylar */}
                <View>
                  <Text className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
                    Ek Detaylar (JSON)
                  </Text>
                  <View className="rounded-xl bg-slate-800 p-3">
                    <Text className="text-xs font-mono text-gray-300">
                      {selected.details
                        ? JSON.stringify(selected.details, null, 2)
                        : '(boş)'}
                    </Text>
                  </View>
                </View>
              </ScrollView>

              <View className="px-4 py-3 border-t border-slate-700">
                <TouchableOpacity
                  onPress={() => setSelected(null)}
                  className="rounded-xl bg-slate-800 py-3 items-center"
                >
                  <Text className="text-sm font-semibold text-gray-200">Kapat</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};
