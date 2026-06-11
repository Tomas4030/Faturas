import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  categoryLabel,
  deleteReceipt,
  formatCents,
  getSupplier,
  renameSupplier,
  SupplierDetailDto,
} from '../api';
import { colors, radius } from '../theme';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'SupplierDetail'>;

export function SupplierDetailScreen({ navigation, route }: Props) {
  const { supplierId } = route.params;
  const [supplier, setSupplier] = useState<SupplierDetailDto | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');

  const loadSupplier = useCallback(() => {
    getSupplier(supplierId)
      .then((s) => {
        setSupplier(s);
        navigation.setOptions({ title: s.name });
      })
      .catch(() => {});
  }, [navigation, supplierId]);

  useFocusEffect(
    useCallback(() => {
      loadSupplier();
    }, [loadSupplier]),
  );

  const startEditing = () => {
    setEditName(supplier?.name ?? '');
    setEditing(true);
  };

  const saveName = () => {
    if (!editName.trim()) return;
    renameSupplier(supplierId, editName.trim())
      .then(() => {
        setEditing(false);
        loadSupplier();
      })
      .catch(() => Alert.alert('Erro', 'Não foi possível renomear.'));
  };

  const removeReceipt = useCallback(
    (receiptId: string) => {
      Alert.alert('Remover fatura', 'Tens a certeza?', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            deleteReceipt(receiptId)
              .then(loadSupplier)
              .catch(() => Alert.alert('Erro', 'Não foi possível remover.'));
          },
        },
      ]);
    },
    [loadSupplier],
  );

  if (supplier == null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.total}>{formatCents(supplier.total_cents)}</Text>
        <Text style={styles.headerSub}>
          {categoryLabel(supplier.category)}
          {supplier.nif ? `  ·  NIF ${supplier.nif}` : ''}
        </Text>
        {editing ? (
          <View style={styles.editRow}>
            <TextInput
              style={styles.editInput}
              value={editName}
              onChangeText={setEditName}
              autoFocus
            />
            <Pressable style={styles.saveBtn} onPress={saveName}>
              <Text style={styles.saveBtnLabel}>Guardar</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.editBtn} onPress={startEditing}>
            <Text style={styles.editBtnLabel}>Editar nome</Text>
          </Pressable>
        )}
      </View>
      <FlatList
        data={supplier.receipts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate('Review', { receiptId: item.id })}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.rowDate}>{item.date}</Text>
              <Text style={styles.rowCategory}>
                {categoryLabel(item.category)}
              </Text>
            </View>
            <Text style={styles.rowTotal}>{formatCents(item.total_cents)}</Text>
            <Pressable
              onPress={() => removeReceipt(item.id)}
              hitSlop={8}
              style={styles.deleteBtn}
            >
              <Text style={styles.deleteBtnLabel}>✕</Text>
            </Pressable>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>Sem faturas deste fornecedor.</Text>
        }
      />
    </View>
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
  header: {
    backgroundColor: colors.card,
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  total: { fontSize: 30, fontWeight: '800', color: colors.text },
  headerSub: { color: colors.textMuted, marginTop: 4 },
  list: { padding: 16 },
  row: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowDate: { fontSize: 15, fontWeight: '600', color: colors.text },
  rowCategory: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  rowTotal: { fontSize: 16, fontWeight: '700', color: colors.text },
  deleteBtn: { marginLeft: 12, padding: 4 },
  deleteBtnLabel: { color: colors.danger, fontSize: 16 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 32 },
  editRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  editInput: {
    flex: 1,
    backgroundColor: colors.cardAlt,
    color: colors.text,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
  },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  saveBtnLabel: { color: colors.onAccent, fontWeight: '700', fontSize: 14 },
  editBtn: { marginTop: 10 },
  editBtnLabel: { color: colors.accent, fontWeight: '600', fontSize: 14 },
});
