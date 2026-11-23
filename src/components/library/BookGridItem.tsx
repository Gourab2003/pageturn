import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Book } from '@/types/book';
import { colors } from '@/constants/theme';
import { formatBytes, progressOf } from '@/utils/format';
import { BookCover } from './BookCover';
import { ProgressBar } from './ProgressBar';

interface Props {
  book?: Book; // undefined = empty shelf slot (keeps the shelf plank continuous)
  onPress?: () => void;
  onMenu?: () => void;
}

export function BookGridItem({ book, onPress, onMenu }: Props) {
  if (!book) {
    return (
      <View style={styles.cell}>
        <View style={styles.emptySlot} />
        <View style={styles.plank} />
        <View style={styles.info} />
      </View>
    );
  }

  const opened = book.lastOpenedAt !== null;
  const pct = Math.round(progressOf(book) * 100);

  return (
    <Pressable
      style={({ pressed }) => [styles.cell, pressed && styles.pressed]}
      onPress={onPress}
      onLongPress={onMenu}
      delayLongPress={350}
    >
      <BookCover title={book.title} />
      <View style={styles.plank} />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{book.title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta} numberOfLines={1}>
            {opened ? `${pct}%` : 'New'} · {formatBytes(book.sizeBytes)}
          </Text>
          <Pressable onPress={onMenu} hitSlop={10}>
            <Ionicons name="ellipsis-vertical" size={14} color={colors.textMuted} />
          </Pressable>
        </View>
        {opened && <ProgressBar value={progressOf(book)} height={3} />}
      </View>
    </Pressable>
  );
}

const PAD = 10;

const styles = StyleSheet.create({
  cell: { flex: 1, paddingHorizontal: PAD, paddingTop: 18 },
  pressed: { opacity: 0.75 },
  emptySlot: { width: '100%', aspectRatio: 2 / 3 },
  plank: {
    height: 10,
    marginHorizontal: -PAD, // stretch across the full cell so neighbouring planks join
    backgroundColor: '#C9A97C',
    borderBottomWidth: 3,
    borderBottomColor: '#A5814F',
    elevation: 2,
  },
  info: { paddingTop: 8, minHeight: 66, gap: 4 },
  title: { fontSize: 13, fontWeight: '600', color: colors.text, lineHeight: 17 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  meta: { fontSize: 11, color: colors.textMuted, flexShrink: 1 },
});
