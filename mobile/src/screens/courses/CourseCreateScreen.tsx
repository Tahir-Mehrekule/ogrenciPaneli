import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../lib/apiClient';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { BookOpen } from 'lucide-react-native';

export const CourseCreateScreen = ({ navigation }: any) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [semester, setSemester] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!name || !code || !semester) {
      return Alert.alert('Hata', 'Tüm alanları doldurun.');
    }
    try {
      setIsLoading(true);
      await apiClient.post('/api/v1/courses', { name, code, semester });
      Alert.alert('Başarılı', 'Ders başarıyla oluşturuldu!', [
        { text: 'Tamam', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      let errorMessage = 'Ders oluşturulamadı.';
      const detail = error.response?.data?.detail;
      if (typeof detail === 'string') {
        errorMessage = detail;
      } else if (Array.isArray(detail)) {
        errorMessage = detail.map((d: any) => d.msg).join('\n');
      }
      Alert.alert('Hata', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-slate-950">
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
        <Card className="shadow-xl border-slate-800 bg-slate-900">
          <CardHeader className="items-center">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-indigo-900/50 mb-4">
              <BookOpen size={28} color="#818cf8" />
            </View>
            <CardTitle>Yeni Ders Oluştur</CardTitle>
            <Text className="text-sm text-center text-gray-400 mt-2">
              Öğrencilerin kaydolabileceği yeni bir ders açın.
            </Text>
          </CardHeader>
          <CardContent>
            <Input
              label="Ders Adı"
              placeholder="Yazılım Mühendisliği"
              value={name}
              onChangeText={setName}
            />
            <Input
              label="Ders Kodu"
              placeholder="CENG314"
              autoCapitalize="characters"
              value={code}
              onChangeText={setCode}
            />
            <Input
              label="Dönem"
              placeholder="2025-2026 Güz"
              value={semester}
              onChangeText={setSemester}
            />
            <Button
              title="Dersi Oluştur"
              onPress={handleCreate}
              isLoading={isLoading}
              className="mt-4"
            />
          </CardContent>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
