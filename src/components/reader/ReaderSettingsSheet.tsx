import { View, Text, Pressable, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { readerThemes, type ReaderTheme, type ReaderThemeName } from '@/constants/theme';
import type { ReaderSettings } from '@/types/book';

interface Props {
  settings: ReaderSettings;
  theme: ReaderTheme;
  bottomOffset: number;
  onChange: (patch: Partial<ReaderSettings>) => void;
}

const ORDER: ReaderThemeName[] = ['day', 'sepia', 'night'];
const round2 = (v: number) => Math.round(v * 100) / 100;

export function ReaderSettingsSheet({ settings, theme, bottomOffset, onChange }: Props) {
  return (
    <View style={[styles.sheet, { bottom: bottomOffset, backgroundColor: theme.chrome }]}>
      <Text style={[styles.label, { color: theme.text }]}>Page colour</Text>
      <View style={styles.themes}>
        {ORDER.map((name) => {
          const t = readerThemes[name];
          const active = settings.theme === name;
          return (
            <Pressable
              key={name}
              onPress={() => onChange({ theme: name })}
              style={[
                styles.themeChip,
                { backgroundColor: t.paper, borderColor: active ? theme.accent : 'rgba(127,127,127,0.35)' },
                active && styles.themeChipActive,
              ]}
              accessibilityLabel={`${t.label} theme`}
            >
              <Text style={[styles.chipAa, { color: t.text }]}>Aa</Text>
              <Text style={[styles.chipLabel, { color: t.text }]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.row}>
        <Ionicons name="sunny-outline" size={18} color={theme.text} />
        <Text style={[styles.rowLabel, { color: theme.text }]}>Brightness</Text>
        <Slider
          style={styles.slider}
          minimumValue={0.5}
          maximumValue={1}
          step={0.01}
          value={settings.brightness}
          onValueChange={(v) => onChange({ brightness: round2(v) })}
          minimumTrackTintColor={theme.accent}
          maximumTrackTintColor="rgba(127,127,127,0.4)"
          thumbTintColor={theme.accent}
        />
      </View>

      <View style={styles.row}>
        <Ionicons name="contrast-outline" size={18} color={theme.text} />
        <Text style={[styles.rowLabel, { color: theme.text }]}>Contrast</Text>
        <Slider
          style={styles.slider}
          minimumValue={0.8}
          maximumValue={1.4}
          step={0.01}
          value={settings.contrast}
          onValueChange={(v) => onChange({ contrast: round2(v) })}
          minimumTrackTintColor={theme.accent}
          maximumTrackTintColor="rgba(127,127,127,0.4)"
          thumbTintColor={theme.accent}
        />
      </View>

      {(settings.brightness !== 1 || settings.contrast !== 1) && (
        <Pressable onPress={() => onChange({ brightness: 1, contrast: 1 })} style={styles.reset}>
          <Text style={[styles.resetText, { color: theme.accent }]}>Reset brightness & contrast</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', opacity: 0.7 },
  themes: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  themeChip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1.5 },
  themeChipActive: { borderWidth: 2.5 },
  chipAa: { fontSize: 20, fontFamily: 'serif', fontWeight: '600' },
  chipLabel: { fontSize: 12, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabel: { width: 76, fontSize: 13 },
  slider: { flex: 1, height: 36 },
  reset: { alignSelf: 'center', paddingVertical: 4 },
  resetText: { fontSize: 13, fontWeight: '600' },
});
