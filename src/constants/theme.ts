export const colors = {
  background: '#FAF6EF',   // warm off-white "library wall"
  surface: '#FFFFFF',
  shelf: '#E9DFCF',
  text: '#2B2118',
  textMuted: '#7A6A58',
  primary: '#B5562B',      // leather-binding rust
  primaryText: '#FFFFFF',
  border: '#E4D8C6',
  danger: '#C0392B',
  progressTrack: '#EADFCF',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 6, md: 12, lg: 20, pill: 999 };

export type ReaderThemeName = 'day' | 'sepia' | 'night';

export interface ReaderTheme {
  name: ReaderThemeName;
  label: string;
  background: string; // area around the page
  paper: string;      // page colour
  text: string;       // UI text on top of the reader
  accent: string;
  pdfFilter: string;  // CSS filter applied to rendered PDF pages
}

export const readerThemes: Record<ReaderThemeName, ReaderTheme> = {
  day: {
    name: 'day', label: 'Day',
    background: '#EDEDED', paper: '#FFFFFF', text: '#1A1A1A', accent: '#B5562B',
    pdfFilter: 'none',
  },
  sepia: {
    name: 'sepia', label: 'Sepia',
    background: '#E3D7BF', paper: '#F4ECD8', text: '#5B4636', accent: '#8B5A2B',
    pdfFilter: 'sepia(0.35) brightness(0.97)',
  },
  night: {
    name: 'night', label: 'Night',
    background: '#0E0E0E', paper: '#1C1C1C', text: '#E6E1D8', accent: '#D98A5F',
    pdfFilter: 'invert(0.9) hue-rotate(180deg)',
  },
};