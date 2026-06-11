import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  categoryLabel,
  formatCents,
  listReceipts,
  MACRO_CATEGORIES,
  ReceiptDto,
  ReceiptListFilters,
} from '../api';
import { colors, radius } from '../theme';
import type { RootStackParamList } from '../navigation';

const STATUS_LABEL: Record<ReceiptDto['status'], string> = {
  processing: 'A processar…',
  needs_review: 'Por rever',
  ready: 'Concluída',
  failed: 'Falhou',
};

const STATUS_FILTERS: ReceiptDto['status'][] = [
  'needs_review',
  'ready',
  'processing',
  'failed',
];

type SortValue = NonNullable<ReceiptListFilters['sort']>;

const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: 'date_desc', label: 'Recentes' },
  { value: 'date_asc', label: 'Antigas' },
  { value: 'total_desc', label: 'Maior valor' },
  { value: 'total_asc', label: 'Menor valor' },
];

export function ExpensesScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [receipts, setReceipts] = useState<ReceiptDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | undefined>();
  const [status, setStatus] = useState<ReceiptDto['status'] | undefined>();
  const [sort, setSort] = useState<SortValue>('date_desc');

  const hasFilters = Boolean(query.trim() || category || status || sort !== 'date_desc');

  const refresh = useCallback(() => {
    setLoading(true);
    listReceipts({ q: query, category, status, sort })
      .then(setReceipts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [category, query, sort, status]);

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
      <View style={styles.filters}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Pesquisar fornecedor, NIF ou documento"
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContent}
        >
          <Pressable
            style={[styles.chip, category == null ? styles.chipActive : null]}
            onPress={() => setCategory(undefined)}
          >
            <Text
              style={[
                styles.chipLabel,
                category == null ? styles.chipLabelActive : null,
              ]}
            >
              Todas
            </Text>
          </Pressable>
          {MACRO_CATEGORIES.map((c) => (
            <Pressable
              key={c}
              style={[styles.chip, category === c ? styles.chipActive : null]}
              onPress={() => setCategory(category === c ? undefined : c)}
            >
              <Text
                style={[
                  styles.chipLabel,
                  category === c ? styles.chipLabelActive : null,
                ]}
              >
                {categoryLabel(c)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContent}
        >
          <Pressable
            style={[styles.chip, status == null ? styles.chipActive : null]}
            onPress={() => setStatus(undefined)}
          >
            <Text
              style={[
                styles.chipLabel,
                status == null ? styles.chipLabelActive : null,
              ]}
            >
              Todos estados
            </Text>
          </Pressable>
          {STATUS_FILTERS.map((s) => (
            <Pressable
              key={s}
              style={[styles.chip, status === s ? styles.chipActive : null]}
              onPress={() => setStatus(status === s ? undefined : s)}
            >
              <Text
                style={[
                  styles.chipLabel,
                  status === s ? styles.chipLabelActive : null,
                ]}
              >
                {STATUS_LABEL[s]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.sortRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContent}
          >
            {SORT_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                style={[styles.chip, sort === option.value ? styles.chipActive : null]}
                onPress={() => setSort(option.value)}
              >
                <Text
                  style={[
                    styles.chipLabel,
                    sort === option.value ? styles.chipLabelActive : null,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {hasFilters ? (
            <Pressable
              hitSlop={8}
              onPress={() => {
                setQuery('');
                setCategory(undefined);
                setStatus(undefined);
                setSort('date_desc');
              }}
            >
              <Text style={styles.clearFilters}>Limpar</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

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
            {hasFilters
              ? 'Sem faturas para estes filtros.'
              : 'Ainda não digitalizaste nenhuma fatura.'}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  filters: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  searchInput: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  chipsContent: { paddingRight: 16, paddingBottom: 8 },
  chip: {
    backgroundColor: colors.chip,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
  },
  chipActive: { backgroundColor: colors.accent },
  chipLabel: { color: colors.textMuted, fontSize: 13 },
  chipLabelActive: { color: colors.onAccent, fontWeight: '700' },
  sortRow: { flexDirection: 'row', alignItems: 'center' },
  clearFilters: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    paddingBottom: 8,
  },
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
