import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { Card, CardContent } from '../../components/ui/Card';
import { BookOpen, Users, Clock } from 'lucide-react-native';

export const TeacherDashboardScreen = () => {
  const { user } = useAuth();

  const mockStats = [
    { title: "Verdiğim Dersler", value: "0", icon: BookOpen, color: "#60a5fa" }, // text-blue-400
    { title: "Projeler", value: "0", icon: Users, color: "#34d399" }, // text-emerald-400
    { title: "Bekleyen", value: "0", icon: Clock, color: "#fbbf24" }, // text-amber-400
  ];

  return (
    <ScrollView className="flex-1 bg-slate-950 p-4">
      <View className="mb-6 mt-4">
        <Text className="text-2xl font-bold tracking-tight text-white mb-1">
          Hoş geldin, Öğretmen {user?.name.split(" ")[0]}! 🎓
        </Text>
        <Text className="text-sm text-gray-400">
          Öğrenci proje onayları ve sınıf istatistikleri.
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

      {/* Onay Bekleyen Projeler Paneli */}
      <Card className="mb-6 bg-slate-900 border-slate-800">
        <CardContent className="p-4">
          <Text className="text-base font-bold text-white mb-3">Onay Bekleyen Projeler</Text>
          <View className="rounded-xl border border-dashed border-slate-700 p-6 items-center">
            <Text className="text-sm text-gray-500 text-center">
              Şu an bekleyen yeni bir proje başvurusu bulunmuyor.
            </Text>
          </View>
        </CardContent>
      </Card>

      {/* Son Yüklenen Raporlar Paneli */}
      <Card className="mb-8 bg-slate-900 border-slate-800">
        <CardContent className="p-4">
          <Text className="text-base font-bold text-white mb-3">Son Yüklenen Raporlar</Text>
          <View className="rounded-xl border border-dashed border-slate-700 p-6 items-center">
            <Text className="text-sm text-gray-500 text-center">
              Öğrenciler henüz haftalık rapor yüklemedi.
            </Text>
          </View>
        </CardContent>
      </Card>
      
    </ScrollView>
  );
};
