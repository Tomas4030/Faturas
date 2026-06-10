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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { formatCents, getReceipt, ReceiptDto, updateItems } from '../api';
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
  return Math.round(textToNumber(item.quantityText) * textToCents(item.unitPriceText));
}

export function ReviewScreen({ navigation, route }: Props) {
  const { receiptId } = route.params;
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
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.merchant}>
          {receipt.merchant.name ?? 'Fatura sem nome'}
        </Text>
        <Text style={styles.date}>
          {receipt.document.date ?? receipt.created_at.slice(0, 10)}
        </Text>

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
        style={[styles.confirmButton, saving ? styles.confirmDisabled : null]}
        onPress={confirm}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.confirmLabel}>Confirmar</Text>
        )}
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f7' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, paddingBottom: 120 },
  merchant: { fontSize: 22, fontWeight: '700' },
  date: { color: '#888', marginTop: 2, marginBottom: 12 },
  warningBox: {
    backgroundColor: '#fef7e0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  warningText: { color: '#b06000', fontSize: 13, marginVertical: 1 },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  itemSuspect: { backgroundColor: '#fff8e1', borderColor: '#f29900', borderWidth: 1 },
  itemHeader: { flexDirection: 'row', alignItems: 'center' },
  descriptionInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 4,
  },
  deleteButton: { marginLeft: 8, padding: 4 },
  deleteLabel: { color: '#d93025', fontSize: 16 },
  itemFields: { flexDirection: 'row', marginTop: 8 },
  field: { flex: 1, marginRight: 10 },
  fieldTotal: { marginRight: 0, alignItems: 'flex-end' },
  fieldLabel: { fontSize: 12, color: '#888', marginBottom: 2 },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 15,
    backgroundColor: '#fafafa',
  },
  lineTotal: { fontSize: 16, fontWeight: '700', paddingVertical: 6 },
  suspectLabel: { color: '#b06000', fontSize: 12, marginTop: 6 },
  addButton: { alignItems: 'center', paddingVertical: 12 },
  addLabel: { color: '#1a73e8', fontSize: 16, fontWeight: '600' },
  totals: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  totalLabel: { fontSize: 15, color: '#555' },
  totalValue: { fontSize: 15, fontWeight: '700' },
  mismatch: { color: '#d93025', marginTop: 8, fontSize: 13 },
  confirmButton: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#188038',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmDisabled: { opacity: 0.6 },
  confirmLabel: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
