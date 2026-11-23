import { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useLibrary } from '@/hooks/useLibrary';
import { getBookFileUri } from '@/storage/fileStore';
import { readerThemes } from '@/constants/theme';
import { formatBytes } from '@/utils/format';

// TEMPORARY placeholder — replaced by the real page-flip reader in Phase 3.
export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getBook, updateBook } = useLibrary();
  const book = id ? getBook(id) : undefined;
  const t = readerThemes.sepia;

  // Mark as opened (moves it to the front of the shelf)
  useEffect(() => {
    if (id) updateBook(id, { lastOpenedAt: Date.now() });
  }, [id, updateBook]);

  if (!book) {
    return (
      <View style={[styles.container, { backgroundColor: t.paper }]}>
        <Text style={[styles.title, { color: t.text }]}>Book not found</Text>
        <Pressable onPress={() => router.back()}><Text style={[styles.link, { color: t.accent }]}>← Back</Text></Pressable>
      </View>
    );
  }

  // Dev helper so you can see progress bars before the real reader exists
  const simulateReading = () => {
    const total = book.totalPages ?? 120;
    updateBook(book.id, { totalPages: total, lastPage: Math.min(total, book.lastPage + 17) });
  };

  return (
    <View style={[styles.container, { backgroundColor: t.paper }]}>
      <Text style={[styles.title, { color: t.text }]} numberOfLines={3}>{book.title}</Text>
      <Text style={[styles.small, { color: t.text }]}>{formatBytes(book.sizeBytes)}</Text>
      <Text style={[styles.small, { color: t.text }]}>
        Page {book.lastPage}{book.totalPages ? ` of ${book.totalPages}` : ''}
      </Text>
      <Text style={[styles.mono, { color: t.text }]} numberOfLines={3}>{getBookFileUri(book.fileName)}</Text>

      <Pressable style={[styles.button, { backgroundColor: t.accent }]} onPress={simulateReading}>
        <Text style={styles.buttonText}>Dev: simulate reading +17 pages</Text>
      </Pressable>
      <Pressable onPress={() => router.back()}>
        <Text style={[styles.link, { color: t.accent }]}>← Back to library</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  title: { fontSize: 24, fontFamily: 'serif', textAlign: 'center' },
  small: { fontSize: 14, opacity: 0.75 },
  mono: { fontSize: 10, fontFamily: 'monospace', opacity: 0.5, textAlign: 'center', marginTop: 8 },
  button: { marginTop: 20, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 999 },
  buttonText: { color: '#fff', fontWeight: '600' },
  link: { fontSize: 16, marginTop: 12, fontWeight: '600' },
});