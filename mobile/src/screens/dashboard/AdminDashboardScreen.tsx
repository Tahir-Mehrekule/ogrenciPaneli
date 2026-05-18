/**
 * AdminDashboardScreen — Admin'e özel dashboard.
 * Web panelindeki AdminDashboard bileşeninin mobil karşılığı.
 *
 * Özellikler:
 *  - 4 sistem istatistik kartı (GET /api/v1/admin/stats)
 *  - "Yeni Kullanıcı Ekle" butonu → AdminCreateUserModal
 *  - Son 5 aktivite logu → ActivityLogsScreen'e yönlendirme
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../lib/apiClient';
import { Card, CardContent } from '../../components/ui/Card';
import {
  BookOpen, FolderKanban, CheckSquare, FileText,
  UserPlus, Activity, ExternalLink,
} from 'lucide-react-native';
import { AdminCreateUserModal } from '../admin_users/AdminCreateUserModal';

// ── Tipler ──
interface SystemStats {
  total_courses: number;
  total_projects: number;
  total_active_tasks: number;
  total_open_reports: number;
}

interface ActivityLog {
  id: string;
  user_name: string | null;
  user_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

// ── Sözlükler (web ile tutarlı) ──
const ACTION_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  user_login:       { label: 'Giriş',              bg: 'bg-blue-900/30',    text: 'text-blue-400' },
  user_register:    { label: 'Kayıt',              bg: 'bg-emerald-900/30', text: 'text-emerald-400' },
  user_update:      { label: 'Kullanıcı Güncelleme',bg: 'bg-indigo-900/30', text: 'text-indigo-400' },
  user_role_change: { label: 'Rol Değişikliği',    bg: 'bg-purple-900/30',  text: 'text-purple-400' },
  project_create:   { label: 'Proje Oluşturma',    bg: 'bg-indigo-900/30',  text: 'text-indigo-400' },
  project_approve:  { label: 'Proje Onayı',        bg: 'bg-emerald-900/30', text: 'text-emerald-400' },
  project_reject:   { label: 'Proje Reddi',        bg: 'bg-red-900/30',     text: 'text-red-400' },
  report_submit:    { label: 'Rapor Teslimi',       bg: 'bg-amber-900/30',  text: 'text-amber-400' },
  report_review:    { label: 'Rapor İncelemesi',    bg: 'bg-teal-900/30',   text: 'text-teal-400' },
  course_create:    { label: 'Ders Oluşturma',      bg: 'bg-indigo-900/30', text: 'text-indigo-400' },
  course_update:    { label: 'Ders Güncelleme',     bg: 'bg-slate-700/50',  text: 'text-slate-400' },
  course_delete:    { label: 'Ders Silme',          bg: 'bg-red-900/30',    text: 'text-red-400' },
};

const ENTITY_LABELS: Record<string, string> = {
  user: 'Kullanıcı', project: 'Proje', report: 'Rapor', course: 'Ders', task: 'Görev',
};

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

export const AdminDashboardScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const { data } = await apiClient.get<SystemStats>('/api/v1/admin/stats');
      setStats(data);
    } catch { /* sessiz */ }
    finally { setStatsLoading(false); }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({
        page: '1', size: '5', sort_by: 'created_at', order: 'desc',
      });
      const { data } = await apiClient.get<{ items: ActivityLog[] }>(
        `/api/v1/admin/activity-logs?${params}`,
      );
      setLogs(data.items ?? []);
    } catch { /* sessiz */ }
    finally { setLogsLoading(false); }
  }, []);

  useEffect(() => { fetchStats(); fetchLogs(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchLogs()]);
    setRefreshing(false);
  };

  const statCards = [
    { title: 'Toplam Ders',   value: stats?.total_courses ?? 0,      icon: BookOpen,    color: '#60a5fa' },
    { title: 'Toplam Proje',  value: stats?.total_projects ?? 0,     icon: FolderKanban,color: '#34d399' },
    { title: 'Aktif Görevler',value: stats?.total_active_tasks ?? 0,  icon: CheckSquare, color: '#818cf8' },
    { title: 'Açık Raporlar', value: stats?.total_open_reports ?? 0,  icon: FileText,    color: '#fbbf24' },
  ];

  const goToLogs = () => navigation.navigate('ActivityLogs');

  return (
    <ScrollView
      className="flex-1 bg-slate-950 p-4"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#818cf8" />}
    >
      {/* Başlık + Yeni Kullanıcı */}
      <View className="mb-6 mt-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="text-2xl font-bold tracking-tight text-white mb-1">
              Genel Bakış 🛡️
            </Text>
            <Text className="text-sm text-gray-400">
              Kullanıcı, ders ve son sistem aktivitelerini takip edin.
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowCreateUser(true)}
            className="flex-row items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2.5"
          >
            <UserPlus size={16} color="#ffffff" />
            <Text className="text-xs font-semibold text-white">Yeni Kullanıcı</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* İstatistik Kartları */}
      <View className="flex-row flex-wrap justify-between mb-6">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="w-[48%] mb-3 bg-slate-900 border-slate-800">
              <CardContent className="flex-row items-center gap-3 py-4 px-3">
                <View
                  className="h-11 w-11 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${stat.color}15` }}
                >
                  <Icon size={22} color={stat.color} />
                </View>
                <View>
                  {statsLoading ? (
                    <View className="h-6 w-10 rounded bg-slate-700 mb-1" />
                  ) : (
                    <Text className="text-xl font-bold text-white">{stat.value}</Text>
                  )}
                  <Text className="text-[10px] font-medium text-gray-400">{stat.title}</Text>
                </View>
              </CardContent>
            </Card>
          );
        })}
      </View>

      {/* Son Aktivite Logları */}
      <Card className="mb-6 bg-slate-900 border-slate-800">
        <CardContent className="p-0">
          {/* Başlık */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-700">
            <TouchableOpacity onPress={goToLogs} className="flex-row items-center gap-2 flex-1">
              <Activity size={18} color="#818cf8" />
              <View>
                <Text className="text-sm font-semibold text-white">Son Aktivite Logları</Text>
                <Text className="text-[10px] text-gray-500">Detaylar için logları inceleyin.</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={goToLogs}
              className="flex-row items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5"
            >
              <Text className="text-xs font-semibold text-gray-400">Tümü</Text>
              <ExternalLink size={12} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Log Listesi */}
          {logsLoading ? (
            <View className="items-center py-8">
              <ActivityIndicator color="#818cf8" />
            </View>
          ) : logs.length === 0 ? (
            <View className="items-center py-8">
              <Activity size={28} color="#475569" />
              <Text className="text-xs text-gray-500 mt-2">Henüz log kaydı yok.</Text>
            </View>
          ) : (
            <View>
              {logs.map((log, idx) => {
                const actionCfg = ACTION_LABELS[log.action] ?? {
                  label: log.action,
                  bg: 'bg-slate-700/50',
                  text: 'text-slate-400',
                };
                return (
                  <TouchableOpacity
                    key={log.id}
                    onPress={goToLogs}
                    className={`px-4 py-3 ${idx < logs.length - 1 ? 'border-b border-slate-800' : ''}`}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center justify-between mb-1">
                      <View className="flex-row items-center gap-2 flex-1">
                        <View className={`rounded-md px-2 py-0.5 ${actionCfg.bg}`}>
                          <Text className={`text-[10px] font-semibold ${actionCfg.text}`}>
                            {actionCfg.label}
                          </Text>
                        </View>
                        <Text className="text-xs text-gray-500">
                          {log.entity_type
                            ? ENTITY_LABELS[log.entity_type] ?? log.entity_type
                            : 'Sistem'}
                        </Text>
                      </View>
                      <Text className="text-[10px] text-gray-500">
                        {formatDateTime(log.created_at)}
                      </Text>
                    </View>
                    <Text className="text-sm font-medium text-white" numberOfLines={1}>
                      {log.user_name ?? 'Sistem'}
                      {log.user_email && (
                        <Text className="text-xs font-normal text-gray-500">
                          {' · '}{log.user_email}
                        </Text>
                      )}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </CardContent>
      </Card>

      <View className="h-6" />

      {/* Admin Kullanıcı Oluşturma Modalı */}
      <AdminCreateUserModal
        visible={showCreateUser}
        onClose={() => setShowCreateUser(false)}
        onCreated={() => { fetchStats(); fetchLogs(); }}
      />
    </ScrollView>
  );
};
