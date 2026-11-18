import type { PreprocessOptions } from './utils/screenshotPreprocess';

export type OcrStatus = 'pending' | 'preprocessing' | 'processing' | 'done' | 'error';

export type OcrLanguage = 'por+eng' | 'por' | 'eng';

export type SeparatorMode = 'header' | 'double-newline' | 'none';

export interface PrintQueueItem {
  id: string;
  name: string;
  file: File;
  thumbnailUrl: string;
  status: OcrStatus;
  progress: number; // 0 to 100
  statusLabel: string;
  text: string;
  error?: string;
  invertedDarkMode: boolean | null;
  averageLuminance: number | null;
  originalSize?: { width: number; height: number };
  processedSize?: { width: number; height: number };
  isManuallyEdited: boolean;
  addedAt: number;
}

export interface AppSettings extends PreprocessOptions {
  autoProcess: boolean;
  language: OcrLanguage;
  separator: SeparatorMode;
}
