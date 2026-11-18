import { useState } from 'react';
import { Copy, Check, Download, Trash2 } from 'lucide-react';
import type { SeparatorMode } from '../types';

interface ConsolidatedOutputPanelProps {
  consolidatedText: string;
  completedCount: number;
  totalCount: number;
  separator: SeparatorMode;
  onChangeSeparator: (mode: SeparatorMode) => void;
  onDownloadTxt: () => void;
  onClearQueue: () => void;
}

export function ConsolidatedOutputPanel({
  consolidatedText,
  completedCount,
  totalCount,
  separator,
  onChangeSeparator,
  onDownloadTxt,
  onClearQueue,
}: ConsolidatedOutputPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!consolidatedText) return;
    try {
      await navigator.clipboard.writeText(consolidatedText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = consolidatedText;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section className="flex h-full flex-col rounded-xl border border-[#E5E7EB] bg-white shadow-2xs dark:border-[#27272A] dark:bg-[#111113]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E7EB] px-4 py-2.5 dark:border-[#27272A]">
        <div className="flex items-center gap-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#A1A1AA]">
            Texto Consolidado
          </h2>
          {totalCount > 0 && (
            <span className="font-mono text-xs text-[#6B7280] dark:text-[#71717A]">
              {completedCount}/{totalCount}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Separador entre prints"
            value={separator}
            onChange={(e) => onChangeSeparator(e.target.value as SeparatorMode)}
            className="rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs text-[#111827] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 dark:border-[#27272A] dark:bg-[#18181B] dark:text-[#F4F4F5] cursor-pointer"
          >
            <option value="header">--- [nome] ---</option>
            <option value="double-newline">Linha dupla</option>
            <option value="none">Sem separador</option>
          </select>

          <button
            type="button"
            onClick={handleCopy}
            disabled={!consolidatedText}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition focus:outline-none focus:ring-2 focus:ring-[#3B82F6] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
              copied
                ? 'bg-[#1D4ED8]'
                : 'bg-[#2563EB] hover:bg-[#1D4ED8]'
            }`}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copiado' : 'Copiar Tudo'}</span>
          </button>

          <button
            type="button"
            onClick={onDownloadTxt}
            disabled={!consolidatedText}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs font-medium text-[#374151] transition hover:bg-[#F3F4F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#27272A] dark:bg-[#18181B] dark:text-[#E4E4E7] dark:hover:bg-[#27272A] cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Baixar .txt</span>
          </button>

          <button
            type="button"
            onClick={onClearQueue}
            disabled={totalCount === 0}
            title="Limpar fila"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs font-medium text-[#6B7280] transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#27272A] dark:bg-[#18181B] dark:text-[#A1A1AA] dark:hover:border-red-500/40 dark:hover:bg-red-950/40 dark:hover:text-red-400 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Limpar Fila</span>
          </button>
        </div>
      </div>

      <div className="flex-1 p-4">
        <textarea
          readOnly
          value={consolidatedText}
          placeholder="O texto extraído aparecerá aqui..."
          className="h-full min-h-[380px] w-full resize-none rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4 font-mono text-xs leading-relaxed text-[#111827] placeholder-[#9CA3AF] focus:border-[#3B82F6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 dark:border-[#27272A] dark:bg-[#09090B] dark:text-[#F4F4F5] dark:placeholder-[#52525B] dark:focus:bg-[#111113]"
        />
      </div>
    </section>
  );
}
