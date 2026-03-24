import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { BookOpen } from 'lucide-react-native';

export const RegisterScreen = ({ navigation }: any) => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !name) return Alert.alert('Hata', 'Zorunlu alanları doldurun.');
    try {
      setIsLoading(true);
      await register({ name, email, department, password });
      // Kayıt başarılıysa AuthContext otomatik olarak kullanıcıyı içeri alır
    } catch (error: any) {
      let errorMessage = 'Kayıt sırasında bir hata oluştu.';
      const detail = error.response?.data?.detail;
      if (typeof detail === 'string') {
        errorMessage = detail;
      } else if (Array.isArray(detail)) {
        errorMessage = detail.map((d: any) => `${d.loc?.[1] || 'Alan'}: ${d.msg}`).join('\\n');
      } else if (error.message) {
        errorMessage = error.message;
      }
      Alert.alert('Kayıt Hatası', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-slate-950">
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
        <Card className="shadow-xl border-slate-800 bg-slate-900">
          <CardHeader className="items-center">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-emerald-900/50 mb-4">
              <BookOpen size={28} color="#10b981" />
            </View>
            <CardTitle>Yeni Hesap Oluştur</CardTitle>
            <Text className="text-sm text-center text-gray-400 mt-2">
              Öğretmen ve Öğrenci rolü, okul e-postanıza göre otomatik şekillenir.
            </Text>
          </CardHeader>
          <CardContent>
            <Input
              label="Ad Soyad"
              placeholder="Ahmet Yılmaz"
              value={name}
              onChangeText={setName}
            />
            <Input
              label="Okul E-posta Adresi"
              placeholder="ahmet@ogr.unvan.edu.tr"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <Input
              label="Bölüm (Opsiyonel)"
              placeholder="Yazılım Mühendisliği"
              value={department}
              onChangeText={setDepartment}
            />
            <Input
              label="Şifre"
              placeholder="En az 6 karakter"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            
            <Button 
              title="Kayıt Ol ve Sisteme Gir" 
              variant="secondary"
              onPress={handleRegister} 
              isLoading={isLoading} 
              className="mt-4" 
            />
            
            <View className="mt-6 flex-row justify-center">
              <Text className="text-sm text-gray-400">Zaten hesabınız var mı? </Text>
              <Text 
                className="text-sm font-bold text-emerald-400"
                onPress={() => navigation.navigate('Login')}
              >
                Giriş Yap
              </Text>
            </View>
          </CardContent>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
