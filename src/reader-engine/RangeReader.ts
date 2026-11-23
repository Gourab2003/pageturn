import { FileMode, type File, type FileHandle } from 'expo-file-system';
import { bytesToBase64 } from '@/utils/base64';

/**
 * Serves PDF.js byte-range requests from a local file.
 * Reads are queued because a FileHandle has a single shared offset.
 */
export class RangeReader {
  private handle: FileHandle | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly file: File) {}

  read(begin: number, end: number): Promise<string> {
    const job = this.queue.then(async () => {
      if (!this.handle) this.handle = this.file.open(FileMode.ReadOnly);
      this.handle.offset = begin;
      const bytes = await this.handle.readBytes(Math.max(0, end - begin));
      return bytesToBase64(bytes);
    });
    this.queue = job.catch(() => undefined);
    return job;
  }

  close(): void {
    try {
      this.handle?.close();
    } catch {
      // already closed
    }
    this.handle = null;
  }
}
