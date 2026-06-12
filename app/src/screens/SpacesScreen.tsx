import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, radius } from '../theme';
import { API_URL } from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Space { id: string; name: string; members: { id: string; user: { email: string } }[] }

async function headers(): Promise<Record<string, string>> {
  const t = await AsyncStorage.getItem('auth_token');
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

export function SpacesScreen() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');

  const refresh = useCallback(() => {
    headers().then(h => fetch(`${API_URL}/spaces`, { headers: h }))
      .then(r => r.json()).then(setSpaces).catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const create = async () => {
    if (!name) return;
    const h = await headers();
    await fetch(`${API_URL}/spaces`, { method: 'POST', headers: h, body: JSON.stringify({ name }) });
    setName(''); setShowForm(false); refresh();
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={spaces}
        keyExtractor={s => s.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.spaceName}>{item.name}</Text>
            <Text style={styles.members}>{(item.members?.length ?? 0) + 1} membros</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Cria um espaço para gerir despesas com família ou equipa.</Text>}
      />
      {showForm ? (
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Nome do espaço (ex: Família)" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} />
          <Pressable style={styles.btn} onPress={create}><Text style={styles.btnText}>Criar espaço</Text></Pressable>
        </View>
      ) : (
        <View style={styles.footer}>
          <Pressable style={styles.btn} onPress={() => setShowForm(true)}><Text style={styles.btnText}>+ Novo espaço</Text></Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16 },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: 14, marginBottom: 10 },
  spaceName: { fontSize: 16, fontWeight: '700', color: colors.text },
  members: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40, paddingHorizontal: 24 },
  form: { padding: 16, backgroundColor: colors.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  input: { backgroundColor: colors.bg, borderRadius: radius.sm, padding: 12, color: colors.text, marginBottom: 8, fontSize: 15 },
  btn: { backgroundColor: colors.accent, borderRadius: radius.lg, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: colors.onAccent, fontWeight: '700', fontSize: 16 },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
