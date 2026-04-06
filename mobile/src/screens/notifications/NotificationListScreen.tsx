import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import apiClient from '../../lib/apiClient';
import { Card, CardContent } from '../../components/ui/Card';
import { Bell, CheckCircle } from 'lucide-react-native';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export const NotificationListScreen = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/api/v1/notifications');
      setNotifications(data.items || []);
    } catch (error) {
      // sessizce hata yutulabilir veya Alert gösterilebilir
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiClient.patch(`/api/v1/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      Alert.alert('Hata', 'Bildirim okundu olarak işaretlenemedi.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.patch('/api/v1/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (error) {
      Alert.alert('Hata', 'İşlem başarısız.');
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center">
        <Text className="text-gray-400">Bildirimler yükleniyor...</Text>
      </View>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <ScrollView
      className="flex-1 bg-slate-950 p-4"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchNotifications();
          }}
          tintColor="#818cf8"
        />
      }
    >
      <View className="mb-4 mt-2 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-white">Bildirimler</Text>
          <Text className="text-sm text-gray-400 mt-1">
            Gelen son bildirimleriniz.
          </Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            className="rounded-lg bg-indigo-900/50 px-3 py-1.5"
            onPress={handleMarkAllRead}
          >
            <Text className="text-indigo-400 text-xs font-semibold">Tümünü Okundu İşaretle</Text>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <Card className="mt-4">
          <CardContent className="items-center justify-center p-8">
            <Bell size={40} color="#64748b" />
            <Text className="text-gray-400 mt-4 text-center">
              Hiç bildiriminiz bulunmuyor.
            </Text>
          </CardContent>
        </Card>
      ) : (
        notifications.map((notif) => (
          <TouchableOpacity
            key={notif.id}
            onPress={() => {
              if (!notif.is_read) handleMarkAsRead(notif.id);
            }}
          >
            <Card className={`mb-3 ${!notif.is_read ? 'bg-indigo-900/10 border-indigo-500/30' : ''}`}>
              <CardContent className="pt-4 pb-4 flex-row items-start gap-3">
                <View className={`mt-0.5 w-2 h-2 rounded-full ${!notif.is_read ? 'bg-indigo-500' : 'bg-transparent'}`} />
                <View className="flex-1">
                  <Text className={`text-sm ${!notif.is_read ? 'text-white font-bold' : 'text-gray-300 font-medium'}`}>
                    {notif.title}
                  </Text>
                  <Text className="text-xs text-gray-400 mt-1 leading-5">
                    {notif.message}
                  </Text>
                  <Text className="text-[10px] text-gray-500 mt-2">
                    {new Date(notif.created_at).toLocaleString('tr-TR')}
                  </Text>
                </View>
                {!notif.is_read && (
                  <TouchableOpacity
                    className="p-1"
                    onPress={() => handleMarkAsRead(notif.id)}
                  >
                    <CheckCircle size={16} color="#818cf8" />
                  </TouchableOpacity>
                )}
              </CardContent>
            </Card>
          </TouchableOpacity>
        ))
      )}

      <View className="h-8" />
    </ScrollView>
  );
};
