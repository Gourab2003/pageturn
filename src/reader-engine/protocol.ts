import type { ReaderThemeName } from '@/constants/theme';

/** Everything the WebView needs to paint pages (sent on open and whenever settings change). */
export interface ReaderAppearance {
  name: ReaderThemeName;
  background: string;
  paper: string;
  text: string;
  pageFilter: string;
  pageBlend: string;
  crease: string;
  brightness: number;
  contrast: number;
}

/** React Native → WebView */
export type ToEngine =
  | { type: 'open'; size: number; startPage: number; appearance: ReaderAppearance }
  | { type: 'range'; id: number; data: string }
  | { type: 'rangeError'; id: number; message: string }
  | { type: 'goto'; page: number }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'appearance'; appearance: ReaderAppearance };

/** WebView → React Native */
export type FromEngine =
  | { type: 'ready'; pdfjsVersion: string }
  | { type: 'readRange'; id: number; begin: number; end: number }
  | { type: 'loaded'; totalPages: number; page: number }
  | { type: 'page'; page: number }
  | { type: 'toggleControls' }
  | { type: 'error'; message: string; fatal?: boolean; code?: string }
  | { type: 'log'; level: string; message: string };
