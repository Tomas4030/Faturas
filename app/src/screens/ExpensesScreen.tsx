import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { categoryLabel, formatCents, listReceipts, ReceiptDto } from '../api';
import { colors, radius } from '../theme';
import type { RootStackParamList } from '../navigation';

const STATUS_LABEL: Record<ReceiptDto['status'], string> = {
  processing: 'A processar…',
  needs_review: 'Por rever',
  ready: 'Concluída',
  failed: 'Falhou',
};

export function ExpensesScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [receipts, setReceipts] = useState<ReceiptDto[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    listReceipts()
      .then(setReceipts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const openReceipt = useCallback(
    (item: ReceiptDto) => {
      if (item.status === 'processing') {
        navigation.navigate('Processing', { receiptId: item.id });
      } else {
        navigation.navigate('Review', { receiptId: item.id });
      }
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: ReceiptDto }) => (
      <Pressable style={styles.card} onPress={() => openReceipt(item)}>
        <View style={styles.cardRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.merchant.name ?? 'Fatura sem nome'}
          </Text>
          <Text style={styles.cardTotal}>
            {formatCents(item.totals.total_cents)}
          </Text>
        </View>
        <View style={styles.cardRow}>
          <Text style={styles.cardSubtitle}>
            {item.document.date ?? item.created_at.slice(0, 10)}
            {'  ·  '}
            {categoryLabel(item.category)}
          </Text>
          <Text
            style={[
              styles.cardStatus,
              item.status === 'failed' ? styles.statusFailed : null,
              item.status === 'needs_review' ? styles.statusReview : null,
            ]}
          >
            {STATUS_LABEL[item.status]}
          </Text>
        </View>
      </Pressable>
    ),
    [openReceipt],
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={receipts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshing={loading}
        onRefresh={refresh}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: 24 + insets.bottom },
        ]}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Ainda não digitalizaste nenhuma fatura.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16 },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 48,
    fontSize: 15,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
    color: colors.text,
  },
  cardTotal: { fontSize: 16, fontWeight: '700', color: colors.text },
  cardSubtitle: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
  cardStatus: { marginTop: 4, fontSize: 13, color: colors.success },
  statusFailed: { color: colors.danger },
  statusReview: { color: colors.warning },
});
