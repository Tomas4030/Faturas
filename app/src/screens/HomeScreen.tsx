import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { formatCents, listReceipts, ReceiptDto, uploadReceipt } from '../api';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const STATUS_LABEL: Record<ReceiptDto['status'], string> = {
  processing: 'A processar…',
  needs_review: 'Por rever',
  ready: 'Concluída',
  failed: 'Falhou',
};

export function HomeScreen({ navigation }: Props) {
  const [receipts, setReceipts] = useState<ReceiptDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    listReceipts()
      .then(setReceipts)
      .catch(() => {
        // API offline: mantém lista anterior
      })
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const scan = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    let result: ImagePicker.ImagePickerResult;
    if (permission.granted) {
      result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.7,
        mediaTypes: 'images',
      });
    }
    if (result.canceled || !result.assets[0]) return;
    setUploading(true);
    try {
      const { receipt_id } = await uploadReceipt(result.assets[0].uri);
      navigation.navigate('Processing', { receiptId: receipt_id });
    } catch (error) {
      Alert.alert(
        'Erro no envio',
        'Não foi possível enviar a fatura. Confirma que a API está a correr e que estás na mesma rede Wi-Fi.',
      );
    } finally {
      setUploading(false);
    }
  }, [navigation]);

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
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Ainda não digitalizaste nenhuma fatura.
          </Text>
        }
      />
      <Pressable
        style={[styles.scanButton, uploading ? styles.scanDisabled : null]}
        onPress={scan}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.scanLabel}>📷  Digitalizar fatura</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f7' },
  list: { padding: 16, paddingBottom: 96 },
  empty: { textAlign: 'center', color: '#888', marginTop: 48, fontSize: 15 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: '600', flex: 1, marginRight: 8 },
  cardTotal: { fontSize: 16, fontWeight: '700' },
  cardSubtitle: { color: '#888', marginTop: 4, fontSize: 13 },
  cardStatus: { marginTop: 4, fontSize: 13, color: '#34a853' },
  statusFailed: { color: '#d93025' },
  statusReview: { color: '#f29900' },
  scanButton: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#1a73e8',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  scanDisabled: { opacity: 0.6 },
  scanLabel: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
