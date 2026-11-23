import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants/storage';
import type { ReaderSettings } from '@/types/book';

export const DEFAULT_READER_SETTINGS: ReaderSettings = { theme: 'sepia', brightness: 1, contrast: 1 };

/** Reader theme + brightness/contrast, shared by every book and saved on the device. */
export function useReaderSettings() {
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_READER_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEYS.readerSettings)
      .then((raw) => {
        if (!raw || cancelled) return;
        try {
          setSettings({ ...DEFAULT_READER_SETTINGS, ...JSON.parse(raw) });
        } catch {
          // ignore corrupt settings
        }
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((patch: Partial<ReaderSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEYS.readerSettings, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return { settings, loaded, update };
}
