import React from 'react';
import { View, Text } from 'react-native';

export const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <View className={`bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden ${className}`}>
    {children}
  </View>
);

export const CardHeader = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <View className={`p-6 pb-2 ${className}`}>
    {children}
  </View>
);

export const CardTitle = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <Text className={`text-xl font-bold tracking-tight text-gray-900 dark:text-white ${className}`}>
    {children}
  </Text>
);

export const CardContent = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <View className={`p-6 pt-2 ${className}`}>
    {children}
  </View>
);
