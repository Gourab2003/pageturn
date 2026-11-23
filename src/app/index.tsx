import { useMemo } from 'react';
import { View, Text, FlatList, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Book } from '@/types/book';
import { useLibrary } from '@/hooks/useLibrary';
import { colors, spacing } from '@/constants/theme';
import { formatBytes } from '@/utils/format';
import { BookGridItem } from '@/components/library/BookGridItem';
import { BookListItem } from '@/components/library/BookListItem';
import { ImportFab } from '@/components/library/ImportFab';
import { EmptyShelf } from '@/components/library/EmptyShelf';
import { ViewToggle } from '@/components/library/ViewToggle';

const GRID_COLUMNS = 3;
type GridCell = { key: string; book?: Book };

export default function LibraryScreen() {
  const { books, ready, importing, importBooks, deleteBook, viewMode, setViewMode } = useLibrary();
  const insets = useSafeAreaInsets();

  // Most recently read (or added) first
  const sorted = useMemo(
    () => [...books].sort((a, b) => (b.lastOpenedAt ?? b.addedAt) - (a.lastOpenedAt ?? a.addedAt)),
    [books],
  );

  // Pad the last grid row with empty slots so the wooden shelf runs edge to edge
  const gridCells = useMemo<GridCell[]>(() => {
    const cells: GridCell[] = sorted.map((b) => ({ key: b.id, book: b }));
    const remainder = cells.length % GRID_COLUMNS;
    if (remainder) for (let i = 0; i < GRID_COLUMNS - remainder; i++) cells.push({ key: `__empty-${i}` });
    return cells;
  }, [sorted]);

  const totalSize = useMemo(() => books.reduce((sum, b) => sum + b.sizeBytes, 0), [books]);

  const openBook = (book: Book) => router.push({ pathname: '/reader/[id]', params: { id: book.id } });

  const confirmDelete = (book: Book) =>
    Alert.alert('Delete this book?', `"${book.title}" and its reading progress will be removed from this device.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteBook(book.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        },
      },
    ]);

  const showMenu = (book: Book) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Alert.alert(book.title, formatBytes(book.sizeBytes), [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(book) },
      { text: 'Open', onPress: () => openBook(book) },
    ]);
  };

  const handleImport = async () => {
    try {
      const result = await importBooks();
      if (!result) return; // picker cancelled
      if (result.added.length) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      const problems: string[] = [];
      if (result.duplicates.length) problems.push(`Already in your library:\n• ${result.duplicates.join('\n• ')}`);
      if (result.failed.length) problems.push(`Couldn't import (not a readable PDF):\n• ${result.failed.join('\n• ')}`);
      if (problems.length) Alert.alert(result.added.length ? 'Some files were skipped' : 'Nothing imported', problems.join('\n\n'));
    } catch (error) {
      console.warn(error);
      Alert.alert('Import failed', 'Something went wrong while copying the file. Please try again.');
    }
  };

  const header = (
    <View style={styles.summary}>
      <Text style={styles.summaryTitle}>My Library</Text>
      <Text style={styles.summaryMeta}>
        {books.length} {books.length === 1 ? 'book' : 'books'} · {formatBytes(totalSize)} on device
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{ headerRight: () => (books.length ? <ViewToggle mode={viewMode} onChange={setViewMode} /> : null) }}
      />

      {!ready ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : books.length === 0 ? (
        <EmptyShelf />
      ) : viewMode === 'grid' ? (
        <FlatList
          key="grid"
          data={gridCells}
          keyExtractor={(c) => c.key}
          numColumns={GRID_COLUMNS}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingHorizontal: spacing.sm, paddingBottom: insets.bottom + 110 }}
          renderItem={({ item }) =>
            item.book ? (
              <BookGridItem book={item.book} onPress={() => openBook(item.book!)} onMenu={() => showMenu(item.book!)} />
            ) : (
              <BookGridItem />
            )
          }
        />
      ) : (
        <FlatList
          key="list"
          data={sorted}
          keyExtractor={(b) => b.id}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
          renderItem={({ item }) => (
            <BookListItem book={item} onPress={() => openBook(item)} onMenu={() => showMenu(item)} />
          )}
        />
      )}

      <ImportFab onPress={handleImport} busy={importing} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  summary: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.md },
  summaryTitle: { fontSize: 28, fontWeight: '700', color: colors.text, fontFamily: 'serif' },
  summaryMeta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
});