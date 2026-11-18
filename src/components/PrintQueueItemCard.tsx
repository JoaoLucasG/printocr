import { useState } from 'react';
import {
  ArrowUp,
  ArrowDown,
  GripVertical,
  MoonStar,
  Trash2,
  FileEdit,
  ChevronUp,
  RotateCcw,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import type { PrintQueueItem } from '../types';

interface PrintQueueItemCardProps {
  item: PrintQueueItem;
  index: number;
  total: number;
  isDragOver: boolean;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemove: (id: string) => void;
  onUpdateText: (id: string, text: string) => void;
  onReprocess: (id: string) => void;
  onPreview: (item: PrintQueueItem) => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDrop: (index: number) => void;
  onDragEnd: () => void;
}

export function PrintQueueItemCard({
  item,
  index,
  total,
  isDragOver,
  onMoveUp,
  onMoveDown,
  onRemove,
  onUpdateText,
  onReprocess,
  onPreview,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: PrintQueueItemCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isRunning = item.status === 'preprocessing' || item.status === 'processing';
  const isDone = item.status === 'done';
  const isError = item.status === 'error';

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={() => onDrop(index)}
      onDragEnd={onDragEnd}
      className={`rounded-lg border bg-white p-2.5 transition-colors dark:bg-[#18181B] ${
        isDragOver
          ? 'border-[#3B82F6] ring-2 ring-[#3B82F6]/20'
          : isError
          ? 'border-red-300 bg-red-50/30 dark:border-red-500/40 dark:bg-red-950/20'
          : isRunning
          ? 'border-[#3B82F6]/60'
          : 'border-[#E5E7EB] hover:border-[#D1D5DB] dark:border-[#27272A] dark:hover:border-[#3F3F46]'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div
          className="cursor-grab pt-1 text-[#9CA3AF] hover:text-[#4B5563] dark:text-[#52525B] dark:hover:text-[#A1A1AA] active:cursor-grabbing"
          title="Arraste para reordenar"
        >
          <GripVertical className="h-4 w-4" />
        </div>

        <button
          type="button"
          onClick={() => onPreview(item)}
          title="Ampliar imagem"
          className="h-14 w-20 shrink-0 overflow-hidden rounded-md border border-[#E5E7EB] bg-[#F3F4F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] dark:border-[#27272A] dark:bg-[#09090B] cursor-pointer"
        >
          <img
            src={item.thumbnailUrl}
            alt={item.name}
            className="h-full w-full object-cover transition-opacity hover:opacity-85"
          />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate font-mono text-xs font-medium text-[#111827] dark:text-[#F4F4F5]">
                {item.name}
              </span>

              {item.invertedDarkMode === true && (
                <span
                  className="inline-flex items-center gap-1 rounded bg-[#EFF6FF] px-1.5 py-0.5 text-[10px] font-medium text-[#1D4ED8] ring-1 ring-[#3B82F6]/25 dark:bg-[#1E3A8A]/40 dark:text-[#93C5FD] dark:ring-[#3B82F6]/30"
                  title={`Tema escuro detectado (luminância ${Math.round(
                    item.averageLuminance ?? 0
                  )}/255) — cores invertidas`}
                >
                  <MoonStar className="h-2.5 w-2.5 text-[#2563EB] dark:text-[#60A5FA]" />
                  Invertido
                </span>
              )}
            </div>

            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => onMoveUp(index)}
                disabled={index === 0}
                title="Subir"
                className="rounded p-1 text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-[#111827] disabled:cursor-not-allowed disabled:opacity-25 dark:text-[#71717A] dark:hover:bg-[#27272A] dark:hover:text-[#F4F4F5] cursor-pointer"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onMoveDown(index)}
                disabled={index === total - 1}
                title="Descer"
                className="rounded p-1 text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-[#111827] disabled:cursor-not-allowed disabled:opacity-25 dark:text-[#71717A] dark:hover:bg-[#27272A] dark:hover:text-[#F4F4F5] cursor-pointer"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                title={isExpanded ? 'Fechar editor' : 'Ver / editar texto'}
                className={`rounded p-1 transition cursor-pointer ${
                  isExpanded
                    ? 'bg-[#EFF6FF] text-[#2563EB] dark:bg-[#1E3A8A]/40 dark:text-[#60A5FA]'
                    : 'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] dark:text-[#71717A] dark:hover:bg-[#27272A] dark:hover:text-[#F4F4F5]'
                }`}
              >
                {isExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <FileEdit className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => onReprocess(item.id)}
                disabled={isRunning}
                title="Reprocessar"
                className="rounded p-1 text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-[#111827] disabled:cursor-not-allowed disabled:opacity-25 dark:text-[#71717A] dark:hover:bg-[#27272A] dark:hover:text-[#F4F4F5] cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                title="Remover"
                className="rounded p-1 text-[#6B7280] transition hover:bg-red-50 hover:text-red-600 dark:text-[#71717A] dark:hover:bg-red-950/40 dark:hover:text-red-400 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 text-[#6B7280] dark:text-[#A1A1AA]">
              {isRunning && <Loader2 className="h-3 w-3 animate-spin text-[#3B82F6]" />}
              {isDone && <Check className="h-3 w-3 text-[#2563EB] dark:text-[#60A5FA]" />}
              {isError && <AlertCircle className="h-3 w-3 text-red-600 dark:text-red-400" />}
              <span
                className={
                  isError
                    ? 'text-red-600 dark:text-red-400'
                    : isDone
                    ? 'text-[#1D4ED8] dark:text-[#93C5FD]'
                    : ''
                }
              >
                {item.error || item.statusLabel}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isDone && typeof item.confidence === 'number' && item.confidence < 70 && (
                <span
                  title="Confiança baixa — experimente o perfil Código / Hex ou Cards / Esparso"
                  className="text-[10px] text-amber-600 dark:text-amber-400"
                >
                  {item.confidence}% confiança
                </span>
              )}
              {item.isManuallyEdited && (
                <span className="text-[10px] font-medium text-[#2563EB] dark:text-[#60A5FA]">
                  editado
                </span>
              )}
            </div>
          </div>

          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[#E5E7EB] dark:bg-[#27272A]">
            <div
              className={`h-full transition-all duration-200 ${
                isError
                  ? 'bg-red-500'
                  : isDone
                  ? 'bg-[#2563EB]'
                  : 'bg-[#3B82F6]'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, item.progress))}%` }}
            />
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-2.5 border-t border-[#E5E7EB] pt-2.5 dark:border-[#27272A]">
          <textarea
            value={item.text}
            onChange={(e) => onUpdateText(item.id, e.target.value)}
            rows={5}
            placeholder={
              isRunning
                ? 'Processando OCR...'
                : 'Texto individual vazio.'
            }
            className="w-full rounded-md border border-[#E5E7EB] bg-[#F9FAFB] p-2.5 font-mono text-xs leading-relaxed text-[#111827] placeholder-[#9CA3AF] focus:border-[#3B82F6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 dark:border-[#27272A] dark:bg-[#09090B] dark:text-[#F4F4F5] dark:placeholder-[#52525B] dark:focus:bg-[#111113]"
          />
        </div>
      )}
    </div>
  );
}
