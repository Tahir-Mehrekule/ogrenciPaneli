import React from 'react';
import { View, Text } from 'react-native';

export const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <View className={`bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden ${className}`}>
    {children}
  </View>
);

export const CardHeader = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <View className={`p-6 pb-2 ${className}`}>
    {children}
  </View>
);

export const CardTitle = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <Text className={`text-xl font-bold tracking-tight text-white ${className}`}>
    {children}
  </Text>
);

export const CardContent = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <View className={`p-6 pt-2 ${className}`}>
    {children}
  </View>
);
