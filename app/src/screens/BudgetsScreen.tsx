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
  BudgetDto,
  categoryLabel,
  createBudget,
  deleteBudget,
  formatCents,
  listBudgets,
  MACRO_CATEGORIES,
} from '../api';
import { colors, radius } from '../theme';

export function BudgetsScreen() {
  const [budgets, setBudgets] = useState<BudgetDto[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<string>(MACRO_CATEGORIES[0]);
  const [limit, setLimit] = useState('');

  const refresh = useCallback(() => {
    listBudgets().then(setBudgets).catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const add = async () => {
    if (!limit) return;
    const cents = Math.round(parseFloat(limit.replace(',', '.')) * 100);
    if (!cents) return;
    await createBudget({ category, monthly_limit_cents: cents });
    setLimit(''); setShowForm(false);
    refresh();
  };

  const remove = (id: string) => {
    Alert.alert('Remover', 'Remover este orçamento?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => deleteBudget(id).then(refresh) },
    ]);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={budgets}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.header}>Define limites mensais por categoria</Text>
        }
        renderItem={({ item }) => {
          const pct = Math.min(100, (item.spent_cents / item.monthly_limit_cents) * 100);
          const over = pct >= 100;
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.catName}>{categoryLabel(item.category)}</Text>
                <Pressable onPress={() => remove(item.id)} hitSlop={8}>
                  <Text style={styles.deleteBtn}>✕</Text>
                </Pressable>
              </View>
              <Text style={styles.progress}>
                {formatCents(item.spent_cents)} / {formatCents(item.monthly_limit_cents)}
              </Text>
              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${pct}%` }, over ? styles.barOver : null]} />
              </View>
              {over ? <Text style={styles.overText}>Orçamento ultrapassado!</Text> : null}
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhum orçamento definido. Controla os gastos por categoria.</Text>
        }
      />

      {showForm ? (
        <View style={styles.form}>
          <View style={styles.chipRow}>
            {MACRO_CATEGORIES.map((c) => (
              <Pressable
                key={c}
                style={[styles.chip, c === category ? styles.chipActive : null]}
                onPress={() => setCategory(c)}
              >
                <Text style={[styles.chipText, c === category ? styles.chipTextActive : null]}>
                  {categoryLabel(c)}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput style={styles.input} placeholder="Limite mensal (€)" placeholderTextColor={colors.textMuted} value={limit} onChangeText={setLimit} keyboardType="decimal-pad" />
          <Pressable style={styles.saveBtn} onPress={add}>
            <Text style={styles.saveBtnText}>Guardar</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.footer}>
          <Pressable style={styles.addBtn} onPress={() => setShowForm(true)}>
            <Text style={styles.addBtnText}>+ Adicionar orçamento</Text>
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
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: 14, marginBottom: 8 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catName: { fontSize: 15, fontWeight: '600', color: colors.text },
  deleteBtn: { color: colors.danger, fontSize: 16 },
  progress: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
  barBg: { height: 6, backgroundColor: colors.border, borderRadius: 3, marginTop: 6, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: colors.accent, borderRadius: 3 },
  barOver: { backgroundColor: colors.danger },
  overText: { color: colors.danger, fontSize: 12, marginTop: 4 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
  form: { padding: 16, backgroundColor: colors.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: colors.bg },
  chipActive: { backgroundColor: colors.accent },
  chipText: { fontSize: 12, color: colors.textMuted },
  chipTextActive: { color: colors.onAccent, fontWeight: '700' },
  input: { backgroundColor: colors.bg, borderRadius: radius.sm, padding: 12, color: colors.text, marginBottom: 8, fontSize: 15 },
  saveBtn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: colors.onAccent, fontWeight: '700', fontSize: 16 },
  footer: { padding: 16, backgroundColor: colors.bg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  addBtn: { backgroundColor: colors.accent, borderRadius: radius.lg, paddingVertical: 14, alignItems: 'center' },
  addBtnText: { color: colors.onAccent, fontWeight: '700', fontSize: 16 },
});
