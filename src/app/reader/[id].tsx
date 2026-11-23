import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Animated, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLibrary } from '@/hooks/useLibrary';
import { useReaderSettings } from '@/hooks/useReaderSettings';
import { readerThemes } from '@/constants/theme';
import type { ReaderAppearance } from '@/reader-engine/protocol';
import { PdfFlipView, type PdfFlipViewHandle } from '@/components/reader/PdfFlipView';
import { ReaderTopBar } from '@/components/reader/ReaderTopBar';
import { ReaderBottomBar } from '@/components/reader/ReaderBottomBar';
import { ReaderSettingsSheet } from '@/components/reader/ReaderSettingsSheet';

type Status = 'loading' | 'ready' | 'error';

export default function ReaderScreen() {
  useKeepAwake(); // screen stays on while reading

  const { id } = useLocalSearchParams<{ id: string }>();
  const { ready: libraryReady, getBook, updateBook } = useLibrary();
  const book = id ? getBook(id) : undefined;
  const { settings, loaded: settingsLoaded, update: updateSettings } = useReaderSettings();
  const theme = readerThemes[settings.theme];
  const insets = useSafeAreaInsets();

  const flipRef = useRef<PdfFlipViewHandle>(null);
  const startPageRef = useRef<number | null>(null);
  if (startPageRef.current === null && book) startPageRef.current = book.lastPage || 1;

  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [page, setPage] = useState(book?.lastPage ?? 1);
  const [totalPages, setTotalPages] = useState<number | null>(book?.totalPages ?? null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Fade for the top/bottom bars
  const controlsAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(controlsAnim, { toValue: controlsVisible ? 1 : 0, duration: 180, useNativeDriver: true }).start();
    if (!controlsVisible) setSettingsOpen(false);
  }, [controlsVisible, controlsAnim]);

  // Mark as opened → moves it to the front of the shelf
  useEffect(() => {
    if (id) updateBook(id, { lastOpenedAt: Date.now() });
  }, [id, updateBook]);

  // Hide the controls shortly after the book opens, for immersive reading
  useEffect(() => {
    if (status !== 'ready') return;
    const t = setTimeout(() => setControlsVisible(false), 2200);
    return () => clearTimeout(t);
  }, [status]);

  const appearance = useMemo<ReaderAppearance>(
    () => ({
      name: theme.name,
      background: theme.background,
      paper: theme.paper,
      text: theme.text,
      pageFilter: theme.pageFilter,
      pageBlend: theme.pageBlend,
      crease: theme.crease,
      brightness: settings.brightness,
      contrast: settings.contrast,
    }),
    [theme, settings.brightness, settings.contrast],
  );

  const bookId = book?.id;
  const knownTotal = book?.totalPages;
  const handleLoaded = useCallback((total: number, p: number) => {
    setTotalPages(total);
    setPage(p);
    setStatus('ready');
    if (bookId && knownTotal !== total) updateBook(bookId, { totalPages: total });
  }, [bookId, knownTotal, updateBook]);

  // Phase 4 will auto-save this page number to the library.
  const handlePageChange = useCallback((p: number) => setPage(p), []);
  const handleToggleControls = useCallback(() => setControlsVisible((v) => !v), []);
  const handleError = useCallback((message: string) => {
    setErrorMessage(message);
    setStatus('error');
    setControlsVisible(true);
  }, []);

  // ── Not found / still loading library ──
  if (!libraryReady || !settingsLoaded) {
    return <View style={[styles.fill, styles.center, { backgroundColor: theme.background }]}><ActivityIndicator color={theme.accent} /></View>;
  }
  if (!book) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: theme.paper }]}>
        <Text style={[styles.msgTitle, { color: theme.text }]}>Book not found</Text>
        <Pressable onPress={() => router.back()}><Text style={[styles.link, { color: theme.accent }]}>← Back to library</Text></Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: theme.background }]}>
      <StatusBar hidden={!controlsVisible} style={theme.statusBar} animated />
      <NavigationBar hidden={!controlsVisible} style={theme.statusBar === 'light' ? 'light' : 'dark'} />

      {status !== 'error' && (
        <PdfFlipView
          ref={flipRef}
          fileName={book.fileName}
          startPage={startPageRef.current ?? 1}
          appearance={appearance}
          onLoaded={handleLoaded}
          onPageChange={handlePageChange}
          onToggleControls={handleToggleControls}
          onError={handleError}
        />
      )}

      {status === 'loading' && (
        <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Opening book…</Text>
        </View>
      )}

      {status === 'error' && (
        <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: theme.paper, padding: 32 }]}>
          <Text style={[styles.msgTitle, { color: theme.text }]}>Can't open this book</Text>
          <Text style={[styles.msgBody, { color: theme.text }]}>{errorMessage}</Text>
          <Pressable onPress={() => router.back()}><Text style={[styles.link, { color: theme.accent }]}>← Back to library</Text></Pressable>
        </View>
      )}

      {status === 'ready' && (
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: controlsAnim }]}
          pointerEvents={controlsVisible ? 'box-none' : 'none'}
        >
          {settingsOpen && (
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setSettingsOpen(false)} accessibilityLabel="Close settings" />
          )}
          <ReaderTopBar
            title={book.title}
            theme={theme}
            onBack={() => router.back()}
            onOpenSettings={() => setSettingsOpen((v) => !v)}
            settingsOpen={settingsOpen}
          />
          {settingsOpen && (
            <ReaderSettingsSheet
              settings={settings}
              theme={theme}
              bottomOffset={insets.bottom + 80}
              onChange={updateSettings}
            />
          )}
          <ReaderBottomBar
            page={page}
            totalPages={totalPages}
            theme={theme}
            onPrev={() => flipRef.current?.prev()}
            onNext={() => flipRef.current?.next()}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 14, fontSize: 15, fontFamily: 'serif', opacity: 0.8 },
  msgTitle: { fontSize: 22, fontFamily: 'serif', fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  msgBody: { fontSize: 14, textAlign: 'center', opacity: 0.8, lineHeight: 20 },
  link: { fontSize: 16, marginTop: 24, fontWeight: '600' },
});
