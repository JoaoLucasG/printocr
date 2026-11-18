import { useId } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import type { AppSettings, OcrLanguage } from '../types';

interface ToolbarSettingsProps {
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  pendingCount: number;
  totalCount: number;
  isBusy: boolean;
  onProcessPending: () => void;
  onReprocessAll: () => void;
}

interface SwitchItemProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description: string;
}

function SwitchItem({ checked, onChange, label, description }: SwitchItemProps) {
  const tooltipId = useId();

  return (
    <div className="group relative">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={tooltipId}
        onClick={() => onChange(!checked)}
        className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-[#3B82F6] cursor-help ${
          checked
            ? 'border-[#E5E7EB] bg-white text-[#111827] shadow-2xs dark:border-[#27272A] dark:bg-[#18181B] dark:text-[#F4F4F5]'
            : 'border-[#E5E7EB] bg-[#F3F4F6] text-[#6B7280] hover:text-[#111827] dark:border-[#27272A] dark:bg-[#111113] dark:text-[#71717A] dark:hover:text-[#E4E4E7]'
        }`}
      >
        <span
          className={`inline-flex h-3.5 w-6 items-center rounded-full p-0.5 transition-colors ${
            checked ? 'bg-[#3B82F6]' : 'bg-[#D1D5DB] dark:bg-[#3F3F46]'
          }`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full bg-white shadow-2xs transition-transform ${
              checked ? 'translate-x-2.5' : 'translate-x-0'
            }`}
          />
        </span>
        <span>{label}</span>
      </button>

      <div
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none invisible absolute left-0 top-full z-30 mt-2 w-64 -translate-y-1 rounded-lg border border-[#E5E7EB] bg-white p-2.5 text-[11px] leading-relaxed text-[#4B5563] opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 dark:border-[#27272A] dark:bg-[#18181B] dark:text-[#A1A1AA]"
      >
        <p className="font-medium text-[#111827] dark:text-[#F4F4F5]">{label}</p>
        <p className="mt-0.5">{description}</p>
      </div>
    </div>
  );
}

export function ToolbarSettings({
  settings,
  onUpdateSettings,
  pendingCount,
  totalCount,
  isBusy,
  onProcessPending,
  onReprocessAll,
}: ToolbarSettingsProps) {
  return (
    <div className="border-b border-[#E5E7EB] bg-[#F9FAFB] dark:border-[#27272A] dark:bg-[#09090B]">
      <div className="mx-auto flex max-w-[1520px] flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <SwitchItem
            checked={settings.autoInvertDark}
            onChange={(autoInvertDark) => onUpdateSettings({ autoInvertDark })}
            label="Inverter Dark Mode"
            description="Detecta prints com fundo escuro (luminância média < 128) e inverte as cores para gerar texto escuro em fundo claro."
          />

          <SwitchItem
            checked={settings.upscale2x}
            onChange={(upscale2x) => onUpdateSettings({ upscale2x })}
            label="Upscale 2x"
            description="Dobra a resolução da imagem no Canvas antes do OCR para melhorar a leitura de fontes pequenas de interface."
          />

          <SwitchItem
            checked={settings.grayscaleContrast}
            onChange={(grayscaleContrast) => onUpdateSettings({ grayscaleContrast })}
            label="Cinza + Contraste"
            description="Converte o print para escala de cinza com leve reforço de contraste para destacar os caracteres."
          />

          <SwitchItem
            checked={settings.autoProcess}
            onChange={(autoProcess) => onUpdateSettings({ autoProcess })}
            label="Auto-processar"
            description="Inicia o OCR automaticamente em fila assim que você cola (Ctrl + V) ou envia novos prints."
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Idioma do OCR"
            value={settings.language}
            onChange={(e) =>
              onUpdateSettings({ language: e.target.value as OcrLanguage })
            }
            className="rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs font-medium text-[#111827] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 dark:border-[#27272A] dark:bg-[#18181B] dark:text-[#F4F4F5] cursor-pointer"
          >
            <option value="por+eng">PT + EN</option>
            <option value="por">Português</option>
            <option value="eng">Inglês</option>
          </select>

          {pendingCount > 0 && (
            <button
              type="button"
              onClick={onProcessPending}
              disabled={isBusy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Processar ({pendingCount})</span>
            </button>
          )}

          {totalCount > 0 && (
            <button
              type="button"
              onClick={onReprocessAll}
              disabled={isBusy}
              title="Reprocessar todos os prints da fila"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs font-medium text-[#374151] transition hover:bg-[#F3F4F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#27272A] dark:bg-[#18181B] dark:text-[#E4E4E7] dark:hover:bg-[#27272A] cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reprocessar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
