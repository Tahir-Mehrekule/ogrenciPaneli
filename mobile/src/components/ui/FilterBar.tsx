/**
 * FilterBar — Yeniden kullanılabilir arama + dropdown filtre çubuğu.
 * Search input ve N adet BottomSheet-style dropdown'u yan yana gösterir.
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, ScrollView,
} from 'react-native';
import { Search, X, ChevronDown } from 'lucide-react-native';

export interface FilterOption {
  label: string;
  value: string;
}

export interface DropdownConfig {
  placeholder: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (val: string) => void;
  searchPlaceholder?: string;
  dropdowns?: DropdownConfig[];
}

const DropdownModal = ({
  visible,
  onClose,
  title,
  options,
  value,
  onChange,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: FilterOption[];
  value: string;
  onChange: (v: string) => void;
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View className="flex-1 justify-end bg-black/50">
      <View className="rounded-t-2xl bg-slate-900 px-4 pb-8 pt-4" style={{ maxHeight: '65%' }}>
        <Text className="text-base font-bold text-white mb-3">{title}</Text>
        <ScrollView>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => { onChange(opt.value); onClose(); }}
              className={`rounded-xl px-4 py-3 mb-1 ${value === opt.value ? 'bg-indigo-900/40' : 'bg-slate-800'}`}
            >
              <Text className={`text-sm ${value === opt.value ? 'font-semibold text-indigo-300' : 'text-gray-300'}`}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

export const FilterBar: React.FC<FilterBarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Ara...',
  dropdowns = [],
}) => {
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);

  return (
    <View className="px-4 py-3 border-b border-slate-800 gap-2">
      {/* Arama Kutusu */}
      <View className="flex-row items-center bg-slate-800 rounded-xl px-3 gap-2">
        <Search size={14} color="#64748b" />
        <TextInput
          className="flex-1 py-2.5 text-sm text-gray-200"
          placeholder={searchPlaceholder}
          placeholderTextColor="#64748b"
          value={searchValue}
          onChangeText={onSearchChange}
        />
        {searchValue ? (
          <TouchableOpacity onPress={() => onSearchChange('')}>
            <X size={14} color="#64748b" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Dropdown'lar */}
      {dropdowns.length > 0 && (
        <View className="flex-row gap-2">
          {dropdowns.map((dd, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => setOpenDropdownIndex(idx)}
              className="flex-1 flex-row items-center justify-between bg-slate-800 rounded-xl px-3 py-2.5"
            >
              <Text
                className={`text-sm ${dd.value ? 'text-indigo-300' : 'text-gray-500'}`}
                numberOfLines={1}
              >
                {dd.options.find((o) => o.value === dd.value)?.label ?? dd.placeholder}
              </Text>
              <ChevronDown size={14} color="#64748b" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Dropdown Modals */}
      {dropdowns.map((dd, idx) => (
        <DropdownModal
          key={idx}
          visible={openDropdownIndex === idx}
          onClose={() => setOpenDropdownIndex(null)}
          title={dd.placeholder}
          options={dd.options}
          value={dd.value}
          onChange={dd.onChange}
        />
      ))}
    </View>
  );
};
