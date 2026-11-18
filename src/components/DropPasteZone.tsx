import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';

interface DropPasteZoneProps {
  onFilesAdded: (files: File[]) => void;
  compact?: boolean;
}

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const ACCEPTED_EXTENSIONS = /\.(png|jpe?g|webp)$/i;

function filterSupportedImages(fileList: FileList | File[]): File[] {
  return Array.from(fileList).filter(
    (file) =>
      ACCEPTED_TYPES.includes(file.type) || ACCEPTED_EXTENSIONS.test(file.name)
  );
}

export function DropPasteZone({ onFilesAdded, compact = false }: DropPasteZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const valid = filterSupportedImages(e.dataTransfer.files);
    if (valid.length > 0) {
      onFilesAdded(valid);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const valid = filterSupportedImages(e.target.files);
      if (valid.length > 0) {
        onFilesAdded(valid);
      }
      e.target.value = '';
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      className={`flex cursor-pointer items-center justify-center rounded-lg border border-dashed transition-colors focus:outline-none focus:ring-2 focus:ring-[#3B82F6] ${
        isDraggingOver
          ? 'border-[#3B82F6] bg-[#3B82F6]/5 dark:bg-[#3B82F6]/10'
          : 'border-[#E5E7EB] bg-[#F9FAFB] hover:border-[#3B82F6]/60 hover:bg-[#F3F4F6]/60 dark:border-[#27272A] dark:bg-[#09090B]/60 dark:hover:border-[#3B82F6]/60 dark:hover:bg-[#18181B]'
      } ${compact ? 'px-4 py-3' : 'px-6 py-10'}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
        multiple
        onChange={handleInputChange}
        className="hidden"
      />

      <div className="flex items-center gap-3 text-left">
        <Upload className="h-4 w-4 shrink-0 text-[#6B7280] dark:text-[#71717A]" />
        <p className="text-xs text-[#4B5563] dark:text-[#A1A1AA]">
          <kbd className="rounded border border-[#E5E7EB] bg-white px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#111827] shadow-2xs dark:border-[#27272A] dark:bg-[#18181B] dark:text-[#F4F4F5]">
            Ctrl + V
          </kbd>{' '}
          para colar prints, arraste ou clique para selecionar{' '}
          <span className="text-[#9CA3AF] dark:text-[#52525B]">(PNG, JPG, WEBP)</span>
        </p>
      </div>
    </div>
  );
}
