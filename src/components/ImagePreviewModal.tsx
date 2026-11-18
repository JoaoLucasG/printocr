import { useEffect, useState } from 'react';
import { X, MoonStar } from 'lucide-react';
import type { PrintQueueItem } from '../types';

interface ImagePreviewModalProps {
  item: PrintQueueItem | null;
  onClose: () => void;
}

export function ImagePreviewModal({ item, onClose }: ImagePreviewModalProps) {
  const [viewMode, setViewMode] = useState<'original' | 'processed'>('original');

  useEffect(() => {
    setViewMode('original');
  }, [item?.id]);

  useEffect(() => {
    if (!item) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [item, onClose]);

  if (!item) return null;

  const hasProcessed = Boolean(item.processedUrl);
  const activeSrc =
    viewMode === 'processed' && item.processedUrl
      ? item.processedUrl
      : item.thumbnailUrl;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs dark:bg-black/75"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] max-w-5xl flex-col overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-2xl dark:border-[#27272A] dark:bg-[#18181B]"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E7EB] px-4 py-3 dark:border-[#27272A]">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-medium text-[#111827] dark:text-[#F4F4F5]">
              {item.name}
            </span>
            {item.invertedDarkMode === true && (
              <span className="inline-flex items-center gap-1 rounded bg-[#EFF6FF] px-1.5 py-0.5 text-[11px] font-medium text-[#1D4ED8] ring-1 ring-[#3B82F6]/25 dark:bg-[#1E3A8A]/40 dark:text-[#93C5FD] dark:ring-[#3B82F6]/30">
                <MoonStar className="h-3 w-3 text-[#2563EB] dark:text-[#60A5FA]" />
                Invertido
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasProcessed && (
              <div className="inline-flex rounded-lg border border-[#E5E7EB] bg-[#F3F4F6] p-0.5 dark:border-[#27272A] dark:bg-[#111113]">
                <button
                  type="button"
                  onClick={() => setViewMode('original')}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition cursor-pointer ${
                    viewMode === 'original'
                      ? 'bg-white text-[#111827] shadow-2xs dark:bg-[#27272A] dark:text-[#F4F4F5]'
                      : 'text-[#6B7280] hover:text-[#111827] dark:text-[#A1A1AA] dark:hover:text-[#F4F4F5]'
                  }`}
                >
                  Original
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('processed')}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition cursor-pointer ${
                    viewMode === 'processed'
                      ? 'bg-white text-[#1D4ED8] shadow-2xs dark:bg-[#27272A] dark:text-[#F4F4F5]'
                      : 'text-[#6B7280] hover:text-[#111827] dark:text-[#A1A1AA] dark:hover:text-[#F4F4F5]'
                  }`}
                >
                  Processada (OCR)
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar visualização"
              className="rounded-md p-1 text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-[#111827] dark:text-[#A1A1AA] dark:hover:bg-[#27272A] dark:hover:text-[#F4F4F5] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-auto bg-[#F9FAFB] p-4 dark:bg-[#09090B]">
          <img
            src={activeSrc}
            alt={`${item.name} (${viewMode})`}
            className="mx-auto max-h-[75vh] rounded-lg object-contain"
          />
        </div>
      </div>
    </div>
  );
}
