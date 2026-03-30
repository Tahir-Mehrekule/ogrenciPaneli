import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { Card, CardContent } from '../../components/ui/Card';
import { BookOpen, FolderKanban, CheckSquare } from 'lucide-react-native';

export const StudentDashboardScreen = () => {
  const { user } = useAuth();

  const mockStats = [
    { title: "Derslerim", value: "0", icon: BookOpen, color: "#60a5fa" }, // text-blue-400
    { title: "Projelerim", value: "0", icon: FolderKanban, color: "#818cf8" }, // text-indigo-400
    { title: "Görevlerim", value: "0", icon: CheckSquare, color: "#fbbf24" }, // text-amber-400
  ];

  return (
    <ScrollView className="flex-1 bg-slate-950 p-4">
      <View className="mb-6 mt-4">
        <Text className="text-2xl font-bold tracking-tight text-white mb-1">
          Hoş geldin, {user?.name.split(" ")[0]}! 👋
        </Text>
        <Text className="text-sm text-gray-400">
          Sınıf ve proje süreçlerindeki son durumun.
        </Text>
      </View>

      {/* İstatistik Kartları (3 yan yana veya wrap) */}
      <View className="flex-row justify-between mb-6">
        {mockStats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="flex-1 mx-1 bg-slate-900 border-slate-800">
              <CardContent className="items-center py-4 px-2">
                <View className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 mb-2">
                  <Icon className="h-5 w-5" color={stat.color} />
                </View>
                <Text className="text-xl font-bold text-white mb-1">
                  {stat.value}
                </Text>
                <Text className="text-[10px] font-medium text-gray-400 text-center" numberOfLines={2}>
                  {stat.title}
                </Text>
              </CardContent>
            </Card>
          );
        })}
      </View>
      
      {/* Yaklaşan Rapor Teslimleri Paneli */}
      <Card className="mb-8 bg-slate-900 border-slate-800">
        <CardContent className="p-4">
          <Text className="text-base font-bold text-white mb-3">Yaklaşan Rapor Teslimleri</Text>
          <View className="rounded-xl border border-dashed border-slate-700 p-6 items-center">
            <Text className="text-sm text-gray-500 text-center">
              Şu an için yaklaşan bir teslim tarihi bulunmuyor.
            </Text>
          </View>
        </CardContent>
      </Card>
      
    </ScrollView>
  );
};
