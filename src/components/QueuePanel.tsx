import { useState } from 'react';
import type { PrintQueueItem } from '../types';
import { DropPasteZone } from './DropPasteZone';
import { PrintQueueItemCard } from './PrintQueueItemCard';

interface QueuePanelProps {
  items: PrintQueueItem[];
  onFilesAdded: (files: File[]) => void;
  onMoveItem: (fromIndex: number, toIndex: number) => void;
  onRemoveItem: (id: string) => void;
  onUpdateItemText: (id: string, text: string) => void;
  onReprocessItem: (id: string) => void;
  onPreviewItem: (item: PrintQueueItem) => void;
}

export function QueuePanel({
  items,
  onFilesAdded,
  onMoveItem,
  onRemoveItem,
  onUpdateItemText,
  onReprocessItem,
  onPreviewItem,
}: QueuePanelProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (targetIndex: number) => {
    if (dragIndex !== null && dragIndex !== targetIndex) {
      onMoveItem(dragIndex, targetIndex);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <section className="flex h-full flex-col rounded-xl border border-[#E5E7EB] bg-white shadow-2xs dark:border-[#27272A] dark:bg-[#111113]">
      <div className="flex items-center justify-between border-b border-[#E5E7EB] px-4 py-3 dark:border-[#27272A]">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#A1A1AA]">
          Fila de Prints
        </h2>
        <span className="font-mono text-xs text-[#6B7280] dark:text-[#71717A]">
          {items.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        <DropPasteZone onFilesAdded={onFilesAdded} compact={items.length > 0} />

        {items.length > 0 && (
          <div className="flex flex-col gap-2">
            {items.map((item, index) => (
              <PrintQueueItemCard
                key={item.id}
                item={item}
                index={index}
                total={items.length}
                isDragOver={dragOverIndex === index}
                onMoveUp={(idx) => onMoveItem(idx, idx - 1)}
                onMoveDown={(idx) => onMoveItem(idx, idx + 1)}
                onRemove={onRemoveItem}
                onUpdateText={onUpdateItemText}
                onReprocess={onReprocessItem}
                onPreview={onPreviewItem}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
