/**
 * DrawerMenu — Hamburger menü slide-in panel.
 * @react-navigation/drawer gerektirmez; Animated + Modal ile saf RN uygulaması.
 */

import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Modal, Animated,
  TouchableWithoutFeedback, ScrollView, Dimensions,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import {
  X, GraduationCap, Users, UserCheck, Settings,
  Bell, LogOut, User as UserIcon,
} from 'lucide-react-native';

interface DrawerItem {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  roles: string[];
}

interface DrawerMenuProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
}

const DRAWER_WIDTH = Dimensions.get('window').width * 0.78;

export const DrawerMenu: React.FC<DrawerMenuProps> = ({ visible, onClose, navigation }) => {
  const { user, logout } = useAuth();
  const role = user?.role?.toUpperCase() ?? '';
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : -DRAWER_WIDTH,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const navigate = (screen: string, params?: object) => {
    onClose();
    setTimeout(() => navigation.navigate(screen, params), 80);
  };

  const items: DrawerItem[] = [
    {
      label: 'Öğrencilerim',
      icon: <GraduationCap size={20} color="#818cf8" />,
      onPress: () => navigate('StudentList'),
      roles: ['TEACHER', 'ADMIN'],
    },
    {
      label: 'Tüm Kullanıcılar',
      icon: <Users size={20} color="#818cf8" />,
      onPress: () => navigate('UserList'),
      roles: ['ADMIN'],
    },
    {
      label: 'Onay Bekleyenler',
      icon: <UserCheck size={20} color="#818cf8" />,
      onPress: () => navigate('PendingRoot'),
      roles: ['TEACHER', 'ADMIN'],
    },
    {
      label: 'Bildirimler',
      icon: <Bell size={20} color="#818cf8" />,
      onPress: () => navigate('NotificationsModal'),
      roles: ['STUDENT', 'TEACHER', 'ADMIN'],
    },
    {
      label: 'Bölüm Yönetimi',
      icon: <Settings size={20} color="#818cf8" />,
      onPress: () => navigate('SettingsRoot'),
      roles: ['ADMIN'],
    },
  ];

  const visibleItems = items.filter((item) => item.roles.includes(role));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/50">
          <TouchableWithoutFeedback>
            <Animated.View
              style={{ transform: [{ translateX: slideAnim }], width: DRAWER_WIDTH }}
              className="absolute inset-y-0 left-0 bg-slate-900 border-r border-slate-700"
            >
              {/* Üst — Kullanıcı Bilgisi */}
              <View className="pt-14 px-5 pb-5 border-b border-slate-700">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                    UniTrack AI
                  </Text>
                  <TouchableOpacity onPress={onClose} className="p-1.5 rounded-lg bg-slate-800">
                    <X size={16} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                <View className="flex-row items-center gap-3">
                  <View className="h-11 w-11 rounded-full bg-indigo-900/60 items-center justify-center">
                    <UserIcon size={22} color="#818cf8" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-white" numberOfLines={1}>
                      {user?.full_name}
                    </Text>
                    <Text className="text-xs text-gray-400" numberOfLines={1}>
                      {user?.email}
                    </Text>
                    <View className="mt-1 self-start rounded bg-indigo-900/50 px-1.5 py-0.5">
                      <Text className="text-xs font-semibold text-indigo-300">{user?.role}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Menü Öğeleri */}
              <ScrollView className="flex-1 px-3 py-4">
                <Text className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Menü
                </Text>
                {visibleItems.map((item, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={item.onPress}
                    className="flex-row items-center gap-3 rounded-xl px-3 py-3 mb-1 active:bg-slate-800"
                  >
                    {item.icon}
                    <Text className="text-sm font-medium text-gray-200">{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Alt — Çıkış */}
              <View className="px-3 pb-10 pt-3 border-t border-slate-700">
                <TouchableOpacity
                  onPress={() => { onClose(); logout(); }}
                  className="flex-row items-center gap-3 rounded-xl px-3 py-3 bg-red-900/20"
                >
                  <LogOut size={20} color="#f87171" />
                  <Text className="text-sm font-medium text-red-400">Çıkış Yap</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
