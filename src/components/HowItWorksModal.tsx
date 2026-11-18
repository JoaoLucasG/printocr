import { useEffect } from 'react';
import { X, ShieldCheck, Cpu, ClipboardPaste, Layers } from 'lucide-react';

interface HowItWorksModalProps {
  open: boolean;
  onClose: () => void;
}

export function HowItWorksModal({ open, onClose }: HowItWorksModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-xs dark:bg-black/70"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="how-it-works-title"
        className="w-full max-w-lg rounded-xl border border-[#E5E7EB] bg-white text-[#111827] shadow-2xl dark:border-[#27272A] dark:bg-[#18181B] dark:text-[#F4F4F5]"
      >
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4 dark:border-[#27272A]">
          <h2 id="how-it-works-title" className="text-sm font-semibold tracking-tight text-[#111827] dark:text-[#F4F4F5]">
            Como funciona o PrintOCR
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1 text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-[#111827] dark:text-[#A1A1AA] dark:hover:bg-[#27272A] dark:hover:text-[#F4F4F5] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-5 text-xs leading-relaxed text-[#4B5563] dark:text-[#A1A1AA]">
          <div className="flex gap-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3.5 dark:border-[#27272A] dark:bg-[#111113]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB] dark:text-[#60A5FA]" />
            <div>
              <p className="font-medium text-[#111827] dark:text-[#F4F4F5]">100% Client-Side &amp; Offline</p>
              <p className="mt-1">
                Nenhuma imagem sai do seu dispositivo. O motor <code className="text-[#1E40AF] dark:text-[#93C5FD]">tesseract.js</code> em WebAssembly e os modelos de idioma (<code className="text-[#1E40AF] dark:text-[#93C5FD]">por</code> / <code className="text-[#1E40AF] dark:text-[#93C5FD]">eng</code>) rodam localmente a partir de <code className="text-[#1E40AF] dark:text-[#93C5FD]">/tesseract/</code>, sem uploads nem CDNs externos.
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3.5 dark:border-[#27272A] dark:bg-[#111113]">
            <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-[#3B82F6]" />
            <div>
              <p className="font-medium text-[#111827] dark:text-[#F4F4F5]">Pré-processamento para Prints</p>
              <p className="mt-1">
                Antes do OCR, cada captura passa por um <code className="text-[#1E40AF] dark:text-[#93C5FD]">&lt;canvas&gt;</code> offscreen: imagens com fundo escuro (luminância média &lt; 128) são invertidas automaticamente, ampliadas em 2x para fontes pequenas e convertidas para escala de cinza com reforço de contraste.
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3.5 dark:border-[#27272A] dark:bg-[#111113]">
            <ClipboardPaste className="mt-0.5 h-4 w-4 shrink-0 text-[#1D4ED8] dark:text-[#60A5FA]" />
            <div>
              <p className="font-medium text-[#111827] dark:text-[#F4F4F5]">
                Colagem em Lote (<kbd className="rounded border border-[#E5E7EB] bg-white px-1.5 py-0.5 font-mono text-[11px] text-[#111827] dark:border-[#27272A] dark:bg-[#18181B] dark:text-[#F4F4F5]">Ctrl + V</kbd>)
              </p>
              <p className="mt-1">
                Pressione <code className="text-[#1E40AF] dark:text-[#93C5FD]">Ctrl + V</code> em qualquer ponto da página para enfileirar capturas em sequência (<code className="text-[#1E40AF] dark:text-[#93C5FD]">print-01.png</code>, <code className="text-[#1E40AF] dark:text-[#93C5FD]">print-02.png</code>...) sem precisar salvar arquivos antes.
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3.5 dark:border-[#27272A] dark:bg-[#111113]">
            <Layers className="mt-0.5 h-4 w-4 shrink-0 text-[#1E3A8A] dark:text-[#60A5FA]" />
            <div>
              <p className="font-medium text-[#111827] dark:text-[#F4F4F5]">Fila Ordenável &amp; Exportação</p>
              <p className="mt-1">
                Reordene os prints arrastando ou pelas setas, edite textos individuais quando precisar e copie ou baixe tudo consolidado em <code className="text-[#1E40AF] dark:text-[#93C5FD]">.txt</code>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
