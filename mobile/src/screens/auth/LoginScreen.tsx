import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { BookOpen } from 'lucide-react-native';

export const LoginScreen = ({ navigation }: any) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Hata', 'Lütfen e-posta ve şifrenizi girin.');
    try {
      setIsLoading(true);
      await login({ email, password });
    } catch (error: any) {
      const status = error.response?.status;
      const detail = error.response?.data?.detail;
      let errorMessage = 'Lütfen bilgilerinizi kontrol edin.';
      let errorTitle = 'Giriş Başarısız';

      if (typeof detail === 'string') {
        errorMessage = detail;
        // 403 → PENDING veya REJECTED mesajını öne çıkar
        if (status === 403) errorTitle = 'Hesap Erişimi Kısıtlı';
      } else if (Array.isArray(detail)) {
        errorMessage = detail.map((d: any) => d.msg).join('\n');
      } else if (error.message) {
        errorMessage = error.message;
      }
      Alert.alert(errorTitle, errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-slate-950">
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
        <Card className="shadow-xl border-slate-800 bg-slate-900">
          <CardHeader className="items-center">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-indigo-900/50 mb-4">
              <BookOpen size={28} color="#818cf8" />
            </View>
            <CardTitle>Hesabınıza Giriş Yapın</CardTitle>
            <Text className="text-sm text-center text-gray-400 mt-2">
              UniTrack AI mobil paneline erişmek için bilgilerinizi girin.
            </Text>
          </CardHeader>
          <CardContent>
            <Input
              label="Okul E-posta Adresi"
              placeholder="ornek@ogr.edu.tr"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <Input
              label="Şifre"
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <Button title="Giriş Yap" onPress={handleLogin} isLoading={isLoading} className="mt-4" />
            
            <View className="mt-6 flex-row justify-center">
              <Text className="text-sm text-gray-400">Hesabınız yok mu? </Text>
              <Text 
                className="text-sm font-bold text-indigo-400"
                onPress={() => navigation.navigate('Register')}
              >
                Kayıt Ol
              </Text>
            </View>
          </CardContent>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
