import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, radius } from '../theme';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const SLIDES = [
  { emoji: '📷', title: 'Fotografa a fatura', desc: 'Aponta a câmara e a IA extrai tudo automaticamente.' },
  { emoji: '✅', title: 'Revê e confirma', desc: 'Corrige o que for preciso. Tu és sempre a autoridade final.' },
  { emoji: '📊', title: 'Organiza tudo', desc: 'Dashboard, categorias, fornecedores e relatórios — tudo num sítio.' },
];

export function OnboardingScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const slide = SLIDES[page];
  const isLast = page === SLIDES.length - 1;

  return (
    <View style={[styles.container, { paddingTop: 60 + insets.top, paddingBottom: 32 + insets.bottom }]}>
      <View style={styles.content}>
        <Text style={styles.emoji}>{slide.emoji}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.desc}>{slide.desc}</Text>
      </View>

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === page ? styles.dotActive : null]} />
        ))}
      </View>

      <Pressable
        style={styles.btn}
        onPress={() => {
          if (isLast) {
            navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
          } else {
            setPage(page + 1);
          }
        }}
      >
        <Text style={styles.btnText}>{isLast ? 'Começar' : 'Seguinte'}</Text>
      </Pressable>

      {!isLast ? (
        <Pressable
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] })}
        >
          <Text style={styles.skip}>Saltar</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'space-between', padding: 24 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 64, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center' },
  desc: { fontSize: 16, color: colors.textMuted, textAlign: 'center', marginTop: 10, lineHeight: 22, paddingHorizontal: 16 },
  dots: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.accent, width: 20 },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
  },
  btnText: { color: colors.onAccent, fontSize: 17, fontWeight: '700' },
  skip: { color: colors.textMuted, marginTop: 12, fontSize: 15 },
});
