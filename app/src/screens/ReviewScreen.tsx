import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  categoryLabel,
  formatCents,
  getReceipt,
  MACRO_CATEGORIES,
  MacroCategory,
  ReceiptDto,
  updateItems,
  updateReceipt,
} from '../api';
import { colors, radius } from '../theme';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Review'>;

/** Item em edição: campos numéricos como texto para permitir escrita livre. */
interface DraftItem {
  key: string;
  description: string;
  quantityText: string;
  unitPriceText: string; // euros, ex.: "18,50"
  suspect: boolean;
}

const TOLERANCE_CENTS = 5;

function centsToText(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

function textToNumber(text: string): number {
  const n = Number(text.replace(',', '.').trim());
  return Number.isFinite(n) ? n : 0;
}

function textToCents(text: string): number {
  return Math.round(textToNumber(text) * 100);
}

function draftLineTotalCents(item: DraftItem): number {
  return Math.round(
    textToNumber(item.quantityText) * textToCents(item.unitPriceText),
  );
}

export function ReviewScreen({ navigation, route }: Props) {
  const { receiptId } = route.params;
  const insets = useSafeAreaInsets();
  const [receipt, setReceipt] = useState<ReceiptDto | null>(null);
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getReceipt(receiptId)
      .then((r) => {
        setReceipt(r);
        setDrafts(
          r.items.map((item) => ({
            key: item.id,
            description: item.description,
            quantityText: String(item.quantity).replace('.', ','),
            unitPriceText: centsToText(item.unit_price_cents),
            suspect: item.suspect,
          })),
        );
      })
      .catch(() =>
        Alert.alert('Erro', 'Não foi possível carregar a fatura.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]),
      );
  }, [navigation, receiptId]);

  const setDraft = useCallback((key: string, patch: Partial<DraftItem>) => {
    setDrafts((prev) =>
      prev.map((d) => (d.key === key ? { ...d, ...patch, suspect: false } : d)),
    );
  }, []);

  const removeDraft = useCallback((key: string) => {
    setDrafts((prev) => prev.filter((d) => d.key !== key));
  }, []);

  const addDraft = useCallback(() => {
    setDrafts((prev) => [
      ...prev,
      {
        key: `new-${Date.now()}`,
        description: '',
        quantityText: '1',
        unitPriceText: '0,00',
        suspect: false,
      },
    ]);
  }, []);

  const detectedTotalCents = useMemo(
    () => drafts.reduce((sum, d) => sum + draftLineTotalCents(d), 0),
    [drafts],
  );
  const invoiceTotalCents = receipt?.totals.total_cents ?? null;
  const differenceCents =
    invoiceTotalCents == null ? 0 : detectedTotalCents - invoiceTotalCents;
  const totalsMismatch = Math.abs(differenceCents) > TOLERANCE_CENTS;

  const confirm = useCallback(async () => {
    const valid = drafts.filter((d) => d.description.trim().length > 0);
    if (valid.length === 0) {
      Alert.alert('Sem itens', 'Adiciona pelo menos um item antes de confirmar.');
      return;
    }
    setSaving(true);
    try {
      await updateItems(
        receiptId,
        valid.map((d) => ({
          description: d.description.trim(),
          quantity: textToNumber(d.quantityText) || 1,
          unit_price_cents: textToCents(d.unitPriceText),
          total_cents: draftLineTotalCents(d),
        })),
      );
      navigation.popToTop();
    } catch {
      Alert.alert('Erro', 'Não foi possível guardar. Tenta novamente.');
    } finally {
      setSaving(false);
    }
  }, [drafts, navigation, receiptId]);

  if (receipt == null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: 120 + insets.bottom },
        ]}
      >
        <Text style={styles.merchant}>
          {receipt.merchant.name ?? 'Fatura sem nome'}
        </Text>
        <Text style={styles.date}>
          {receipt.document.date ?? receipt.created_at.slice(0, 10)}
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryChips}
        >
          {MACRO_CATEGORIES.map((c) => {
            const active = receipt.category === c;
            return (
              <Pressable
                key={c}
                style={[styles.chip, active ? styles.chipActive : null]}
                onPress={() => {
                  if (active) return;
                  updateReceipt(receipt.id, { category: c as MacroCategory })
                    .then(setReceipt)
                    .catch(() =>
                      Alert.alert(
                        'Erro',
                        'Não foi possível alterar a categoria.',
                      ),
                    );
                }}
              >
                <Text
                  style={[
                    styles.chipLabel,
                    active ? styles.chipLabelActive : null,
                  ]}
                >
                  {categoryLabel(c)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {receipt.warnings.length > 0 ? (
          <View style={styles.warningBox}>
            {receipt.warnings.map((w, i) => (
              <Text key={i} style={styles.warningText}>
                ⚠️ {w}
              </Text>
            ))}
          </View>
        ) : null}

        {drafts.map((item) => (
          <View
            key={item.key}
            style={[styles.itemCard, item.suspect ? styles.itemSuspect : null]}
          >
            <View style={styles.itemHeader}>
              <TextInput
                style={styles.descriptionInput}
                value={item.description}
                placeholder="Descrição"
                placeholderTextColor={colors.textMuted}
                onChangeText={(t) => setDraft(item.key, { description: t })}
              />
              <Pressable
                onPress={() => removeDraft(item.key)}
                hitSlop={8}
                style={styles.deleteButton}
              >
                <Text style={styles.deleteLabel}>✕</Text>
              </Pressable>
            </View>
            <View style={styles.itemFields}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Qtd.</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={item.quantityText}
                  keyboardType="decimal-pad"
                  onChangeText={(t) => setDraft(item.key, { quantityText: t })}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Preço un. (€)</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={item.unitPriceText}
                  keyboardType="decimal-pad"
                  onChangeText={(t) => setDraft(item.key, { unitPriceText: t })}
                />
              </View>
              <View style={[styles.field, styles.fieldTotal]}>
                <Text style={styles.fieldLabel}>Total</Text>
                <Text style={styles.lineTotal}>
                  {formatCents(draftLineTotalCents(item))}
                </Text>
              </View>
            </View>
            {item.suspect ? (
              <Text style={styles.suspectLabel}>
                Linha suspeita — confirma os valores.
              </Text>
            ) : null}
          </View>
        ))}

        <Pressable style={styles.addButton} onPress={addDraft}>
          <Text style={styles.addLabel}>+ Adicionar item</Text>
        </Pressable>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total dos itens</Text>
            <Text style={styles.totalValue}>
              {formatCents(detectedTotalCents)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total na fatura</Text>
            <Text style={styles.totalValue}>
              {formatCents(invoiceTotalCents)}
            </Text>
          </View>
          {totalsMismatch ? (
            <Text style={styles.mismatch}>
              Diferença de {formatCents(Math.abs(differenceCents))} — confirma
              os itens.
            </Text>
          ) : null}
        </View>
      </ScrollView>

      <Pressable
        style={[
          styles.confirmButton,
          { bottom: 16 + insets.bottom },
          saving ? styles.confirmDisabled : null,
        ]}
        onPress={confirm}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={colors.onAccent} />
        ) : (
          <Text style={styles.confirmLabel}>Confirmar</Text>
        )}
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  scroll: { padding: 16 },
  merchant: { fontSize: 22, fontWeight: '700', color: colors.text },
  date: { color: colors.textMuted, marginTop: 2, marginBottom: 12 },
  categoryChips: { flexGrow: 0, marginBottom: 12 },
  chip: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.chip,
    marginRight: 6,
  },
  chipActive: { backgroundColor: colors.accent },
  chipLabel: { fontSize: 13, color: colors.textMuted },
  chipLabelActive: { color: colors.onAccent, fontWeight: '700' },
  warningBox: {
    backgroundColor: colors.warningBg,
    borderRadius: radius.sm + 2,
    padding: 12,
    marginBottom: 12,
  },
  warningText: { color: colors.warning, fontSize: 13, marginVertical: 1 },
  itemCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 10,
  },
  itemSuspect: {
    backgroundColor: colors.warningBg,
    borderColor: colors.warning,
    borderWidth: 1,
  },
  itemHeader: { flexDirection: 'row', alignItems: 'center' },
  descriptionInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 4,
    color: colors.text,
  },
  deleteButton: { marginLeft: 8, padding: 4 },
  deleteLabel: { color: colors.danger, fontSize: 16 },
  itemFields: { flexDirection: 'row', marginTop: 8 },
  field: { flex: 1, marginRight: 10 },
  fieldTotal: { marginRight: 0, alignItems: 'flex-end' },
  fieldLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 2 },
  fieldInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 15,
    backgroundColor: colors.cardAlt,
    color: colors.text,
  },
  lineTotal: {
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 6,
    color: colors.text,
  },
  suspectLabel: { color: colors.warning, fontSize: 12, marginTop: 6 },
  addButton: { alignItems: 'center', paddingVertical: 12 },
  addLabel: { color: colors.accent, fontSize: 16, fontWeight: '600' },
  totals: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    marginTop: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  totalLabel: { fontSize: 15, color: colors.textMuted },
  totalValue: { fontSize: 15, fontWeight: '700', color: colors.text },
  mismatch: { color: colors.danger, marginTop: 8, fontSize: 13 },
  confirmButton: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmDisabled: { opacity: 0.6 },
  confirmLabel: { color: colors.onAccent, fontSize: 17, fontWeight: '700' },
});
