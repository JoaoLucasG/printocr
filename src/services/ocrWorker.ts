import { createWorker, OEM, type LoggerMessage, type Worker } from 'tesseract.js';
import type { OcrLanguage } from '../types';

type ProgressCallback = (progressPercent: number, statusLabel: string) => void;

const STATUS_LABELS: Record<string, string> = {
  'loading tesseract core': 'Carregando motor WASM local...',
  'initializing tesseract': 'Inicializando Tesseract...',
  'initialized tesseract': 'Tesseract pronto',
  'loading language traineddata': 'Carregando idioma offline...',
  'loaded language traineddata': 'Idioma carregado',
  'initializing api': 'Preparando reconhecimento...',
  'recognizing text': 'Reconhecendo texto...',
};

function translateStatus(status: string): string {
  return STATUS_LABELS[status] ?? 'Processando OCR...';
}

function getTesseractBasePath(): string {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  return `${base}/tesseract`;
}

class OfflineOcrService {
  private workerPromise: Promise<Worker> | null = null;
  private loadedLang: OcrLanguage | null = null;
  private activeProgressCb: ProgressCallback | null = null;

  private async ensureWorker(language: OcrLanguage): Promise<Worker> {
    const tesseractBase = getTesseractBasePath();

    if (!this.workerPromise) {
      this.loadedLang = language;
      this.workerPromise = createWorker(language, OEM.LSTM_ONLY, {
        workerPath: `${tesseractBase}/worker.min.js`,
        corePath: `${tesseractBase}/`,
        langPath: `${tesseractBase}/lang-data`,
        gzip: true,
        logger: (msg: LoggerMessage) => {
          if (!this.activeProgressCb) return;
          const pct = Math.round((msg.progress ?? 0) * 100);
          const label = translateStatus(msg.status);
          this.activeProgressCb(pct, `${label}${msg.status === 'recognizing text' ? ` ${pct}%` : ''}`);
        },
      }).catch((err) => {
        this.workerPromise = null;
        this.loadedLang = null;
        throw err;
      });
    }

    const worker = await this.workerPromise;

    if (this.loadedLang !== language) {
      this.activeProgressCb?.(10, 'Alternando idioma offline...');
      await worker.reinitialize(language, OEM.LSTM_ONLY);
      this.loadedLang = language;
    }

    return worker;
  }

  async recognizeImage(
    image: Blob,
    language: OcrLanguage,
    onProgress?: ProgressCallback
  ): Promise<string> {
    this.activeProgressCb = onProgress ?? null;
    try {
      const worker = await this.ensureWorker(language);
      const { data } = await worker.recognize(image);
      return data.text ?? '';
    } finally {
      this.activeProgressCb = null;
    }
  }

  async terminate(): Promise<void> {
    if (this.workerPromise) {
      const worker = await this.workerPromise;
      await worker.terminate();
      this.workerPromise = null;
      this.loadedLang = null;
    }
  }
}

export const offlineOcrService = new OfflineOcrService();
