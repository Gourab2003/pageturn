import type { Book } from '@/types/book';

export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value >= 10 || i === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[i]}`;
}

export function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function titleFromFileName(name: string): string {
  const cleaned = name
    .replace(/\.pdf$/i, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'Untitled';
}

/** 0 → 1 reading progress. 0 until the reader knows the page count. */
export function progressOf(book: Book): number {
  if (!book.totalPages || book.totalPages <= 0) return 0;
  return Math.min(1, Math.max(0, book.lastPage / book.totalPages));
}

const COVER_COLORS = ['#7B3F2A', '#2F4F4F', '#4A3B6B', '#6B4E2E', '#1F4E5F', '#5E2B3B', '#3E5C3A', '#8A5A2B'];

/** Same title → same cover colour, every time. */
export function coverColorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return COVER_COLORS[Math.abs(hash) % COVER_COLORS.length];
}
