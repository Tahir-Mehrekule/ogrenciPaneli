import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../hooks/useAuth';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { StudentDashboardScreen } from '../screens/dashboard/StudentDashboardScreen';
import { TeacherDashboardScreen } from '../screens/dashboard/TeacherDashboardScreen';
import { View, Text, ActivityIndicator } from 'react-native';
import { Home, User as UserIcon, BookOpen, FolderKanban } from 'lucide-react-native';
import { Button } from '../components/ui/Button';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Web ile aynı koyu renk teması
const DarkNavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#020617',   // slate-950
    card: '#0f172a',          // slate-900
    text: '#f8fafc',          // slate-50
    border: '#334155',        // slate-700
    primary: '#818cf8',       // indigo-400
  },
};

// Profil / Hesabım Ekranı
const ProfileScreen = () => {
  const { logout, user } = useAuth();
  return (
    <View className="flex-1 items-center justify-center bg-slate-950 p-6">
      <View className="h-24 w-24 items-center justify-center rounded-full bg-indigo-900/50 mb-4">
        <UserIcon size={40} color="#818cf8" />
      </View>
      <Text className="text-2xl font-bold mb-1 text-white">{user?.name}</Text>
      <Text className="text-sm text-gray-400 mb-2">{user?.email}</Text>
      <View className="rounded-lg bg-slate-800 px-3 py-1 mb-8">
        <Text className="text-xs font-semibold text-indigo-400">{user?.role}</Text>
      </View>
      
      <Button title="Güvenli Çıkış Yap" variant="danger" onPress={logout} className="w-full" />
    </View>
  );
};

const MainTabNavigator = () => {
  const { user } = useAuth();

  return (
    <Tab.Navigator screenOptions={{ 
      headerStyle: { backgroundColor: '#0f172a', elevation: 0, shadowOpacity: 0 },
      headerTintColor: '#818cf8',
      headerTitleStyle: { fontWeight: 'bold', fontSize: 18 },
      headerShadowVisible: false,
      tabBarStyle: { 
        backgroundColor: '#0f172a', 
        borderTopWidth: 1, 
        borderTopColor: '#1e293b',
        elevation: 0,
        paddingBottom: 4,
        height: 56,
      },
      tabBarActiveTintColor: '#818cf8',
      tabBarInactiveTintColor: '#64748b',
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
    }}>
      <Tab.Screen 
        name="DashboardRoot" 
        component={user?.role === 'TEACHER' ? TeacherDashboardScreen : StudentDashboardScreen} 
        options={{ 
          title: 'Genel Bakış',
          headerTitle: 'UniTrack AI',
          tabBarIcon: ({ color }) => <Home color={color} size={22} /> 
        }}
      />
      <Tab.Screen 
        name="CoursesRoot" 
        component={user?.role === 'TEACHER' ? TeacherDashboardScreen : StudentDashboardScreen} 
        options={{ 
          title: 'Dersler',
          headerTitle: 'UniTrack AI',
          tabBarIcon: ({ color }) => <BookOpen color={color} size={22} /> 
        }}
      />
      <Tab.Screen 
        name="ProjectsRoot" 
        component={user?.role === 'TEACHER' ? TeacherDashboardScreen : StudentDashboardScreen} 
        options={{ 
          title: 'Projeler',
          headerTitle: 'UniTrack AI',
          tabBarIcon: ({ color }) => <FolderKanban color={color} size={22} /> 
        }}
      />
      <Tab.Screen 
        name="ProfileRoot" 
        component={ProfileScreen} 
        options={{ 
          title: 'Hesabım',
          headerTitle: 'UniTrack AI',
          tabBarIcon: ({ color }) => <UserIcon color={color} size={22} /> 
        }}
      />
    </Tab.Navigator>
  );
};

export const RootNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator size="large" color="#818cf8" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={DarkNavTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {user ? (
          <Stack.Screen name="Main" component={MainTabNavigator} />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
