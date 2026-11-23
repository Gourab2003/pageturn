import { Directory, File, Paths } from 'expo-file-system';
import { BOOKS_DIR_NAME } from '@/constants/storage';

/** documentDirectory/books/ — permanent, survives restarts, works offline. */
export function getBooksDir(): Directory {
  const dir = new Directory(Paths.document, BOOKS_DIR_NAME);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

export function getBookFile(fileName: string): File {
  return new File(getBooksDir(), fileName);
}

/**
 * We store only the file NAME in AsyncStorage and rebuild the full URI at runtime.
 * The absolute path differs between Expo Go and your installed APK, so saved URIs would break.
 */
export function getBookFileUri(fileName: string): string {
  return getBookFile(fileName).uri;
}

export function bookFileExists(fileName: string): boolean {
  try {
    return getBookFile(fileName).exists;
  } catch {
    return false;
  }
}

/**
 * Copies a picked PDF into permanent storage. Returns the stored name and real size.
 * `sourceUri` is the content:// URI straight from Android's document picker.
 * We never delete the source: it is the user's original file.
 */
export async function copyPdfIntoLibrary(
  sourceUri: string,
  id: string,
): Promise<{ fileName: string; sizeBytes: number }> {
  const source = new File(sourceUri);
  const fileName = `${id}.pdf`;
  const destination = new File(getBooksDir(), fileName);

  await source.copy(destination, { overwrite: true });

  return { fileName, sizeBytes: destination.size ?? 0 };
}

export function deleteBookFile(fileName: string): void {
  const file = getBookFile(fileName);
  if (file.exists) file.delete();
}
