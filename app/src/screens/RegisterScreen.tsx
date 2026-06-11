import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { apiRegister, setToken } from '../api';
import { colors, radius } from '../theme';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !password) return;
    if (password.length < 6) {
      Alert.alert('Erro', 'A password deve ter pelo menos 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      const res = await apiRegister(email.trim().toLowerCase(), password, name.trim() || undefined);
      await setToken(res.access_token);
      navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
    } catch (e: any) {
      Alert.alert('Erro', e.message?.includes('409') ? 'Email já registado' : 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Criar conta</Text>

        <TextInput
          style={styles.input}
          placeholder="Nome (opcional)"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable style={styles.button} onPress={submit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={styles.buttonText}>Criar conta</Text>
          )}
        </Pressable>

        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Já tens conta? Entrar</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center' },
  inner: { padding: 24 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 24, textAlign: 'center' },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    marginBottom: 12,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: colors.onAccent, fontSize: 17, fontWeight: '700' },
  link: { color: colors.accent, textAlign: 'center', marginTop: 16, fontSize: 15 },
});
