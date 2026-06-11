import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
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
      // Fotos de câmara podem ter 10-20MB; reduz para upload rápido e
      // menos tokens na IA (largura máx. 1600px chega para ler recibos).
      const resized = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 1600 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
      );
      const { receipt_id } = await uploadReceipt(resized.uri);
      navigation.navigate('Processing', { receiptId: receipt_id });
    } catch (error) {
      Alert.alert(
        'Erro no envio',
        `Não foi possível enviar a fatura.\n\n${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setUploading(false);
    }
  }, [navigation]);

  return { scan, uploading };
}
