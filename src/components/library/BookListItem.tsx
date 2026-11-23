import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Book } from '@/types/book';
import { colors, radius, spacing } from '@/constants/theme';
import { formatBytes, progressOf } from '@/utils/format';
import { BookCover } from './BookCover';
import { ProgressBar } from './ProgressBar';

export function BookListItem({ book, onPress, onMenu }: { book: Book; onPress: () => void; onMenu: () => void }) {
  const opened = book.lastOpenedAt !== null;
  const pct = Math.round(progressOf(book) * 100);
  const pageInfo = opened && book.totalPages ? `Page ${book.lastPage} of ${book.totalPages}` : opened ? 'In progress' : 'Not started';

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={onPress}
      onLongPress={onMenu}
      delayLongPress={350}
    >
      <BookCover title={book.title} compact />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{book.title}</Text>
        <Text style={styles.meta}>{formatBytes(book.sizeBytes)} · {pageInfo}</Text>
        {opened && (
          <View style={styles.progressRow}>
            <View style={{ flex: 1 }}><ProgressBar value={progressOf(book)} /></View>
            <Text style={styles.pct}>{pct}%</Text>
          </View>
        )}
      </View>
      <Pressable onPress={onMenu} hitSlop={12} style={styles.menu}>
        <Ionicons name="ellipsis-vertical" size={18} color={colors.textMuted} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm + 2,
    padding: spacing.md - 4,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.75 },
  body: { flex: 1, gap: 4 },
  title: { fontSize: 15, fontWeight: '600', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  pct: { fontSize: 11, color: colors.textMuted, width: 34, textAlign: 'right' },
  menu: { padding: 4 },
});