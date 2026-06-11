import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  categoryLabel,
  formatCents,
  listSuppliers,
  SupplierSummaryDto,
} from '../api';
import { colors, radius } from '../theme';
import type { RootStackParamList } from '../navigation';

export function SuppliersScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [suppliers, setSuppliers] = useState<SupplierSummaryDto[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    listSuppliers()
      .then(setSuppliers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const renderItem = useCallback(
    ({ item }: { item: SupplierSummaryDto }) => (
      <Pressable
        style={styles.card}
        onPress={() =>
          navigation.navigate('SupplierDetail', { supplierId: item.id })
        }
      >
        <View style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.total}>{formatCents(item.total_cents)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.subtitle}>
            {categoryLabel(item.category)}
            {'  ·  '}
            {item.receipt_count}{' '}
            {item.receipt_count === 1 ? 'fatura' : 'faturas'}
          </Text>
          <Text style={styles.subtitle}>
            {item.last_receipt_at ? item.last_receipt_at.slice(0, 10) : ''}
          </Text>
        </View>
      </Pressable>
    ),
    [navigation],
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={suppliers}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshing={loading}
        onRefresh={refresh}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Os fornecedores aparecem aqui automaticamente quando digitalizas
            faturas.
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
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
    color: colors.text,
  },
  total: { fontSize: 16, fontWeight: '700', color: colors.text },
  subtitle: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
});
