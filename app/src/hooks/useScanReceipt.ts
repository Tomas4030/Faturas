import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { uploadReceipt } from '../api';
import type { RootStackParamList } from '../navigation';

/** Câmara (ou galeria) → upload → ecrã de processamento. */
export function useScanReceipt() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [uploading, setUploading] = useState(false);

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
    } catch {
      Alert.alert(
        'Erro no envio',
        'Não foi possível enviar a fatura. Confirma que a API está a correr e que estás na mesma rede Wi-Fi.',
      );
    } finally {
      setUploading(false);
    }
  }, [navigation]);

  return { scan, uploading };
}
