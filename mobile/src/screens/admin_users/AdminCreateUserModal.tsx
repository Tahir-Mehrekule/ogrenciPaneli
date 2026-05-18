/**
 * AdminCreateUserModal — Admin'in yeni kullanıcı oluşturması için bottom-sheet modal.
 * Web panelindeki AdminCreateUserModal bileşeninin mobil karşılığı.
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { X, UserPlus } from 'lucide-react-native';
import apiClient from '../../lib/apiClient';
import { Input } from '../../components/ui/Input';
import { ModalPicker, PickerOption } from '../../components/ui/ModalPicker';
import { Button } from '../../components/ui/Button';

interface Department { id: string; name: string; }

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const AdminCreateUserModal: React.FC<Props> = ({ visible, onClose, onCreated }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('STUDENT');
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      apiClient.get<Department[]>('/api/v1/admin/departments')
        .then(({ data }) => setDepartments(data))
        .catch(() => {});
    }
  }, [visible]);

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setRole('STUDENT');
    setDepartmentId('');
  };

  const handleClose = () => {
    if (loading) return;
    resetForm();
    onClose();
  };

  const handleCreate = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      return Alert.alert('Hata', 'Ad ve soyad zorunludur.');
    }
    if (!email.trim()) {
      return Alert.alert('Hata', 'E-posta adresi zorunludur.');
    }
    if (!password || password.length < 6) {
      return Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır.');
    }

    setLoading(true);
    try {
      await apiClient.post('/api/v1/users', {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: role.toLowerCase(),
        department_id: departmentId || undefined,
      });
      Alert.alert('Başarılı', 'Kullanıcı başarıyla oluşturuldu.');
      resetForm();
      onCreated();
      onClose();
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      let msg = 'Kullanıcı oluşturulamadı.';
      if (typeof detail === 'string') msg = detail;
      else if (Array.isArray(detail)) msg = detail.map((d: any) => d.msg).join('\n');
      Alert.alert('Hata', msg);
    } finally {
      setLoading(false);
    }
  };

  const roleOptions: PickerOption[] = [
    { label: 'Öğrenci', value: 'STUDENT' },
    { label: 'Öğretmen', value: 'TEACHER' },
    { label: 'Admin', value: 'ADMIN' },
  ];

  const deptOptions: PickerOption[] = departments.map((d) => ({
    label: d.name,
    value: d.id,
  }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="max-h-[85%] rounded-t-2xl bg-slate-900 border-t border-slate-700">
          {/* Başlık */}
          <View className="flex-row items-center justify-between px-4 pt-4 pb-3 border-b border-slate-700">
            <View className="flex-row items-center gap-3">
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-indigo-900/50">
                <UserPlus size={18} color="#818cf8" />
              </View>
              <View>
                <Text className="text-base font-semibold text-white">Yeni Kullanıcı</Text>
                <Text className="text-xs text-gray-400">Sisteme yeni kullanıcı ekleyin.</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} className="p-2 rounded-lg bg-slate-800">
              <X size={16} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView className="px-4 py-4" contentContainerStyle={{ paddingBottom: 24 }}>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Input label="Ad" placeholder="Ali" value={firstName} onChangeText={setFirstName} />
              </View>
              <View className="flex-1">
                <Input label="Soyad" placeholder="Yılmaz" value={lastName} onChangeText={setLastName} />
              </View>
            </View>

            <Input
              label="E-posta"
              placeholder="ornek@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Input
              label="Şifre"
              placeholder="Min. 6 karakter"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <ModalPicker
              label="Rol"
              options={roleOptions}
              value={role}
              onChange={setRole}
              required
            />

            {deptOptions.length > 0 && (
              <ModalPicker
                label="Bölüm (Opsiyonel)"
                placeholder="— Bölüm seçin —"
                options={deptOptions}
                value={departmentId}
                onChange={setDepartmentId}
                searchable={departments.length > 5}
              />
            )}
          </ScrollView>

          {/* Footer */}
          <View className="px-4 pb-8 pt-3 border-t border-slate-700">
            <Button
              title={loading ? 'Oluşturuluyor...' : 'Kullanıcı Oluştur'}
              onPress={handleCreate}
              isLoading={loading}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};
