import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReaderTheme } from '@/constants/theme';

interface Props {
  title: string;
  theme: ReaderTheme;
  onBack: () => void;
  onOpenSettings: () => void;
  settingsOpen: boolean;
}

export function ReaderTopBar({ title, theme, onBack, onOpenSettings, settingsOpen }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 6, backgroundColor: theme.chrome }]}>
      <Pressable onPress={onBack} hitSlop={12} style={styles.iconBtn} accessibilityLabel="Back to library">
        <Ionicons name="chevron-back" size={24} color={theme.text} />
      </Pressable>
      <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{title}</Text>
      <Pressable
        onPress={onOpenSettings}
        hitSlop={12}
        style={[styles.aaBtn, settingsOpen && { backgroundColor: theme.accent + '22' }]}
        accessibilityLabel="Reading settings"
      >
        <Text style={[styles.aa, { color: theme.text }]}>Aa</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 10,
    gap: 6,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  iconBtn: { padding: 6 },
  title: { flex: 1, fontSize: 16, fontWeight: '600', fontFamily: 'serif' },
  aaBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  aa: { fontSize: 18, fontFamily: 'serif', fontWeight: '600' },
});
