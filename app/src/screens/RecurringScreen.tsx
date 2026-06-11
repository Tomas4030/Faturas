import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  categoryLabel,
  createRecurringExpense,
  deleteRecurringExpense,
  formatCents,
  listRecurringExpenses,
  MACRO_CATEGORIES,
  RecurringExpenseDto,
} from '../api';
import { colors, radius } from '../theme';

export function RecurringScreen() {
  const [items, setItems] = useState<RecurringExpenseDto[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>('outros');

  const refresh = useCallback(() => {
    listRecurringExpenses().then(setItems).catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const add = async () => {
    if (!desc || !amount) return;
    const cents = Math.round(parseFloat(amount.replace(',', '.')) * 100);
    if (!cents) return;
    await createRecurringExpense({ description: desc, amount_cents: cents, category });
    setDesc(''); setAmount(''); setShowForm(false);
    refresh();
  };

  const remove = (id: string) => {
    Alert.alert('Remover', 'Remover esta despesa recorrente?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => deleteRecurringExpense(id).then(refresh) },
    ]);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.header}>Despesas que se repetem todos os meses</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemDesc}>{item.description}</Text>
              <Text style={styles.itemSub}>
                {categoryLabel(item.category)} · Dia {item.dayOfMonth}
              </Text>
            </View>
            <Text style={styles.itemAmount}>{formatCents(item.amountCents)}</Text>
            <Pressable onPress={() => remove(item.id)} hitSlop={8}>
              <Text style={styles.deleteBtn}>✕</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhuma despesa recorrente. Adiciona rendas, seguros, subscrições…</Text>
        }
      />

      {showForm ? (
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Descrição (ex: Renda)" placeholderTextColor={colors.textMuted} value={desc} onChangeText={setDesc} />
          <TextInput style={styles.input} placeholder="Valor (€)" placeholderTextColor={colors.textMuted} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
          <Pressable style={styles.saveBtn} onPress={add}>
            <Text style={styles.saveBtnText}>Guardar</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.footer}>
          <Pressable style={styles.addBtn} onPress={() => setShowForm(true)}>
            <Text style={styles.addBtnText}>+ Adicionar despesa recorrente</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16 },
  header: { fontSize: 13, color: colors.textMuted, marginBottom: 12 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemDesc: { fontSize: 15, fontWeight: '600', color: colors.text },
  itemSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  itemAmount: { fontSize: 16, fontWeight: '700', color: colors.text, marginRight: 12 },
  deleteBtn: { color: colors.danger, fontSize: 16 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
  form: { padding: 16, backgroundColor: colors.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  input: { backgroundColor: colors.bg, borderRadius: radius.sm, padding: 12, color: colors.text, marginBottom: 8, fontSize: 15 },
  saveBtn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: colors.onAccent, fontWeight: '700', fontSize: 16 },
  footer: { padding: 16, backgroundColor: colors.bg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  addBtn: { backgroundColor: colors.accent, borderRadius: radius.lg, paddingVertical: 14, alignItems: 'center' },
  addBtnText: { color: colors.onAccent, fontWeight: '700', fontSize: 16 },
});
