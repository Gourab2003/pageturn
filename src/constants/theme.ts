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
  background: string;  // around the page
  paper: string;       // page colour
  text: string;        // reader UI text / icons
  accent: string;
  chrome: string;      // top/bottom control bars
  statusBar: 'light' | 'dark';
  // How PDF pages are drawn onto the paper (CSS, inside the WebView):
  pageFilter: string;
  pageBlend: 'normal' | 'multiply' | 'screen';
  crease: string;      // gutter shadow colour
}

export const readerThemes: Record<ReaderThemeName, ReaderTheme> = {
  day: {
    name: 'day', label: 'Day',
    background: '#ECEAE6', paper: '#FFFFFF', text: '#1A1A1A', accent: '#B5562B',
    chrome: 'rgba(255,255,255,0.97)', statusBar: 'dark',
    pageFilter: 'none', pageBlend: 'normal', crease: 'rgba(0,0,0,0.10)',
  },
  sepia: {
    name: 'sepia', label: 'Sepia',
    background: '#E3D7BF', paper: '#F4ECD8', text: '#5B4636', accent: '#8B5A2B',
    chrome: 'rgba(244,236,216,0.97)', statusBar: 'dark',
    // multiply: white paper takes the sepia tone, black ink stays black
    pageFilter: 'none', pageBlend: 'multiply', crease: 'rgba(91,70,54,0.18)',
  },
  night: {
    name: 'night', label: 'Night',
    background: '#0E0E0E', paper: '#1C1C1C', text: '#E6E1D8', accent: '#D98A5F',
    chrome: 'rgba(24,24,24,0.97)', statusBar: 'light',
    // invert ink/paper, keep colours roughly right, soften the white text
    pageFilter: 'invert(1) hue-rotate(180deg) brightness(0.86)', pageBlend: 'screen', crease: 'rgba(0,0,0,0.45)',
  },
};
