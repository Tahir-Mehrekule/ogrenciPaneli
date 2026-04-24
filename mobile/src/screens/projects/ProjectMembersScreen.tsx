import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../lib/apiClient';
import { ProjectMember } from '../../types/project';
import {
  GraduationCap, UserCheck, UserX, UserMinus, Crown,
  Clock, UserPlus, ArrowLeftRight,
} from 'lucide-react-native';

const safeErrorMsg = (error: any, fallback: string) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d: any) => d.msg).join('\n');
  return fallback;
};

export const ProjectMembersScreen = ({ route, navigation }: any) => {
  const { projectId, isManager: isManagerProp } = route.params;
  const { user } = useAuth();
  const role = user?.role?.toUpperCase() ?? '';
  const isStaff = role === 'TEACHER' || role === 'ADMIN';

  const [activeMembers, setActiveMembers] = useState<ProjectMember[]>([]);
  const [pendingMembers, setPendingMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const currentMember = activeMembers.find(m => m.user_id === user?.id);
  const isManager = currentMember?.role === 'MANAGER' || isManagerProp;
  const canManage = isManager || isStaff;

  const fetchData = useCallback(async () => {
    try {
      const [activeRes, pendingRes] = await Promise.all([
        apiClient.get<ProjectMember[]>(`/api/v1/projects/${projectId}/members`),
        canManage
          ? apiClient.get<ProjectMember[]>(`/api/v1/projects/${projectId}/members/pending`)
          : Promise.resolve({ data: [] }),
      ]);
      setActiveMembers(activeRes.data);
      setPendingMembers(pendingRes.data);
    } catch (error) {
      Alert.alert('Hata', safeErrorMsg(error, 'Üyeler yüklenemedi.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId, canManage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAccept = async (memberId: string, name: string) => {
    setProcessingId(memberId);
    try {
      await apiClient.post(`/api/v1/projects/${projectId}/members/${memberId}/accept`);
      Alert.alert('Kabul Edildi', `${name} projeye kabul edildi.`);
      fetchData();
    } catch (error) {
      Alert.alert('Hata', safeErrorMsg(error, 'İşlem başarısız.'));
    } finally { setProcessingId(null); }
  };

  const handleReject = async (memberId: string, name: string) => {
    setProcessingId(memberId);
    try {
      await apiClient.post(`/api/v1/projects/${projectId}/members/${memberId}/reject`);
      Alert.alert('Reddedildi', `${name} isteği reddedildi.`);
      fetchData();
    } catch (error) {
      Alert.alert('Hata', safeErrorMsg(error, 'İşlem başarısız.'));
    } finally { setProcessingId(null); }
  };

  const handleRemove = (userId: string, name: string) => {
    Alert.alert('Üyeyi Çıkar', `${name} adlı üyeyi projeden çıkarmak istediğinize emin misiniz?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Çıkar', style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/api/v1/projects/${projectId}/members/${userId}`);
            fetchData();
          } catch (error) {
            Alert.alert('Hata', safeErrorMsg(error, 'Çıkarma başarısız.'));
          }
        },
      },
    ]);
  };

  const handleTransfer = (userId: string, name: string) => {
    Alert.alert(
      'Yöneticilik Devret',
      `${name} adlı üyeye yöneticilik devretmek istediğinize emin misiniz? Bu işlemden sonra siz normal üye olacaksınız.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Devret', style: 'default',
          onPress: async () => {
            try {
              await apiClient.patch(`/api/v1/projects/${projectId}/members/transfer-manager`, { user_id: userId });
              Alert.alert('Başarılı', `Yöneticilik ${name} adlı üyeye devredildi.`);
              fetchData();
            } catch (error) {
              Alert.alert('Hata', safeErrorMsg(error, 'Devir başarısız.'));
            }
          },
        },
      ]
    );
  };

  const handleResign = () => {
    Alert.alert(
      'Projeden Ayrıl',
      isManager
        ? 'Yönetici olarak ayrılmak için önce başka bir üyeye yöneticilik devredin.'
        : 'Projeden ayrılmak istediğinize emin misiniz?',
      isManager
        ? [{ text: 'Tamam', style: 'cancel' }]
        : [
            { text: 'Vazgeç', style: 'cancel' },
            {
              text: 'Ayrıl', style: 'destructive',
              onPress: async () => {
                try {
                  await apiClient.delete(`/api/v1/projects/${projectId}/members/me`);
                  navigation.goBack();
                } catch (error) {
                  Alert.alert('Hata', safeErrorMsg(error, 'İşlem başarısız.'));
                }
              },
            },
          ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center">
        <ActivityIndicator color="#818cf8" size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-950"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#818cf8" />}
    >
      {/* Başlık */}
      <View className="px-4 pt-6 pb-4 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-white">Üyeler</Text>
          <Text className="text-xs text-gray-500 mt-0.5">{activeMembers.length} aktif üye</Text>
        </View>
        {canManage && (
          <TouchableOpacity
            className="flex-row items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2"
            onPress={() => navigation.navigate('InviteMember', { projectId })}
          >
            <UserPlus size={14} color="#fff" />
            <Text className="text-xs text-white font-semibold">Davet Et</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Bekleyen Davetler / Katılım İstekleri */}
      {pendingMembers.length > 0 && (
        <View className="mx-4 mb-4">
          <View className="flex-row items-center gap-1.5 mb-2">
            <Clock size={13} color="#f59e0b" />
            <Text className="text-xs font-bold text-amber-400">Bekleyen ({pendingMembers.length})</Text>
          </View>
          {pendingMembers.map((member) => (
            <View key={member.id} className="mb-2 rounded-xl border border-amber-800/30 bg-amber-900/10 px-4 py-3">
              <View className="flex-row items-center gap-3">
                <View className="h-9 w-9 items-center justify-center rounded-full bg-amber-900/30">
                  <GraduationCap size={16} color="#fbbf24" />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-semibold text-white" numberOfLines={1}>
                    {member.user?.name ?? 'Bilinmiyor'}
                  </Text>
                  <Text className="text-xs text-amber-400">
                    {member.status === 'INVITED' ? 'Davet gönderildi' : 'Katılmak istiyor'}
                  </Text>
                </View>
                <View className="flex-row gap-1.5">
                  <TouchableOpacity
                    className="h-8 w-8 items-center justify-center rounded-lg bg-emerald-700"
                    disabled={processingId === member.id}
                    onPress={() => handleAccept(member.id, member.user?.name ?? '')}
                    style={{ opacity: processingId === member.id ? 0.5 : 1 }}
                  >
                    <UserCheck size={14} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="h-8 w-8 items-center justify-center rounded-lg bg-red-900/30 border border-red-800/40"
                    disabled={processingId === member.id}
                    onPress={() => handleReject(member.id, member.user?.name ?? '')}
                    style={{ opacity: processingId === member.id ? 0.5 : 1 }}
                  >
                    <UserX size={14} color="#f87171" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Aktif Üyeler */}
      <View className="px-4">
        <Text className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Aktif Üyeler</Text>
        {activeMembers.map((member) => {
          const isCurrentUser = member.user_id === user?.id;
          const isMemberManager = member.role === 'MANAGER';
          return (
            <View key={member.id} className="mb-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3">
              <View className="flex-row items-center gap-3">
                {/* Avatar */}
                <View className="h-10 w-10 items-center justify-center rounded-full bg-indigo-900/40 shrink-0">
                  {isMemberManager
                    ? <Crown size={18} color="#f59e0b" />
                    : <GraduationCap size={18} color="#818cf8" />}
                </View>

                <View className="flex-1 min-w-0">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-sm font-semibold text-white" numberOfLines={1}>
                      {member.user?.name ?? 'Bilinmiyor'}
                    </Text>
                    {isCurrentUser && (
                      <Text className="text-xs text-indigo-400">(siz)</Text>
                    )}
                  </View>
                  <Text className="text-xs text-gray-400" numberOfLines={1}>{member.user?.email}</Text>
                  {member.user?.grade_label && (
                    <Text className="text-xs text-gray-500">{member.user.grade_label}</Text>
                  )}
                </View>

                {/* Rol Badge */}
                <View className={`rounded-lg px-2 py-0.5 ${isMemberManager ? 'bg-amber-900/30' : 'bg-slate-800'}`}>
                  <Text className={`text-xs font-semibold ${isMemberManager ? 'text-amber-400' : 'text-gray-400'}`}>
                    {isMemberManager ? 'Yönetici' : 'Üye'}
                  </Text>
                </View>

                {/* Aksiyon Butonları */}
                {!isCurrentUser && canManage && (
                  <View className="flex-row gap-1">
                    {/* Yöneticilik Devret (sadece yönetici veya admin, hedef üye) */}
                    {isManager && !isMemberManager && (
                      <TouchableOpacity
                        className="h-8 w-8 items-center justify-center rounded-lg bg-amber-900/30"
                        onPress={() => handleTransfer(member.user_id, member.user?.name ?? '')}
                      >
                        <ArrowLeftRight size={12} color="#fbbf24" />
                      </TouchableOpacity>
                    )}
                    {/* Çıkar */}
                    <TouchableOpacity
                      className="h-8 w-8 items-center justify-center rounded-lg bg-red-900/20"
                      onPress={() => handleRemove(member.user_id, member.user?.name ?? '')}
                    >
                      <UserMinus size={12} color="#f87171" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Projeden Ayrıl Butonu (kendi üyeliği varsa) */}
      {currentMember && (
        <TouchableOpacity
          className="mx-4 mt-6 mb-8 rounded-xl border border-slate-700 bg-slate-900 py-3 items-center"
          onPress={handleResign}
        >
          <Text className="text-sm text-gray-400">Projeden Ayrıl</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};
