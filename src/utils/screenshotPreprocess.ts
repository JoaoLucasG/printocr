export interface PreprocessOptions {
  autoInvertDark: boolean;
  upscale2x: boolean;
  grayscaleContrast: boolean;
}

export interface PreprocessResult {
  blob: Blob;
  averageLuminance: number;
  isDarkBackground: boolean;
  inverted: boolean;
  upscaled: boolean;
  grayscaleContrastApplied: boolean;
  originalWidth: number;
  originalHeight: number;
  processedWidth: number;
  processedHeight: number;
}

const MAX_CANVAS_DIMENSION = 8192;
const CONTRAST_MULTIPLIER = 1.25;

function clampByte(value: number): number {
  if (value < 0) return 0;
  if (value > 255) return 255;
  return Math.round(value);
}

async function loadImageSource(
  file: Blob
): Promise<{ width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; cleanup: () => void }> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
      cleanup: () => bitmap.close(),
    };
  }

  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Falha ao decodificar a imagem no navegador.'));
    el.src = url;
  });

  return {
    width: img.naturalWidth || img.width,
    height: img.naturalHeight || img.height,
    draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
    cleanup: () => URL.revokeObjectURL(url),
  };
}

function computeAverageLuminance(imageData: ImageData): number {
  const { data } = imageData;
  let luminanceSum = 0;
  let opaquePixels = 0;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 16) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    luminanceSum += 0.299 * r + 0.587 * g + 0.114 * b;
    opaquePixels++;
  }

  if (opaquePixels === 0) return 255;
  return luminanceSum / opaquePixels;
}

/**
 * Pré-processa um print de tela em um <canvas> offscreen antes do OCR:
 * 1. Mede a luminância média e inverte RGB se fundo escuro (luminância < 128).
 * 2. Redimensiona em 2x (quando ativado) para melhorar leitura de fontes pequenas.
 * 3. Converte para escala de cinza com leve reforço de contraste.
 */
export async function preprocessScreenshot(
  file: Blob,
  options: PreprocessOptions
): Promise<PreprocessResult> {
  const source = await loadImageSource(file);

  try {
    const origW = source.width;
    const origH = source.height;

    if (origW === 0 || origH === 0) {
      throw new Error('A imagem possui dimensões inválidas (0px).');
    }

    // Passo 1: Canvas em escala original para medir brilho médio rapidamente
    const probeCanvas = document.createElement('canvas');
    probeCanvas.width = origW;
    probeCanvas.height = origH;
    const probeCtx = probeCanvas.getContext('2d', { willReadFrequently: true });
    if (!probeCtx) {
      throw new Error('Contexto Canvas 2D indisponível neste navegador.');
    }

    source.draw(probeCtx, origW, origH);
    const probeData = probeCtx.getImageData(0, 0, origW, origH);
    const averageLuminance = computeAverageLuminance(probeData);
    const isDarkBackground = averageLuminance < 128;
    const shouldInvert = options.autoInvertDark && isDarkBackground;

    // Passo 2: Define escala (2x respeitando limite seguro de canvas do navegador)
    let scale = options.upscale2x ? 2 : 1;
    if (origW * scale > MAX_CANVAS_DIMENSION || origH * scale > MAX_CANVAS_DIMENSION) {
      scale = Math.min(
        MAX_CANVAS_DIMENSION / origW,
        MAX_CANVAS_DIMENSION / origH,
        scale
      );
    }

    const targetW = Math.max(1, Math.round(origW * scale));
    const targetH = Math.max(1, Math.round(origH * scale));
    const didUpscale = scale > 1.01;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = targetW;
    outCanvas.height = targetH;
    const outCtx = outCanvas.getContext('2d', { willReadFrequently: true });
    if (!outCtx) {
      throw new Error('Contexto Canvas 2D de saída indisponível.');
    }

    // Fundo sólido antes de desenhar para evitar artefatos em PNGs com transparência
    outCtx.fillStyle = isDarkBackground ? '#000000' : '#ffffff';
    outCtx.fillRect(0, 0, targetW, targetH);

    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = 'high';
    source.draw(outCtx, targetW, targetH);

    // Passo 3: Manipulação de pixels (Inversão de tema escuro + Escala de cinza e contraste)
    if (shouldInvert || options.grayscaleContrast) {
      const imageData = outCtx.getImageData(0, 0, targetW, targetH);
      const { data } = imageData;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        if (shouldInvert) {
          r = 255 - r;
          g = 255 - g;
          b = 255 - b;
        }

        if (options.grayscaleContrast) {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          const boosted = clampByte((gray - 128) * CONTRAST_MULTIPLIER + 128);
          data[i] = boosted;
          data[i + 1] = boosted;
          data[i + 2] = boosted;
        } else {
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
        }
        data[i + 3] = 255;
      }

      outCtx.putImageData(imageData, 0, 0);
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      outCanvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error('Falha ao exportar imagem pré-processada do Canvas.'));
        },
        'image/png'
      );
    });

    return {
      blob,
      averageLuminance,
      isDarkBackground,
      inverted: shouldInvert,
      upscaled: didUpscale,
      grayscaleContrastApplied: options.grayscaleContrast,
      originalWidth: origW,
      originalHeight: origH,
      processedWidth: targetW,
      processedHeight: targetH,
    };
  } finally {
    source.cleanup();
  }
}
