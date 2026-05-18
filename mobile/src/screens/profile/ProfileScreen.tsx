import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../lib/apiClient';
import { User as UserIcon, Lock, Eye, EyeOff, LogOut } from 'lucide-react-native';

const INPUT = "w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-gray-200 mb-3";

export const ProfileScreen = () => {
  const { user, refreshUser, logout } = useAuth();

  // Profile State
  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName, setLastName] = useState(user?.last_name ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password State
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    setFirstName(user?.first_name ?? '');
    setLastName(user?.last_name ?? '');
  }, [user]);

  const handleSaveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      return Alert.alert('Hata', 'Ad ve soyad boş bırakılamaz.');
    }
    setSavingProfile(true);
    try {
      await apiClient.patch('/api/v1/auth/me', {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      Alert.alert('Başarılı', 'Profil güncellendi.');
      if (refreshUser) await refreshUser();
    } catch (err: any) {
      Alert.alert('Hata', err.response?.data?.detail || 'Güncelleme başarısız.');
    } finally {
      setSavingProfile(false);
    }
  };

  const strength = {
    length: newPw.length >= 8,
    upper: /[A-Z]/.test(newPw),
    digit: /\d/.test(newPw),
  };
  const isStrong = strength.length && strength.upper && strength.digit;

  const handleSavePassword = async () => {
    if (!isStrong) {
      return Alert.alert('Hata', 'Yeni şifre güç gereksinimlerini karşılamıyor.');
    }
    if (newPw !== confirmPw) {
      return Alert.alert('Hata', 'Yeni şifreler eşleşmiyor.');
    }

    setSavingPw(true);
    try {
      await apiClient.patch('/api/v1/auth/change-password', {
        current_password: currentPw,
        new_password: newPw,
      });
      Alert.alert('Başarılı', 'Şifreniz başarıyla değiştirildi.');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err: any) {
      const msg = err.response?.data?.detail;
      Alert.alert('Hata', typeof msg === 'string' ? msg : 'Şifre değiştirilemedi. Mevcut şifrenizi kontrol edin.');
    } finally {
      setSavingPw(false);
    }
  };

  const profileDirty = firstName.trim() !== (user?.first_name ?? '') || lastName.trim() !== (user?.last_name ?? '');

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView className="flex-1 bg-slate-950 px-4 pt-4 pb-12" showsVerticalScrollIndicator={false}>
        
        {/* Başlık */}
        <View className="mb-6">
          <Text className="text-2xl font-bold tracking-tight text-white">Hesabım</Text>
          <Text className="text-sm text-gray-400 mt-1">Hesap bilgilerinizi ve tercihlerinizi yönetin.</Text>
        </View>

        {/* Profil Kartı */}
        <View className="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 mb-6">
          <View className="flex-row items-center gap-3 mb-4 border-b border-slate-800/60 pb-3">
            <View className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-900/40">
              <UserIcon size={20} color="#818cf8" />
            </View>
            <View>
              <Text className="text-base font-bold text-white">Profil Bilgileri</Text>
              <Text className="text-xs text-gray-400">Ad ve soyadınızı güncelleyin.</Text>
            </View>
          </View>

          <Text className="text-sm font-medium text-gray-300 mb-1.5 ml-1">Email (Değiştirilemez)</Text>
          <TextInput
            value={user?.email ?? ''}
            editable={false}
            className={`${INPUT} opacity-50`}
            placeholderTextColor="#64748b"
          />

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-300 mb-1.5 ml-1">Ad *</Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                className={INPUT}
                placeholder="Adınız"
                placeholderTextColor="#64748b"
              />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-300 mb-1.5 ml-1">Soyad *</Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                className={INPUT}
                placeholder="Soyadınız"
                placeholderTextColor="#64748b"
              />
            </View>
          </View>

          <TouchableOpacity
            disabled={savingProfile || !profileDirty}
            onPress={handleSaveProfile}
            className={`mt-2 py-3 rounded-xl items-center justify-center ${savingProfile || !profileDirty ? 'bg-indigo-600/50' : 'bg-indigo-600'}`}
          >
            {savingProfile ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-white font-semibold text-sm">Değişiklikleri Kaydet</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Şifre Kartı */}
        <View className="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 mb-8">
          <View className="flex-row items-center gap-3 mb-4 border-b border-slate-800/60 pb-3">
            <View className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-900/40">
              <Lock size={20} color="#fbbf24" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-white">Şifre Değiştir</Text>
              <Text className="text-xs text-gray-400" numberOfLines={2}>En az 8 karakter, 1 büyük harf ve 1 rakam içermelidir.</Text>
            </View>
          </View>

          <Text className="text-sm font-medium text-gray-300 mb-1.5 ml-1">Mevcut Şifre *</Text>
          <View className="relative justify-center">
            <TextInput
              value={currentPw}
              onChangeText={setCurrentPw}
              secureTextEntry={!showCurrent}
              className={`${INPUT} pr-12`}
              placeholder="••••••••"
              placeholderTextColor="#64748b"
            />
            <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} className="absolute right-4 top-3.5">
              {showCurrent ? <EyeOff size={20} color="#94a3b8" /> : <Eye size={20} color="#94a3b8" />}
            </TouchableOpacity>
          </View>

          <Text className="text-sm font-medium text-gray-300 mb-1.5 ml-1 mt-1">Yeni Şifre *</Text>
          <View className="relative justify-center mb-1">
            <TextInput
              value={newPw}
              onChangeText={setNewPw}
              secureTextEntry={!showNew}
              className={`${INPUT} mb-1 pr-12`}
              placeholder="••••••••"
              placeholderTextColor="#64748b"
            />
            <TouchableOpacity onPress={() => setShowNew(!showNew)} className="absolute right-4 top-3.5">
              {showNew ? <EyeOff size={20} color="#94a3b8" /> : <Eye size={20} color="#94a3b8" />}
            </TouchableOpacity>
          </View>

          {/* Şifre Gücü */}
          {newPw.length > 0 && (
            <View className="flex-col gap-1 mb-4 ml-1">
              <Text className={`text-xs ${strength.length ? 'text-emerald-400' : 'text-slate-500'}`}>
                {strength.length ? '✓' : '✗'} En az 8 karakter
              </Text>
              <Text className={`text-xs ${strength.upper ? 'text-emerald-400' : 'text-slate-500'}`}>
                {strength.upper ? '✓' : '✗'} En az 1 büyük harf
              </Text>
              <Text className={`text-xs ${strength.digit ? 'text-emerald-400' : 'text-slate-500'}`}>
                {strength.digit ? '✓' : '✗'} En az 1 rakam
              </Text>
            </View>
          )}

          <Text className="text-sm font-medium text-gray-300 mb-1.5 ml-1 mt-1">Yeni Şifre (Tekrar) *</Text>
          <TextInput
            value={confirmPw}
            onChangeText={setConfirmPw}
            secureTextEntry
            className={`${INPUT} ${confirmPw.length > 0 && confirmPw !== newPw ? 'border-red-500' : ''}`}
            placeholder="••••••••"
            placeholderTextColor="#64748b"
          />
          {confirmPw.length > 0 && confirmPw !== newPw && (
            <Text className="text-xs text-red-400 ml-1 -mt-2 mb-3">Şifreler eşleşmiyor.</Text>
          )}

          <TouchableOpacity
            disabled={savingPw || !currentPw || !newPw || !confirmPw}
            onPress={handleSavePassword}
            className={`mt-2 py-3 rounded-xl items-center justify-center ${savingPw || !currentPw || !newPw || !confirmPw ? 'bg-amber-600/50' : 'bg-amber-600'}`}
          >
            {savingPw ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-white font-semibold text-sm">Şifreyi Değiştir</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Çıkış Yap Butonu */}
        <TouchableOpacity
          onPress={logout}
          className="bg-red-500/10 border border-red-500/20 py-3.5 rounded-xl flex-row items-center justify-center gap-2 mb-10"
        >
          <LogOut size={18} color="#ef4444" />
          <Text className="text-red-500 font-bold text-sm">Güvenli Çıkış Yap</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};
