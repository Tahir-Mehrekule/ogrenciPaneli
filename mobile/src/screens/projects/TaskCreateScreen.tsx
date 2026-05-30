import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
} from 'react-native';
import apiClient from '../../lib/apiClient';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { CheckSquare, ChevronDown } from 'lucide-react-native';
import { ProjectMember } from '../../types/project';

const safeErrorMsg = (error: any, fallback: string) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d: any) => d.msg).join('\n');
  return fallback;
};

interface AssigneeOption { id: string; name: string; }

export const TaskCreateScreen = ({ route, navigation }: any) => {
  const { projectId } = route.params;
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Atama: '' → backend kendine atar (oto-atama)
  const [assignedTo, setAssignedTo] = useState('');
  const [isTeam, setIsTeam] = useState(false);
  const [options, setOptions] = useState<AssigneeOption[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  // Proje + üyeleri çek → atanabilir kişiler (sahip + aktif üyeler)
  useEffect(() => {
    (async () => {
      try {
        const [projRes, memberRes] = await Promise.all([
          apiClient.get(`/api/v1/projects/${projectId}`),
          apiClient.get<ProjectMember[]>(`/api/v1/projects/${projectId}/members`).catch(() => ({ data: [] as ProjectMember[] })),
        ]);
        const proj = projRes.data;
        setIsTeam(proj.project_type === 'team');

        const opts: AssigneeOption[] = [];
        if (proj.created_by) {
          opts.push({
            id: String(proj.created_by),
            name: (proj.created_by_name ?? 'Proje Sahibi') + ' (Sahip)',
          });
        }
        (memberRes.data ?? [])
          .filter((m) => String(m.user_id) !== String(proj.created_by) && m.status === 'ACTIVE')
          .forEach((m) => opts.push({ id: m.user_id, name: m.user?.name ?? 'Üye' }));
        setOptions(opts);
      } catch {
        /* sessiz — atama olmadan da görev oluşturulabilir */
      }
    })();
  }, [projectId]);

  const selectedLabel = assignedTo
    ? options.find((o) => o.id === assignedTo)?.name ?? 'Seçili kişi'
    : 'Bana ata (varsayılan)';

  const handleCreate = async () => {
    if (!title.trim() || title.trim().length < 3) {
      return Alert.alert('Hata', 'Görev başlığı en az 3 karakter olmalı.');
    }
    if (!description.trim() || description.trim().length < 5) {
      return Alert.alert('Hata', 'Görev açıklaması en az 5 karakter olmalı.');
    }

    try {
      setIsLoading(true);
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        project_id: projectId,
      };
      if (assignedTo) payload.assigned_to = assignedTo;
      await apiClient.post('/api/v1/tasks', payload);
      Alert.alert('Başarılı', 'Görev eklendi!', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Hata', safeErrorMsg(error, 'Görev oluşturulamadı.'));
    } finally {
      setIsLoading(false);
    }
  };

  // Atama seçeneklerini "Bana ata" + diğer üyeler (kendisi hariç) olarak hazırla
  const pickerOptions: AssigneeOption[] = [
    { id: '', name: 'Bana ata (varsayılan)' },
    ...options.filter((o) => o.id !== user?.id),
  ];

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

            {/* Atama seçici — sadece ekip projesinde ve birden fazla seçenek varsa */}
            {isTeam && pickerOptions.length > 1 && (
              <View className="mt-2">
                <Text className="text-sm font-medium text-gray-300 mb-1.5">Atanan Kişi</Text>
                <TouchableOpacity
                  onPress={() => setShowPicker(true)}
                  className="flex-row items-center justify-between rounded-xl border border-slate-700 bg-slate-800 px-4 py-3"
                >
                  <Text className={`text-sm ${assignedTo ? 'text-white' : 'text-gray-400'}`} numberOfLines={1}>
                    {selectedLabel}
                  </Text>
                  <ChevronDown size={16} color="#64748b" />
                </TouchableOpacity>
                <Text className="text-xs text-gray-500 mt-1">Seçim yapmazsanız görev size atanır.</Text>
              </View>
            )}

            <Button
              title="Görevi Oluştur"
              onPress={handleCreate}
              isLoading={isLoading}
              className="mt-4"
            />
          </CardContent>
        </Card>
      </ScrollView>

      {/* Atama Seçim Modal */}
      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="rounded-t-2xl bg-slate-900 px-4 pb-8 pt-4" style={{ maxHeight: '70%' }}>
            <Text className="text-base font-bold text-white mb-3">Atanan Kişi</Text>
            <ScrollView>
              {pickerOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.id || 'self'}
                  onPress={() => { setAssignedTo(opt.id); setShowPicker(false); }}
                  className={`rounded-xl px-4 py-3 mb-1 ${assignedTo === opt.id ? 'bg-indigo-900/40' : 'bg-slate-800'}`}
                >
                  <Text className={`text-sm ${assignedTo === opt.id ? 'font-semibold text-indigo-300' : 'text-gray-300'}`}>
                    {opt.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};
