/**
 * ModalPicker — Harici paket gerektirmeyen, bottom-sheet tarzı seçim bileşeni.
 * @react-native-picker/picker yerine kullanılır.
 *
 * Kullanım:
 *   <ModalPicker
 *     label="Bölüm"
 *     placeholder="— Bölüm seçin —"
 *     options={[{ label: 'Bilgisayar Müh.', value: 'uuid-1' }]}
 *     value={selectedId}
 *     onChange={setSelectedId}
 *   />
 */

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, FlatList,
  TextInput,
} from 'react-native';
import { ChevronDown, Search, Check, X } from 'lucide-react-native';

export interface PickerOption {
  label: string;
  value: string;
  subtitle?: string;
}

interface ModalPickerProps {
  label?: string;
  placeholder?: string;
  options: PickerOption[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  searchable?: boolean;
}

export const ModalPicker: React.FC<ModalPickerProps> = ({
  label,
  placeholder = '— Seçin —',
  options,
  value,
  onChange,
  required = false,
  searchable = false,
}) => {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');

  const selectedOption = options.find((o) => o.value === value);

  const filtered = searchable && search.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase()) ||
        (o.subtitle?.toLowerCase().includes(search.toLowerCase()) ?? false)
      )
    : options;

  const handleSelect = (val: string) => {
    onChange(val);
    setVisible(false);
    setSearch('');
  };

  return (
    <View className="mb-3">
      {label && (
        <Text className="text-sm font-medium text-gray-300 mb-1.5">
          {label}
          {required && <Text className="text-red-400 font-semibold"> *</Text>}
        </Text>
      )}
      <TouchableOpacity
        onPress={() => setVisible(true)}
        className="flex-row items-center justify-between rounded-xl border border-slate-700 bg-slate-800 px-4 py-3"
        activeOpacity={0.7}
      >
        <Text
          className={`text-sm flex-1 ${selectedOption ? 'text-white' : 'text-gray-500'}`}
          numberOfLines={1}
        >
          {selectedOption?.label ?? placeholder}
        </Text>
        <ChevronDown size={16} color="#64748b" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="max-h-[70%] rounded-t-2xl bg-slate-900 pb-8">
            {/* Başlık */}
            <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
              <Text className="text-base font-bold text-white">{label ?? 'Seçim'}</Text>
              <TouchableOpacity
                onPress={() => { setVisible(false); setSearch(''); }}
                className="p-1.5 rounded-lg bg-slate-800"
              >
                <X size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Arama */}
            {searchable && (
              <View className="mx-4 mb-2 flex-row items-center bg-slate-800 rounded-xl px-3 gap-2">
                <Search size={14} color="#64748b" />
                <TextInput
                  className="flex-1 py-2.5 text-sm text-gray-200"
                  placeholder="Ara..."
                  placeholderTextColor="#64748b"
                  value={search}
                  onChangeText={setSearch}
                  autoFocus
                />
              </View>
            )}

            {/* Liste */}
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.value}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
              ListEmptyComponent={
                <View className="items-center py-8">
                  <Text className="text-sm text-gray-500">Sonuç bulunamadı.</Text>
                </View>
              }
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <TouchableOpacity
                    onPress={() => handleSelect(item.value)}
                    className={`flex-row items-center justify-between rounded-xl px-4 py-3 mb-1 ${
                      isSelected ? 'bg-indigo-900/40 border border-indigo-500/30' : 'bg-slate-800'
                    }`}
                  >
                    <View className="flex-1 mr-3">
                      <Text className={`text-sm ${isSelected ? 'font-semibold text-indigo-300' : 'text-gray-300'}`}>
                        {item.label}
                      </Text>
                      {item.subtitle && (
                        <Text className="text-xs text-gray-500 mt-0.5">{item.subtitle}</Text>
                      )}
                    </View>
                    {isSelected && <Check size={16} color="#818cf8" />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};
