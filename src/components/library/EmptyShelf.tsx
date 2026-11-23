import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '@/constants/theme';

const SPINES = [
  { h: 92, c: '#7B3F2A' },
  { h: 108, c: '#2F4F4F' },
  { h: 84, c: '#8A5A2B' },
  { h: 100, c: '#4A3B6B' },
];

export function EmptyShelf() {
  return (
    <View style={styles.wrap}>
      <View style={styles.books}>
        {SPINES.map((s, i) => (
          <View key={i} style={[styles.spine, { height: s.h, backgroundColor: s.c }]}>
            <View style={styles.band} />
            <View style={[styles.band, { marginTop: 'auto', marginBottom: 10 }]} />
          </View>
        ))}
        <View style={[styles.spine, styles.leaning]} />
      </View>
      <View style={styles.plank} />
      <Text style={styles.title}>Your shelf is empty</Text>
      <Text style={styles.body}>
        Tap Import PDF to add your first book. Books are saved on this device and work fully offline.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, paddingBottom: 120 },
  books: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  spine: { width: 22, borderRadius: 2, paddingTop: 10, elevation: 2 },
  band: { height: 2, marginHorizontal: 3, backgroundColor: 'rgba(240,200,140,0.6)' },
  leaning: { height: 96, backgroundColor: '#5E2B3B', transform: [{ rotate: '14deg' }], marginLeft: 8, marginBottom: 2 },
  plank: { width: 200, height: 10, backgroundColor: '#C9A97C', borderBottomWidth: 3, borderBottomColor: '#A5814F', borderRadius: 2 },
  title: { marginTop: spacing.lg, fontSize: 20, fontWeight: '700', color: colors.text, fontFamily: 'serif' },
  body: { marginTop: spacing.sm, fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
});