import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import apiClient from '../../lib/apiClient';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { CheckSquare } from 'lucide-react-native';

const safeErrorMsg = (error: any, fallback: string) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d: any) => d.msg).join('\n');
  return fallback;
};

export const TaskCreateScreen = ({ route, navigation }: any) => {
  const { projectId } = route.params;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || title.trim().length < 3) {
      return Alert.alert('Hata', 'Görev başlığı en az 3 karakter olmalı.');
    }
    if (!description.trim() || description.trim().length < 5) {
      return Alert.alert('Hata', 'Görev açıklaması en az 5 karakter olmalı.');
    }

    try {
      setIsLoading(true);
      await apiClient.post('/api/v1/tasks', {
        title: title.trim(),
        description: description.trim(),
        project_id: projectId,
      });
      Alert.alert('Başarılı', 'Görev eklendi!', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Hata', safeErrorMsg(error, 'Görev oluşturulamadı.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-slate-950"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
        <Card className="shadow-xl border-slate-800 bg-slate-900">
          <CardHeader className="items-center">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-indigo-900/50 mb-4">
              <CheckSquare size={28} color="#818cf8" />
            </View>
            <CardTitle>Yeni Görev Ekle</CardTitle>
            <Text className="text-sm text-center text-gray-400 mt-2">
              Görev TODO olarak oluşturulur, kartına dokunarak durumunu değiştirebilirsiniz.
            </Text>
          </CardHeader>

          <CardContent>
            <Input
              label="Görev Başlığı"
              placeholder="örn. Veritabanı şemasını tasarla"
              value={title}
              onChangeText={setTitle}
            />
            <Input
              label="Açıklama"
              placeholder="Görevin ne gerektirdiğini kısaca açıklayın..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
            <Button
              title="Görevi Oluştur"
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
