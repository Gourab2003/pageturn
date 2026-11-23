import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import type { Book, LibraryViewMode } from '@/types/book';
import { loadLibrary, saveLibrary, loadViewMode, saveViewMode } from '@/storage/libraryStore';
import { bookFileExists, copyPdfIntoLibrary, deleteBookFile } from '@/storage/fileStore';
import { makeId, titleFromFileName } from '@/utils/format';

export interface ImportResult {
  added: Book[];
  duplicates: string[];
  failed: string[];
}

interface LibraryContextValue {
  books: Book[];
  ready: boolean;
  importing: boolean;
  viewMode: LibraryViewMode;
  setViewMode: (mode: LibraryViewMode) => void;
  importBooks: () => Promise<ImportResult | null>;
  deleteBook: (id: string) => Promise<void>;
  updateBook: (id: string, patch: Partial<Omit<Book, 'id'>>) => Promise<void>;
  getBook: (id: string) => Book | undefined;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [ready, setReady] = useState(false);
  const [importing, setImporting] = useState(false);
  const [viewMode, setViewModeState] = useState<LibraryViewMode>('grid');

  // Always-current copy so async actions never work on stale state.
  const booksRef = useRef<Book[]>([]);

  const commit = useCallback(async (next: Book[]) => {
    booksRef.current = next;
    setBooks(next);
    try {
      await saveLibrary(next);
    } catch (error) {
      console.warn('[library] failed to save', error);
    }
  }, []);

  // Initial load: read metadata, drop entries whose PDF file has gone missing.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [stored, mode] = await Promise.all([loadLibrary(), loadViewMode()]);
      const present = stored.filter((b) => bookFileExists(b.fileName));
      if (cancelled) return;
      booksRef.current = present;
      setBooks(present);
      setViewModeState(mode);
      setReady(true);
      if (present.length !== stored.length) saveLibrary(present).catch(() => {});
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setViewMode = useCallback((mode: LibraryViewMode) => {
    setViewModeState(mode);
    saveViewMode(mode).catch(() => {});
  }, []);

  const importBooks = useCallback(async (): Promise<ImportResult | null> => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      // false = give us Android's content:// URI and let expo-file-system copy it.
      // (true copies into a cache folder that Expo Go's sandbox blocks — "Missing 'READ' permission".)
      copyToCacheDirectory: false,
      multiple: true,
    });
    if (result.canceled || !result.assets?.length) return null;

    setImporting(true);
    const added: Book[] = [];
    const duplicates: string[] = [];
    const failed: string[] = [];

    try {
      for (const asset of result.assets) {
        const name = asset.name ?? 'Untitled.pdf';
        const isPdf = asset.mimeType === 'application/pdf' || /\.pdf$/i.test(name);
        if (!isPdf) {
          failed.push(name);
          continue;
        }

        const alreadyHave = [...booksRef.current, ...added].some(
          (b) => b.originalName === name && (!asset.size || b.sizeBytes === asset.size),
        );
        if (alreadyHave) {
          duplicates.push(name);
          continue;
        }

        try {
          const id = makeId();
          const { fileName, sizeBytes } = await copyPdfIntoLibrary(asset.uri, id);
          added.push({
            id,
            title: titleFromFileName(name),
            originalName: name,
            fileName,
            sizeBytes: sizeBytes || asset.size || 0,
            totalPages: null,
            lastPage: 1,
            addedAt: Date.now(),
            lastOpenedAt: null,
            bookmarks: [],
          });
        } catch (error) {
          console.warn('[library] import failed for', name, error);
          failed.push(name);
        }
      }

      if (added.length) await commit([...added, ...booksRef.current]);
    } finally {
      setImporting(false);
    }

    return { added, duplicates, failed };
  }, [commit]);

  const deleteBook = useCallback(async (id: string) => {
    const book = booksRef.current.find((b) => b.id === id);
    if (!book) return;
    try {
      deleteBookFile(book.fileName);
    } catch (error) {
      console.warn('[library] could not delete file', error);
    }
    await commit(booksRef.current.filter((b) => b.id !== id));
  }, [commit]);

  const updateBook = useCallback(async (id: string, patch: Partial<Omit<Book, 'id'>>) => {
    await commit(booksRef.current.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }, [commit]);

  const getBook = useCallback((id: string) => books.find((b) => b.id === id), [books]);

  const value = useMemo<LibraryContextValue>(
    () => ({ books, ready, importing, viewMode, setViewMode, importBooks, deleteBook, updateBook, getBook }),
    [books, ready, importing, viewMode, setViewMode, importBooks, deleteBook, updateBook, getBook],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used inside <LibraryProvider>');
  return ctx;
}
