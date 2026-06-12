import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { clearToken, formatCents, getProfile, ProfileDto } from '../api';
import { colors, radius } from '../theme';
import type { RootStackParamList } from '../navigation';

export function ProfileScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [profile, setProfile] = useState<ProfileDto | null>(null);

  useFocusEffect(
    useCallback(() => {
      getProfile().then(setProfile).catch(() => {});
    }, []),
  );

  const logout = () => {
    Alert.alert('Sair', 'Tens a certeza que queres sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await clearToken();
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  if (!profile) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const limit = profile.plan?.monthlyReceiptLimit ?? 5;
  const used = profile.usage.receiptsScanned;
  const pct = Math.min(100, (used / limit) * 100);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {/* Avatar placeholder */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(profile.name || profile.email)[0].toUpperCase()}
        </Text>
      </View>
      <Text style={styles.name}>{profile.name || 'Utilizador'}</Text>
      <Text style={styles.email}>{profile.email}</Text>

      {/* Plan card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Plano {profile.plan?.name ?? 'Free'}</Text>
        <Text style={styles.cardSub}>
          {profile.plan?.priceCents === 0
            ? 'Gratuito'
            : formatCents(profile.plan?.priceCents ?? 0) + '/mês'}
        </Text>
        <View style={styles.usageRow}>
          <Text style={styles.usageText}>
            {used} / {limit} faturas este mês
          </Text>
        </View>
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${pct}%` }]} />
        </View>
        <Pressable
          style={styles.upgradeBtn}
          onPress={() => navigation.navigate('Upgrade')}
        >
          <Text style={styles.upgradeBtnText}>Ver planos</Text>
        </Pressable>
      </View>

      {/* Shortcuts */}
      <Pressable
        style={styles.menuItem}
        onPress={() => navigation.navigate('Recurring')}
      >
        <Text style={styles.menuText}>🔄  Despesas recorrentes</Text>
      </Pressable>
      <Pressable
        style={styles.menuItem}
        onPress={() => navigation.navigate('Budgets')}
      >
        <Text style={styles.menuText}>💰  Orçamentos</Text>
      </Pressable>
      <Pressable
        style={styles.menuItem}
        onPress={() => navigation.navigate('Kids')}
      >
        <Text style={styles.menuText}>👶  Conta Kid</Text>
      </Pressable>
      <Pressable
        style={styles.menuItem}
        onPress={() => navigation.navigate('Spaces')}
      >
        <Text style={styles.menuText}>👥  Espaços partilhados</Text>
      </Pressable>

      {/* Logout */}
      <Pressable style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Sair da conta</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 24, alignItems: 'center' },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: colors.onAccent },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  email: { fontSize: 14, color: colors.textMuted, marginTop: 2, marginBottom: 20 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 16,
    width: '100%',
    marginBottom: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  cardSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  usageRow: { marginTop: 12 },
  usageText: { fontSize: 14, color: colors.text },
  barBg: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  barFill: { height: 6, backgroundColor: colors.accent, borderRadius: 3 },
  upgradeBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
  },
  upgradeBtnText: { color: colors.accent, fontWeight: '600', fontSize: 14 },
  logoutBtn: {
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  logoutText: { color: colors.danger, fontSize: 16, fontWeight: '600' },
  menuItem: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    width: '100%',
    marginBottom: 8,
  },
  menuText: { fontSize: 15, color: colors.text },
});
