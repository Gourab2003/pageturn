import { Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '@/constants/theme';

export function ImportFab({ onPress, busy }: { onPress: () => void; busy: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [styles.fab, { bottom: insets.bottom + 20 }, pressed && styles.pressed, busy && styles.busy]}
    >
      {busy ? <ActivityIndicator color={colors.primaryText} size="small" /> : <Ionicons name="add" size={22} color={colors.primaryText} />}
      <Text style={styles.label}>{busy ? 'Importing…' : 'Import PDF'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingLeft: 16,
    paddingRight: 20,
    borderRadius: radius.pill,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  pressed: { transform: [{ scale: 0.96 }] },
  busy: { opacity: 0.85 },
  label: { color: colors.primaryText, fontWeight: '700', fontSize: 15 },
});
