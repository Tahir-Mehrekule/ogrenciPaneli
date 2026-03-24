import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input = ({ label, error, className = '', ...props }: InputProps) => {
  return (
    <View className="w-full mb-4">
      {label && (
        <Text className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </Text>
      )}
      <TextInput
        placeholderTextColor="#9ca3af"
        className={`h-12 px-4 rounded-xl border bg-white dark:bg-slate-800 dark:text-gray-50 tracking-tight ${error ? 'border-red-500' : 'border-gray-200 dark:border-slate-700'} ${className}`}
        {...props}
      />
      {error && (
        <Text className="mt-1 text-xs text-red-500 font-medium">{error}</Text>
      )}
    </View>
  );
};
