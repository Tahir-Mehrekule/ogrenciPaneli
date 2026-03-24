import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
  className?: string;
  textClassName?: string;
}

export const Button = ({ 
  onPress, 
  title, 
  variant = 'primary', 
  isLoading, 
  className = '', 
  textClassName = '' 
}: ButtonProps) => {
  const baseStyle = "h-12 flex-row flex items-center justify-center rounded-xl px-4";
  const variants = {
    primary: "bg-indigo-600 active:bg-indigo-700",
    secondary: "bg-emerald-500 active:bg-emerald-600",
    danger: "bg-red-500 active:bg-red-600",
  };

  return (
    <TouchableOpacity 
      disabled={isLoading}
      onPress={onPress}
      className={`${baseStyle} ${variants[variant]} ${isLoading ? 'opacity-70' : ''} ${className}`}
    >
      {isLoading ? (
        <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
      ) : null}
      <Text className={`font-semibold text-white text-base tracking-tight ${textClassName}`}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};
