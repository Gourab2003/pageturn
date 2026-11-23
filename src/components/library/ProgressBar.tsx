import { View, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

export function ProgressBar({ value, height = 4 }: { value: number; height?: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <View style={[styles.track, { height, borderRadius: height }]}>
      <View style={[styles.fill, { width: `${pct}%`, borderRadius: height }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', backgroundColor: colors.progressTrack, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.primary },
});