import type { PrintQueueItem, SeparatorMode } from '../types';

export function buildConsolidatedText(
  items: PrintQueueItem[],
  separator: SeparatorMode
): string {
  const completed = items.filter((item) => item.status === 'done' || item.text.trim().length > 0);
  if (completed.length === 0) return '';

  const chunks = completed.map((item) => {
    const cleanText = item.text.trimEnd();
    if (separator === 'header') {
      return `--- ${item.name} ---\n${cleanText}`;
    }
    return cleanText;
  });

  if (separator === 'header') {
    return chunks.join('\n\n');
  }
  if (separator === 'double-newline') {
    return chunks.join('\n\n');
  }
  return chunks.join('\n');
}

export function downloadTextFile(content: string, filename = 'printocr-resultado.txt'): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
