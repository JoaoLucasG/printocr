import { useId, useLayoutEffect, useRef, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import type { AppSettings, OcrLanguage, OcrProfile } from '../types';

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

interface ProfileOption {
  value: OcrProfile;
  label: string;
  description: string;
}

const PROFILE_OPTIONS: ProfileOption[] = [
  {
    value: 'general',
    label: 'Geral',
    description:
      'Ideal para textos corridos e interfaces comuns. Usa segmentação automática (PSM 3) com filtro de ruído de ícones.',
  },
  {
    value: 'code',
    label: 'Código / Hex',
    description:
      'Desativa o viés de dicionário e usa leitura em coluna única (PSM 4), mantendo rótulos e códigos alinhados na mesma linha.',
  },
  {
    value: 'sparse',
    label: 'Cards / Esparso',
    description:
      'Para painéis, formulários e blocos separados (PSM 11), capturando rótulos isolados e filtrando ruídos de swatches.',
  },
];

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

interface ProfileSelectorProps {
  value: OcrProfile;
  onChange: (profile: OcrProfile) => void;
}

function ProfileSelector({ value, onChange }: ProfileSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Record<OcrProfile, HTMLButtonElement | null>>({
    general: null,
    code: null,
    sparse: null,
  });
  const [indicator, setIndicator] = useState<{ left: number; width: number; ready: boolean }>({
    left: 0,
    width: 0,
    ready: false,
  });

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const container = containerRef.current;
      const activeBtn = btnRefs.current[value];
      if (!container || !activeBtn) return;
      const containerRect = container.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      setIndicator({
        left: btnRect.left - containerRect.left - container.clientLeft,
        width: btnRect.width,
        ready: true,
      });
    };

    updateIndicator();

    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateIndicator);
    observer.observe(container);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label="Perfil de leitura OCR"
      className="relative inline-flex items-center rounded-lg border border-[#E5E7EB] bg-[#F3F4F6] p-0.5 dark:border-[#27272A] dark:bg-[#111113]"
    >
      {/* Indicador deslizante fluido */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute top-0.5 bottom-0.5 left-0 rounded-md bg-white shadow-xs ring-1 ring-[#E5E7EB]/80 dark:bg-[#27272A] dark:ring-[#3F3F46] ${
          indicator.ready
            ? 'transition-[transform,width] duration-200 ease-out'
            : ''
        }`}
        style={{
          transform: `translateX(${indicator.left}px)`,
          width: `${indicator.width}px`,
          opacity: indicator.ready ? 1 : 0,
        }}
      />

      {PROFILE_OPTIONS.map((option) => {
        const isActive = value === option.value;
        return (
          <div key={option.value} className="group relative">
            <button
              ref={(el) => {
                btnRefs.current[option.value] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onChange(option.value)}
              className={`relative z-10 rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] cursor-pointer ${
                isActive
                  ? 'text-[#1D4ED8] dark:text-[#F4F4F5]'
                  : 'text-[#6B7280] hover:text-[#111827] dark:text-[#A1A1AA] dark:hover:text-[#F4F4F5]'
              }`}
            >
              {option.label}
            </button>

            <div
              role="tooltip"
              className="pointer-events-none invisible absolute left-1/2 top-full z-30 mt-2 w-60 -translate-x-1/2 -translate-y-1 rounded-lg border border-[#E5E7EB] bg-white p-2.5 text-[11px] leading-relaxed text-[#4B5563] opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 dark:border-[#27272A] dark:bg-[#18181B] dark:text-[#A1A1AA]"
            >
              <p className="font-medium text-[#111827] dark:text-[#F4F4F5]">
                Perfil: {option.label}
              </p>
              <p className="mt-0.5">{option.description}</p>
            </div>
          </div>
        );
      })}
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
            description="Detecta prints com fundo escuro (luminância média < 128) e normaliza para texto nítido em fundo branco puro."
          />

          <SwitchItem
            checked={settings.upscale2x}
            onChange={(upscale2x) => onUpdateSettings({ upscale2x })}
            label="Upscale 2x"
            description="Desligado por padrão. Essencial para recortes pequenos (< 400px, onde aplica 3x automático) ou fontes de interface muito pequenas."
          />

          <SwitchItem
            checked={settings.grayscaleContrast}
            onChange={(grayscaleContrast) => onUpdateSettings({ grayscaleContrast })}
            label="Cinza + Contraste"
            description="Normaliza níveis automaticamente (auto-levels) e reforça o contraste em escala de cinza para separar texto e fundo."
          />

          <SwitchItem
            checked={settings.autoProcess}
            onChange={(autoProcess) => onUpdateSettings({ autoProcess })}
            label="Auto-processar"
            description="Inicia o OCR automaticamente em fila assim que você cola (Ctrl + V) ou envia novos prints."
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ProfileSelector
            value={settings.profile}
            onChange={(profile) => onUpdateSettings({ profile })}
          />

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
