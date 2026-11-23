import type { ReaderThemeName } from '@/constants/theme';

export interface Bookmark {
  id: string;
  page: number;
  label?: string;
  createdAt: number;
}

export interface Book {
  id: string;
  title: string;
  originalName: string;      // file name as picked, e.g. "Atomic Habits.pdf" (used for duplicate checks)
  fileName: string;          // stored name inside documentDirectory/books/, e.g. "lq3k2-x8f1a2.pdf"
  sizeBytes: number;
  totalPages: number | null; // filled in by the reader once PDF.js has opened the file
  lastPage: number;          // 1-based
  addedAt: number;
  lastOpenedAt: number | null;
  bookmarks: Bookmark[];
}

export interface ReaderSettings {
  theme: ReaderThemeName;
  brightness: number; // 0.5 – 1.0
  contrast: number;   // 0.8 – 1.4
}

export type LibraryViewMode = 'grid' | 'list';