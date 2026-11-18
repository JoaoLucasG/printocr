import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Header, type ThemeMode } from './components/Header';
import { ToolbarSettings } from './components/ToolbarSettings';
import { QueuePanel } from './components/QueuePanel';
import { ConsolidatedOutputPanel } from './components/ConsolidatedOutputPanel';
import { ImagePreviewModal } from './components/ImagePreviewModal';
import { HowItWorksModal } from './components/HowItWorksModal';
import { preprocessScreenshot } from './utils/screenshotPreprocess';
import { buildConsolidatedText, downloadTextFile } from './utils/ocrExport';
import { offlineOcrService } from './services/ocrWorker';
import type { AppSettings, PrintQueueItem } from './types';

const DEFAULT_SETTINGS: AppSettings = {
  autoInvertDark: true,
  upscale2x: false,
  grayscaleContrast: true,
  autoProcess: true,
  language: 'por+eng',
  profile: 'general',
  separator: 'header',
};

function createItemId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getExtensionFromMime(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  return 'png';
}

const THEME_STORAGE_KEY = 'printocr-theme';

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'dark' ? 'dark' : 'light';
}

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [items, setItems] = useState<PrintQueueItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const itemsRef = useRef<PrintQueueItem[]>(items);
  itemsRef.current = items;

  const settingsRef = useRef<AppSettings>(settings);
  settingsRef.current = settings;

  const isRunningQueueRef = useRef(false);
  const pasteCounterRef = useRef(0);
  const pasteTimerRef = useRef<number | null>(null);

  const showPasteToast = useCallback((message: string) => {
    setPasteNotice(message);
    if (pasteTimerRef.current) {
      window.clearTimeout(pasteTimerRef.current);
    }
    pasteTimerRef.current = window.setTimeout(() => {
      setPasteNotice(null);
    }, 2600);
  }, []);

  const updateItemById = useCallback(
    (id: string, updater: (item: PrintQueueItem) => PrintQueueItem) => {
      setItems((prev) => prev.map((item) => (item.id === id ? updater(item) : item)));
    },
    []
  );

  const processQueue = useCallback(async () => {
    if (isRunningQueueRef.current) return;
    isRunningQueueRef.current = true;

    try {
      while (true) {
        const nextItem = itemsRef.current.find((item) => item.status === 'pending');
        if (!nextItem) break;

        const itemId = nextItem.id;
        const currentSettings = settingsRef.current;

        updateItemById(itemId, (item) => ({
          ...item,
          status: 'preprocessing',
          progress: 8,
          statusLabel: 'Pré-processando no Canvas...',
          error: undefined,
        }));

        try {
          const preprocessed = await preprocessScreenshot(nextItem.file, {
            autoInvertDark: currentSettings.autoInvertDark,
            upscale2x: currentSettings.upscale2x,
            grayscaleContrast: currentSettings.grayscaleContrast,
          });

          // Verifica se o item não foi removido durante o pré-processamento
          if (!itemsRef.current.some((i) => i.id === itemId)) continue;

          const processedUrl = URL.createObjectURL(preprocessed.blob);

          updateItemById(itemId, (item) => {
            if (item.processedUrl) {
              URL.revokeObjectURL(item.processedUrl);
            }
            return {
              ...item,
              status: 'processing',
              progress: 18,
              statusLabel: 'Iniciando OCR local...',
              processedUrl,
              invertedDarkMode: preprocessed.inverted,
              averageLuminance: preprocessed.averageLuminance,
              originalSize: {
                width: preprocessed.originalWidth,
                height: preprocessed.originalHeight,
              },
              processedSize: {
                width: preprocessed.processedWidth,
                height: preprocessed.processedHeight,
              },
            };
          });

          const result = await offlineOcrService.recognizeImage(
            preprocessed.blob,
            currentSettings.language,
            currentSettings.profile,
            (pct, label) => {
              // Mapeia progresso do Tesseract (0..100) para 20..98 na barra
              const mapped = Math.min(98, Math.max(20, Math.round(20 + pct * 0.78)));
              updateItemById(itemId, (item) =>
                item.status === 'processing'
                  ? { ...item, progress: mapped, statusLabel: label }
                  : item
              );
            }
          );

          if (!itemsRef.current.some((i) => i.id === itemId)) continue;

          updateItemById(itemId, (item) => ({
            ...item,
            status: 'done',
            progress: 100,
            statusLabel: 'Concluído',
            text: result.text,
            confidence: result.confidence,
            isManuallyEdited: false,
          }));
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Erro desconhecido ao processar imagem.';
          updateItemById(itemId, (item) => ({
            ...item,
            status: 'error',
            progress: 100,
            statusLabel: 'Falha no OCR',
            error: message,
          }));
        }
      }
    } finally {
      isRunningQueueRef.current = false;
    }
  }, [updateItemById]);

  const enqueueFiles = useCallback(
    (files: File[], fromPaste = false) => {
      if (files.length === 0) return;

      const newItems: PrintQueueItem[] = files.map((rawFile) => {
        let finalFile = rawFile;
        if (fromPaste) {
          pasteCounterRef.current += 1;
          const indexStr = String(pasteCounterRef.current).padStart(2, '0');
          const ext = getExtensionFromMime(rawFile.type);
          const autoName = `print-${indexStr}.${ext}`;
          finalFile = new File([rawFile], autoName, {
            type: rawFile.type || 'image/png',
          });
        }

        return {
          id: createItemId(),
          name: finalFile.name,
          file: finalFile,
          thumbnailUrl: URL.createObjectURL(finalFile),
          status: 'pending',
          progress: 0,
          statusLabel: settingsRef.current.autoProcess
            ? 'Na fila para processar...'
            : 'Aguardando início manual',
          text: '',
          invertedDarkMode: null,
          averageLuminance: null,
          isManuallyEdited: false,
          addedAt: Date.now(),
        };
      });

      setItems((prev) => [...prev, ...newItems]);

      if (fromPaste) {
        const names = newItems.map((i) => i.name).join(', ');
        showPasteToast(`Print colado: ${names}`);
      }
    },
    [showPasteToast]
  );

  // Dispara fila automaticamente quando há itens pendentes e autoProcess está ativo
  useEffect(() => {
    if (settings.autoProcess && items.some((item) => item.status === 'pending')) {
      void processQueue();
    }
  }, [items, settings.autoProcess, processQueue]);

  // Global Ctrl+V Paste listener em toda a janela
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const clipboard = event.clipboardData;
      if (!clipboard) return;

      const imageFiles: File[] = [];
      for (const item of Array.from(clipboard.items)) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) imageFiles.push(blob);
        }
      }

      if (imageFiles.length === 0 && clipboard.files.length > 0) {
        for (const file of Array.from(clipboard.files)) {
          if (file.type.startsWith('image/')) {
            imageFiles.push(file);
          }
        }
      }

      if (imageFiles.length > 0) {
        event.preventDefault();
        enqueueFiles(imageFiles, true);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [enqueueFiles]);

  // Limpa Object URLs e termina worker ao desmontar a aplicação
  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => {
        URL.revokeObjectURL(item.thumbnailUrl);
        if (item.processedUrl) URL.revokeObjectURL(item.processedUrl);
      });
      void offlineOcrService.terminate();
    };
  }, []);

  const handleUpdateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleMoveItem = useCallback((fromIndex: number, toIndex: number) => {
    setItems((prev) => {
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= prev.length ||
        toIndex >= prev.length ||
        fromIndex === toIndex
      ) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const handleRemoveItem = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.thumbnailUrl);
        if (target.processedUrl) URL.revokeObjectURL(target.processedUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
    setPreviewItemId((prev) => (prev === id ? null : prev));
  }, []);

  const handleUpdateItemText = useCallback((id: string, text: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, text, isManuallyEdited: true } : item
      )
    );
  }, []);

  const handleReprocessItem = useCallback(
    (id: string) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: 'pending',
                progress: 0,
                statusLabel: 'Reenfileirado...',
                error: undefined,
              }
            : item
        )
      );
      window.setTimeout(() => {
        void processQueue();
      }, 0);
    },
    [processQueue]
  );

  const handleReprocessAll = useCallback(() => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        status: 'pending',
        progress: 0,
        statusLabel: 'Aguardando reprocessamento...',
        error: undefined,
      }))
    );
    window.setTimeout(() => {
      void processQueue();
    }, 0);
  }, [processQueue]);

  const handleClearQueue = useCallback(() => {
    itemsRef.current.forEach((item) => {
      URL.revokeObjectURL(item.thumbnailUrl);
      if (item.processedUrl) URL.revokeObjectURL(item.processedUrl);
    });
    pasteCounterRef.current = 0;
    setPreviewItemId(null);
    setItems([]);
  }, []);

  const previewItem = useMemo(
    () => items.find((item) => item.id === previewItemId) ?? null,
    [items, previewItemId]
  );

  const consolidatedText = useMemo(
    () => buildConsolidatedText(items, settings.separator),
    [items, settings.separator]
  );

  const pendingCount = useMemo(
    () => items.filter((item) => item.status === 'pending').length,
    [items]
  );

  const completedCount = useMemo(
    () => items.filter((item) => item.status === 'done').length,
    [items]
  );

  const isBusy = useMemo(
    () =>
      items.some(
        (item) => item.status === 'preprocessing' || item.status === 'processing'
      ),
    [items]
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#F9FAFB] text-[#111827] dark:bg-[#09090B] dark:text-[#F4F4F5]">
      <Header
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      <ToolbarSettings
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        pendingCount={pendingCount}
        totalCount={items.length}
        isBusy={isBusy}
        onProcessPending={() => void processQueue()}
        onReprocessAll={handleReprocessAll}
      />

      <main className="mx-auto grid w-full max-w-[1520px] flex-1 grid-cols-1 gap-4 px-4 py-4 sm:px-6 lg:grid-cols-2">
        <div className="min-h-[480px] lg:h-[calc(100vh-140px)]">
          <QueuePanel
            items={items}
            onFilesAdded={(files) => enqueueFiles(files, false)}
            onMoveItem={handleMoveItem}
            onRemoveItem={handleRemoveItem}
            onUpdateItemText={handleUpdateItemText}
            onReprocessItem={handleReprocessItem}
            onPreviewItem={(item) => setPreviewItemId(item.id)}
          />
        </div>

        <div className="min-h-[480px] lg:h-[calc(100vh-140px)]">
          <ConsolidatedOutputPanel
            consolidatedText={consolidatedText}
            completedCount={completedCount}
            totalCount={items.length}
            separator={settings.separator}
            onChangeSeparator={(separator) => handleUpdateSettings({ separator })}
            onDownloadTxt={() => downloadTextFile(consolidatedText)}
            onClearQueue={handleClearQueue}
          />
        </div>
      </main>

      {pasteNotice && (
        <div className="fixed bottom-4 right-4 z-40 rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2 font-mono text-xs text-[#111827] shadow-lg ring-1 ring-[#3B82F6]/20 dark:border-[#27272A] dark:bg-[#18181B] dark:text-[#F4F4F5]">
          {pasteNotice}
        </div>
      )}

      <ImagePreviewModal item={previewItem} onClose={() => setPreviewItemId(null)} />
      <HowItWorksModal open={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
