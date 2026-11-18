import { HelpCircle, Moon, Sun } from 'lucide-react';

export type ThemeMode = 'light' | 'dark';

interface HeaderProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenHelp: () => void;
}

export function Header({ theme, onToggleTheme, onOpenHelp }: HeaderProps) {
  const isDark = theme === 'dark';

  return (
    <header className="border-b border-[#E5E7EB] bg-white dark:border-[#27272A] dark:bg-[#111113]">
      <div className="mx-auto flex max-w-[1520px] items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#3B82F6]" aria-hidden="true" />
          <h1 className="text-base font-semibold tracking-tight text-[#111827] dark:text-[#F4F4F5]">
            PrintOCR
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleTheme}
            title={isDark ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
            aria-label={isDark ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#4B5563] transition hover:bg-[#F3F4F6] hover:text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] dark:border-[#27272A] dark:bg-[#18181B] dark:text-[#A1A1AA] dark:hover:bg-[#27272A] dark:hover:text-[#F4F4F5] cursor-pointer"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={onOpenHelp}
            title="Como funciona"
            aria-label="Como funciona"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#4B5563] transition hover:bg-[#F3F4F6] hover:text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] dark:border-[#27272A] dark:bg-[#18181B] dark:text-[#A1A1AA] dark:hover:bg-[#27272A] dark:hover:text-[#F4F4F5] cursor-pointer"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
