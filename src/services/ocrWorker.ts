import {
  createWorker,
  OEM,
  PSM,
  type Block,
  type InitOptions,
  type LoggerMessage,
  type Worker,
} from 'tesseract.js';
import type { OcrLanguage, OcrProfile } from '../types';

type ProgressCallback = (progressPercent: number, statusLabel: string) => void;

export interface OcrRecognizeResult {
  text: string;
  confidence: number;
}

const STATUS_LABELS: Record<string, string> = {
  'loading tesseract core': 'Carregando motor WASM local...',
  'initializing tesseract': 'Inicializando Tesseract...',
  'initialized tesseract': 'Tesseract pronto',
  'loading language traineddata': 'Carregando idioma offline...',
  'loaded language traineddata': 'Idioma carregado',
  'initializing api': 'Preparando reconhecimento...',
  'recognizing text': 'Reconhecendo texto...',
};

const ICON_NOISE_TOKEN_RE = /^(?=.*[[\]|(){}\\])[[\]|(){}\\Il1!]{1,3}$/;

function translateStatus(status: string): string {
  return STATUS_LABELS[status] ?? 'Processando OCR...';
}

function getTesseractBasePath(): string {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  return `${base}/tesseract`;
}

function getInitConfig(profile: OcrProfile): Partial<InitOptions> {
  const disableDictionary = profile === 'code';
  return {
    load_system_dawg: disableDictionary ? '0' : '1',
    load_freq_dawg: disableDictionary ? '0' : '1',
  };
}

function getPagesegMode(profile: OcrProfile): PSM {
  if (profile === 'code') return PSM.SINGLE_COLUMN;
  if (profile === 'sparse') return PSM.SPARSE_TEXT;
  return PSM.AUTO;
}

function extractCleanText(
  rawText: string,
  blocks: Block[] | null,
  profile: OcrProfile
): string {
  if (profile === 'code' || !blocks || blocks.length === 0) {
    return rawText;
  }

  const paragraphsOut: string[] = [];

  for (const block of blocks) {
    for (const paragraph of block.paragraphs) {
      const paraLines: string[] = [];

      for (const line of paragraph.lines) {
        const words = line.words.filter((word, idx) => {
          const trimmed = word.text.trim();
          if (!trimmed) return false;
          const isTrailingOrStandalone =
            idx === line.words.length - 1 || line.words.length === 1;
          if (
            isTrailingOrStandalone &&
            word.confidence < 65 &&
            ICON_NOISE_TOKEN_RE.test(trimmed)
          ) {
            return false;
          }
          return true;
        });

        const reconstructed = words.map((w) => w.text.trim()).join(' ').trim();
        if (reconstructed) {
          paraLines.push(reconstructed);
        }
      }

      if (paraLines.length > 0) {
        paragraphsOut.push(paraLines.join('\n'));
      }
    }
  }

  return paragraphsOut.length > 0 ? paragraphsOut.join('\n\n') : rawText;
}

class OfflineOcrService {
  private workerPromise: Promise<Worker> | null = null;
  private loadedLang: OcrLanguage | null = null;
  private loadedDictDisabled: boolean | null = null;
  private activeProgressCb: ProgressCallback | null = null;

  private async ensureWorker(
    language: OcrLanguage,
    profile: OcrProfile
  ): Promise<Worker> {
    const tesseractBase = getTesseractBasePath();
    const disableDictionary = profile === 'code';

    if (!this.workerPromise) {
      this.loadedLang = language;
      this.loadedDictDisabled = disableDictionary;
      this.workerPromise = createWorker(
        language,
        OEM.LSTM_ONLY,
        {
          workerPath: `${tesseractBase}/worker.min.js`,
          corePath: `${tesseractBase}/`,
          langPath: `${tesseractBase}/lang-data`,
          gzip: true,
          logger: (msg: LoggerMessage) => {
            if (!this.activeProgressCb) return;
            const pct = Math.round((msg.progress ?? 0) * 100);
            const label = translateStatus(msg.status);
            this.activeProgressCb(
              pct,
              `${label}${msg.status === 'recognizing text' ? ` ${pct}%` : ''}`
            );
          },
        },
        getInitConfig(profile)
      ).catch((err) => {
        this.workerPromise = null;
        this.loadedLang = null;
        this.loadedDictDisabled = null;
        throw err;
      });
    }

    const worker = await this.workerPromise;

    if (
      this.loadedLang !== language ||
      this.loadedDictDisabled !== disableDictionary
    ) {
      this.activeProgressCb?.(10, 'Aplicando perfil e idioma offline...');
      await worker.reinitialize(
        language,
        OEM.LSTM_ONLY,
        getInitConfig(profile)
      );
      this.loadedLang = language;
      this.loadedDictDisabled = disableDictionary;
    }

    await worker.setParameters({
      user_defined_dpi: '300',
      tessedit_pageseg_mode: getPagesegMode(profile),
      preserve_interword_spaces: profile === 'general' ? '0' : '1',
    });

    return worker;
  }

  async recognizeImage(
    image: Blob,
    language: OcrLanguage,
    profile: OcrProfile,
    onProgress?: ProgressCallback
  ): Promise<OcrRecognizeResult> {
    this.activeProgressCb = onProgress ?? null;
    try {
      const worker = await this.ensureWorker(language, profile);
      const { data } = await worker.recognize(
        image,
        {},
        { text: true, blocks: true }
      );
      const rawText = data.text ?? '';
      return {
        text: extractCleanText(rawText, data.blocks, profile),
        confidence: Math.round(data.confidence ?? 0),
      };
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
      this.loadedDictDisabled = null;
    }
  }
}

export const offlineOcrService = new OfflineOcrService();
