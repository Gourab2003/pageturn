import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LibraryViewMode } from '@/types/book';
import { colors } from '@/constants/theme';

export function ViewToggle({ mode, onChange }: { mode: LibraryViewMode; onChange: (m: LibraryViewMode) => void }) {
  const next: LibraryViewMode = mode === 'grid' ? 'list' : 'grid';
  return (
    <Pressable onPress={() => onChange(next)} hitSlop={12} accessibilityLabel={`Switch to ${next} view`}>
      <Ionicons name={next === 'list' ? 'list-outline' : 'grid-outline'} size={22} color={colors.text} />
    </Pressable>
  );
}