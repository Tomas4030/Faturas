import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, radius } from '../theme';
import { API_URL, formatCents } from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Kid { id: string; name: string; balanceCents: number; allowanceCents: number; tasks: { id: string; description: string; rewardCents: number; completed: boolean }[] }

async function headers(): Promise<Record<string, string>> {
  const t = await AsyncStorage.getItem('auth_token');
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

export function KidsScreen() {
  const [kids, setKids] = useState<Kid[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [allowance, setAllowance] = useState('');

  const refresh = useCallback(() => {
    headers().then(h => fetch(`${API_URL}/kids`, { headers: h }))
      .then(r => r.json()).then(setKids).catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const addKid = async () => {
    if (!name) return;
    const cents = Math.round(parseFloat(allowance.replace(',', '.') || '0') * 100);
    const h = await headers();
    await fetch(`${API_URL}/kids`, { method: 'POST', headers: h, body: JSON.stringify({ name, allowance_cents: cents, allowance_day: 1 }) });
    setName(''); setAllowance(''); setShowForm(false); refresh();
  };

  const completeTask = async (kidId: string, taskId: string) => {
    const h = await headers();
    await fetch(`${API_URL}/kids/${kidId}/tasks/${taskId}/complete`, { method: 'PATCH', headers: h });
    refresh();
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={kids}
        keyExtractor={k => k.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.kidHeader}>
              <Text style={styles.kidName}>{item.name}</Text>
              <Text style={styles.kidBalance}>{formatCents(item.balanceCents)}</Text>
            </View>
            <Text style={styles.kidSub}>Mesada: {formatCents(item.allowanceCents)}/mês</Text>
            {item.tasks.filter(t => !t.completed).map(t => (
              <Pressable key={t.id} style={styles.task} onPress={() => completeTask(item.id, t.id)}>
                <Text style={styles.taskText}>☐ {t.description}</Text>
                <Text style={styles.taskReward}>+{formatCents(t.rewardCents)}</Text>
              </Pressable>
            ))}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Ainda não adicionaste filhos. Cria um perfil para começar!</Text>}
      />
      {showForm ? (
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Nome do filho" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Mesada mensal (€)" placeholderTextColor={colors.textMuted} value={allowance} onChangeText={setAllowance} keyboardType="decimal-pad" />
          <Pressable style={styles.btn} onPress={addKid}><Text style={styles.btnText}>Criar</Text></Pressable>
        </View>
      ) : (
        <View style={styles.footer}>
          <Pressable style={styles.btn} onPress={() => setShowForm(true)}><Text style={styles.btnText}>+ Adicionar filho</Text></Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16 },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: 14, marginBottom: 10 },
  kidHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kidName: { fontSize: 17, fontWeight: '700', color: colors.text },
  kidBalance: { fontSize: 17, fontWeight: '800', color: colors.accent },
  kidSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  task: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, marginTop: 8 },
  taskText: { fontSize: 14, color: colors.text },
  taskReward: { fontSize: 14, color: colors.accent, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
  form: { padding: 16, backgroundColor: colors.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  input: { backgroundColor: colors.bg, borderRadius: radius.sm, padding: 12, color: colors.text, marginBottom: 8, fontSize: 15 },
  btn: { backgroundColor: colors.accent, borderRadius: radius.lg, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: colors.onAccent, fontWeight: '700', fontSize: 16 },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
