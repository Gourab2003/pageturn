import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants/storage';
import type { Book, LibraryViewMode } from '@/types/book';

export async function loadLibrary(): Promise<Book[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.library);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Book[]) : [];
  } catch (error) {
    console.warn('[library] failed to load, starting empty', error);
    return [];
  }
}

export async function saveLibrary(books: Book[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.library, JSON.stringify(books));
}

export async function loadViewMode(): Promise<LibraryViewMode> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.libraryViewMode);
  return raw === 'list' ? 'list' : 'grid';
}

export async function saveViewMode(mode: LibraryViewMode): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.libraryViewMode, mode);
}
