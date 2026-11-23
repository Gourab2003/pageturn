import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReaderTheme } from '@/constants/theme';

interface Props {
  page: number;
  totalPages: number | null;
  theme: ReaderTheme;
  onPrev: () => void;
  onNext: () => void;
}

export function ReaderBottomBar({ page, totalPages, theme, onPrev, onNext }: Props) {
  const insets = useSafeAreaInsets();
  const pct = totalPages ? Math.round((page / totalPages) * 100) : 0;
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + 12, backgroundColor: theme.chrome }]}>
      <Pressable onPress={onPrev} hitSlop={12} style={styles.btn} disabled={page <= 1} accessibilityLabel="Previous page">
        <Ionicons name="chevron-back" size={22} color={theme.text} style={{ opacity: page <= 1 ? 0.3 : 1 }} />
      </Pressable>
      <View style={styles.center}>
        <Text style={[styles.page, { color: theme.text }]}>
          {totalPages ? `Page ${page} of ${totalPages}` : `Page ${page}`}
        </Text>
        {totalPages ? <Text style={[styles.pct, { color: theme.text }]}>{pct}% read</Text> : null}
      </View>
      <Pressable
        onPress={onNext}
        hitSlop={12}
        style={styles.btn}
        disabled={!!totalPages && page >= totalPages}
        accessibilityLabel="Next page"
      >
        <Ionicons
          name="chevron-forward"
          size={22}
          color={theme.text}
          style={{ opacity: totalPages && page >= totalPages ? 0.3 : 1 }}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: -2 },
  },
  btn: { padding: 8 },
  center: { flex: 1, alignItems: 'center' },
  page: { fontSize: 14, fontWeight: '600' },
  pct: { fontSize: 11, opacity: 0.65, marginTop: 2 },
});
