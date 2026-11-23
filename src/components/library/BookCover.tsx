import { View, Text, StyleSheet } from 'react-native';
import { coverColorFor } from '@/utils/format';

/** A generated cloth-bound cover. (Phase 3 can swap in a real first-page thumbnail.) */
export function BookCover({ title, compact = false }: { title: string; compact?: boolean }) {
  return (
    <View style={[styles.cover, { backgroundColor: coverColorFor(title) }, compact && styles.compact]}>
      <View style={styles.spine} />
      <View style={styles.spineHighlight} />
      <View style={styles.rule} />
      <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={compact ? 3 : 5}>
        {title}
      </Text>
      <View style={styles.rule} />
      {!compact && <Text style={styles.badge}>PDF</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    paddingLeft: 12,
    paddingRight: 8,
    justifyContent: 'center',
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 2, height: 3 },
  },
  compact: { width: 52, paddingLeft: 8, paddingRight: 4, elevation: 3 },
  spine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, backgroundColor: 'rgba(0,0,0,0.28)' },
  spineHighlight: { position: 'absolute', left: 6, top: 0, bottom: 0, width: 2, backgroundColor: 'rgba(255,255,255,0.14)' },
  rule: { height: StyleSheet.hairlineWidth * 2, backgroundColor: 'rgba(240,200,140,0.65)', marginVertical: 6 },
  title: { color: '#F7EBD9', fontFamily: 'serif', fontSize: 13, lineHeight: 17, textAlign: 'center', fontWeight: '600' },
  titleCompact: { fontSize: 7, lineHeight: 9 },
  badge: {
    position: 'absolute', bottom: 8, alignSelf: 'center', left: 0, right: 0, textAlign: 'center',
    color: 'rgba(247,235,217,0.6)', fontSize: 9, letterSpacing: 2,
  },
});
