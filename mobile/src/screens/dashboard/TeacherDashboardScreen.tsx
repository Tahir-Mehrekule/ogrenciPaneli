import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useAuth } from '../../hooks/useAuth';

export const TeacherDashboardScreen = () => {
  const { user } = useAuth();

  return (
    <ScrollView className="flex-1 bg-slate-950 p-4">
      <View className="mb-6 mt-4">
        <Text className="text-2xl font-bold tracking-tight text-white">
          Hoş geldin, Öğretmen {user?.name.split(" ")[0]}! 🎓
        </Text>
        <Text className="text-sm text-gray-400 mt-1">
          Öğrenci proje onayları ve sınıf istatistikleri.
        </Text>
      </View>
    </ScrollView>
  );
};
