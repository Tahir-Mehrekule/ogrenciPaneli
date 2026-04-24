import React, { useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../hooks/useAuth';
import { DrawerMenu } from '../components/ui/DrawerMenu';
import { StudentListScreen } from '../screens/students/StudentListScreen';
import { UserListScreen } from '../screens/admin_users/UserListScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { StudentDashboardScreen } from '../screens/dashboard/StudentDashboardScreen';
import { TeacherDashboardScreen } from '../screens/dashboard/TeacherDashboardScreen';
import { CourseListScreen } from '../screens/courses/CourseListScreen';
import { CourseCreateScreen } from '../screens/courses/CourseCreateScreen';
import { CourseEditScreen } from '../screens/courses/CourseEditScreen';
import { ProjectListScreen } from '../screens/projects/ProjectListScreen';
import { ProjectCreateScreen } from '../screens/projects/ProjectCreateScreen';
import { ProjectDetailScreen } from '../screens/projects/ProjectDetailScreen';
import { TaskCreateScreen } from '../screens/projects/TaskCreateScreen';
import { InviteMemberScreen } from '../screens/projects/InviteMemberScreen';
import { ProjectMembersScreen } from '../screens/projects/ProjectMembersScreen';
import { JoinProjectScreen } from '../screens/projects/JoinProjectScreen';
import { ReportListScreen } from '../screens/reports/ReportListScreen';
import { ReportCreateScreen } from '../screens/reports/ReportCreateScreen';
import { NotificationListScreen } from '../screens/notifications/NotificationListScreen';
import { PendingStudentsScreen } from '../screens/admin/PendingStudentsScreen';
import { SettingsScreen } from '../screens/admin/SettingsScreen';
import {
  View, Text, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import {
  Home, User as UserIcon, BookOpen, FolderKanban,
  FileText, Bell, UserCheck, Settings, Menu,
} from 'lucide-react-native';
import { Button } from '../components/ui/Button';
import { useUnreadCount } from '../hooks/useUnreadCount';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const CourseStack = createNativeStackNavigator();
const ProjectStack = createNativeStackNavigator();
const ReportStack = createNativeStackNavigator();

const DarkNavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#020617',
    card: '#0f172a',
    text: '#f8fafc',
    border: '#334155',
    primary: '#818cf8',
  },
};

const ProfileScreen = () => {
  const { logout, user } = useAuth();
  return (
    <View className="flex-1 items-center justify-center bg-slate-950 p-6">
      <View className="h-24 w-24 items-center justify-center rounded-full bg-indigo-900/50 mb-4">
        <UserIcon size={40} color="#818cf8" />
      </View>
      <Text className="text-2xl font-bold mb-1 text-white">{user?.full_name}</Text>
      <Text className="text-sm text-gray-400 mb-2">{user?.email}</Text>
      <View className="rounded-lg bg-slate-800 px-3 py-1 mb-8">
        <Text className="text-xs font-semibold text-indigo-400">{user?.role}</Text>
      </View>
      <Button title="Güvenli Çıkış Yap" variant="danger" onPress={logout} className="w-full" />
    </View>
  );
};

const CoursesStackNavigator = () => (
  <CourseStack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#0f172a' }, headerTintColor: '#818cf8', headerTitleStyle: { fontWeight: 'bold', fontSize: 16 }, headerShadowVisible: false }}>
    <CourseStack.Screen name="CourseList" component={CourseListScreen} options={{ headerShown: false }} />
    <CourseStack.Screen name="CourseCreate" component={CourseCreateScreen} options={{ title: 'Yeni Ders' }} />
    <CourseStack.Screen name="CourseEdit" component={CourseEditScreen} options={{ title: 'Ders Düzenle' }} />
  </CourseStack.Navigator>
);

const ProjectsStackNavigator = () => (
  <ProjectStack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#0f172a' }, headerTintColor: '#818cf8', headerTitleStyle: { fontWeight: 'bold', fontSize: 16 }, headerShadowVisible: false }}>
    <ProjectStack.Screen name="ProjectList" component={ProjectListScreen} options={{ headerShown: false }} />
    <ProjectStack.Screen name="ProjectCreate" component={ProjectCreateScreen} options={{ title: 'Yeni Proje' }} />
    <ProjectStack.Screen name="ProjectDetail" component={ProjectDetailScreen} options={{ title: 'Proje Detayı' }} />
    <ProjectStack.Screen name="TaskCreate" component={TaskCreateScreen} options={{ title: 'Görev Ekle' }} />
    <ProjectStack.Screen name="ProjectMembers" component={ProjectMembersScreen} options={{ title: 'Üye Yönetimi' }} />
    <ProjectStack.Screen name="InviteMember" component={InviteMemberScreen} options={{ title: 'Üye Davet Et' }} />
    <ProjectStack.Screen name="JoinProject" component={JoinProjectScreen} options={{ title: 'Projeye Katıl' }} />
  </ProjectStack.Navigator>
);

const ReportsStackNavigator = () => (
  <ReportStack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#0f172a' }, headerTintColor: '#818cf8', headerTitleStyle: { fontWeight: 'bold', fontSize: 16 }, headerShadowVisible: false }}>
    <ReportStack.Screen name="ReportList" component={ReportListScreen} options={{ headerShown: false }} />
    <ReportStack.Screen name="ReportCreate" component={ReportCreateScreen} options={{ title: 'Yeni Rapor' }} />
  </ReportStack.Navigator>
);

const tabScreenOptions = {
  headerStyle: { backgroundColor: '#0f172a', elevation: 0, shadowOpacity: 0 },
  headerTintColor: '#818cf8',
  headerTitleStyle: { fontWeight: 'bold' as const, fontSize: 18 },
  headerShadowVisible: false,
  tabBarStyle: { backgroundColor: '#0f172a', borderTopWidth: 1, borderTopColor: '#1e293b', elevation: 0, paddingBottom: 4, height: 56 },
  tabBarActiveTintColor: '#818cf8',
  tabBarInactiveTintColor: '#64748b',
  tabBarLabelStyle: { fontSize: 10, fontWeight: '600' as const },
};

// Tab navigator — rootNavigation prop ile hamburger menüyü root stack'e bağlar
const MainTabNavigator = ({ rootNavigation, onOpenDrawer }: { rootNavigation: any; onOpenDrawer: () => void }) => {
  const { user } = useAuth();
  const role = user?.role?.toUpperCase();
  const { unreadCount } = useUnreadCount();

  const sharedHeader = () => ({
    headerLeft: () => (
      <TouchableOpacity onPress={onOpenDrawer} className="ml-4">
        <View className="bg-slate-800 p-2 rounded-full">
          <Menu color="#818cf8" size={18} />
        </View>
      </TouchableOpacity>
    ),
    headerRight: () => (
      <TouchableOpacity onPress={() => rootNavigation.navigate('NotificationsModal')} className="mr-4">
        <View className="bg-slate-800 p-2 rounded-full">
          <Bell color="#818cf8" size={18} />
          {unreadCount > 0 && (
            <View className="absolute -top-1 -right-1 bg-red-500 rounded-full h-4 w-4 items-center justify-center">
              <Text className="text-white font-bold" style={{ fontSize: 9 }}>
                {unreadCount > 9 ? '9+' : String(unreadCount)}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    ),
  });

  return (
    <Tab.Navigator screenOptions={sharedHeader()}>
      <Tab.Screen
        name="DashboardRoot"
        component={role === 'TEACHER' || role === 'ADMIN' ? TeacherDashboardScreen : StudentDashboardScreen}
        options={{ title: 'Genel Bakış', headerTitle: 'UniTrack AI', tabBarIcon: ({ color }) => <Home color={color} size={22} /> }}
      />
      <Tab.Screen
        name="CoursesRoot"
        component={CoursesStackNavigator}
        options={{ title: 'Dersler', headerShown: false, tabBarIcon: ({ color }) => <BookOpen color={color} size={22} /> }}
      />
      <Tab.Screen
        name="ProjectsRoot"
        component={ProjectsStackNavigator}
        options={{ title: 'Projeler', headerShown: false, tabBarIcon: ({ color }) => <FolderKanban color={color} size={22} /> }}
        listeners={({ navigation: nav }) => ({
          tabPress: (e) => {
            e.preventDefault();
            nav.navigate('ProjectsRoot', { screen: 'ProjectList', initial: true });
          },
        })}
      />
      <Tab.Screen
        name="ReportsRoot"
        component={ReportsStackNavigator}
        options={{ title: 'Raporlar', headerShown: false, tabBarIcon: ({ color }) => <FileText color={color} size={22} /> }}
      />
      {(role === 'TEACHER' || role === 'ADMIN') && (
        <Tab.Screen
          name="PendingRoot"
          component={PendingStudentsScreen}
          options={{ title: 'Onaylar', headerTitle: 'Onay Bekleyenler', tabBarIcon: ({ color }) => <UserCheck color={color} size={22} /> }}
        />
      )}
      {role === 'ADMIN' && (
        <Tab.Screen
          name="SettingsRoot"
          component={SettingsScreen}
          options={{ title: 'Ayarlar', headerTitle: 'Bölüm Yönetimi', tabBarIcon: ({ color }) => <Settings color={color} size={22} /> }}
        />
      )}
      <Tab.Screen
        name="ProfileRoot"
        component={ProfileScreen}
        options={{ title: 'Hesabım', headerTitle: 'UniTrack AI', tabBarIcon: ({ color }) => <UserIcon color={color} size={22} /> }}
      />
    </Tab.Navigator>
  );
};

// MainWrapper: Drawer state'ini burada tutar, Tab ve DrawerMenu aynı root navigation'a sahip
const MainWrapper = ({ navigation }: { navigation: any }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <DrawerMenu
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        navigation={navigation}
      />
      <MainTabNavigator
        rootNavigation={navigation}
        onOpenDrawer={() => setDrawerOpen(true)}
      />
    </>
  );
};

export const RootNavigator = () => {
  const { user, loading } = useAuth();
  if (loading) return (
    <View className="flex-1 items-center justify-center bg-slate-950">
      <ActivityIndicator size="large" color="#818cf8" />
    </View>
  );
  return (
    <NavigationContainer theme={DarkNavTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainWrapper} />
            <Stack.Screen
              name="NotificationsModal"
              component={NotificationListScreen}
              options={{
                headerShown: true,
                presentation: 'modal',
                title: 'Bildirimler',
                headerStyle: { backgroundColor: '#0f172a' },
                headerTintColor: '#818cf8',
              }}
            />
            <Stack.Screen
              name="StudentList"
              component={StudentListScreen}
              options={{
                headerShown: true,
                title: 'Öğrencilerim',
                headerStyle: { backgroundColor: '#0f172a' },
                headerTintColor: '#818cf8',
                headerTitleStyle: { fontWeight: 'bold', fontSize: 16 },
              }}
            />
            <Stack.Screen
              name="UserList"
              component={UserListScreen}
              options={{
                headerShown: true,
                title: 'Tüm Kullanıcılar',
                headerStyle: { backgroundColor: '#0f172a' },
                headerTintColor: '#818cf8',
                headerTitleStyle: { fontWeight: 'bold', fontSize: 16 },
              }}
            />
          </>
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
