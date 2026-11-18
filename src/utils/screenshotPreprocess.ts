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
const QUIET_ZONE_PX = 20;
const CONTRAST_MULTIPLIER = 1.25;

function clampByte(value: number): number {
  if (value < 0) return 0;
  if (value > 255) return 255;
  return Math.round(value);
}

async function loadImageSource(file: Blob): Promise<{
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => void;
  cleanup: () => void;
}> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw: (ctx, x, y, w, h) => ctx.drawImage(bitmap, x, y, w, h),
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
    draw: (ctx, x, y, w, h) => ctx.drawImage(img, x, y, w, h),
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

function computeAutoLevelsBounds(
  grayBuffer: Float32Array,
  width: number,
  height: number,
  margin: number
): { low: number; high: number } {
  const histogram = new Uint32Array(256);
  let total = 0;

  const startX = margin;
  const endX = width - margin;
  const startY = margin;
  const endY = height - margin;

  for (let y = startY; y < endY; y++) {
    const rowOffset = y * width;
    for (let x = startX; x < endX; x++) {
      const val = clampByte(grayBuffer[rowOffset + x]);
      histogram[val]++;
      total++;
    }
  }

  if (total === 0) return { low: 0, high: 255 };

  // p0.5 para texto mais escuro, p90 para normalizar fundos escuros sem cortar traços anti-aliased
  const lowTarget = Math.floor(total * 0.005);
  const highTarget = Math.floor(total * 0.9);

  let cumulative = 0;
  let low = 0;
  let high = 255;
  let foundLow = false;

  for (let i = 0; i < 256; i++) {
    cumulative += histogram[i];
    if (!foundLow && cumulative >= lowTarget) {
      low = i;
      foundLow = true;
    }
    if (cumulative >= highTarget) {
      high = i;
      break;
    }
  }

  if (high - low < 40) {
    return { low: 0, high: 255 };
  }
  return { low, high };
}

/**
 * Pré-processa um print de tela em um <canvas> offscreen antes do OCR:
 * 1. Mede a luminância média e inverte RGB se fundo escuro (luminância < 128).
 * 2. Adiciona margem branca (quiet zone) ao redor do print.
 * 3. Redimensiona (2x padrão ou 3x em recortes pequenos) quando ativado.
 * 4. Normaliza níveis (auto-levels suave) + escala de cinza com reforço de contraste.
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

    // Passo 1: Canvas em escala original para medir luminância média
    const probeCanvas = document.createElement('canvas');
    probeCanvas.width = origW;
    probeCanvas.height = origH;
    const probeCtx = probeCanvas.getContext('2d', { willReadFrequently: true });
    if (!probeCtx) {
      throw new Error('Contexto Canvas 2D indisponível neste navegador.');
    }

    source.draw(probeCtx, 0, 0, origW, origH);
    const probeData = probeCtx.getImageData(0, 0, origW, origH);
    const averageLuminance = computeAverageLuminance(probeData);
    const isDarkBackground = averageLuminance < 128;
    const shouldInvert = options.autoInvertDark && isDarkBackground;

    // Passo 2: Escala (3x para recortes bem pequenos, 2x nos demais quando ativado) + Quiet Zone
    const maxContentDim = MAX_CANVAS_DIMENSION - QUIET_ZONE_PX * 2;
    let scale = 1;
    if (options.upscale2x) {
      scale = origW < 400 && origH < 500 ? 3 : 2;
    }
    if (origW * scale > maxContentDim || origH * scale > maxContentDim) {
      scale = Math.min(maxContentDim / origW, maxContentDim / origH, scale);
    }

    const contentW = Math.max(1, Math.round(origW * scale));
    const contentH = Math.max(1, Math.round(origH * scale));
    const targetW = contentW + QUIET_ZONE_PX * 2;
    const targetH = contentH + QUIET_ZONE_PX * 2;
    const didUpscale = scale > 1.01;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = targetW;
    outCanvas.height = targetH;
    const outCtx = outCanvas.getContext('2d', { willReadFrequently: true });
    if (!outCtx) {
      throw new Error('Contexto Canvas 2D de saída indisponível.');
    }

    // Fundo sólido antes de desenhar (se houver inversão, preto vira branco puro após inverter)
    outCtx.fillStyle = shouldInvert ? '#000000' : '#ffffff';
    outCtx.fillRect(0, 0, targetW, targetH);

    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = 'high';
    source.draw(outCtx, QUIET_ZONE_PX, QUIET_ZONE_PX, contentW, contentH);

    // Passo 3: Inversão, Auto-Levels suave e Cinza + Contraste
    if (shouldInvert || options.grayscaleContrast) {
      const imageData = outCtx.getImageData(0, 0, targetW, targetH);
      const { data } = imageData;
      const pixelCount = targetW * targetH;

      if (options.grayscaleContrast) {
        const grayBuffer = new Float32Array(pixelCount);

        for (let p = 0, i = 0; p < pixelCount; p++, i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];

          if (shouldInvert) {
            r = 255 - r;
            g = 255 - g;
            b = 255 - b;
          }

          grayBuffer[p] = 0.299 * r + 0.587 * g + 0.114 * b;
        }

        const { low, high } = computeAutoLevelsBounds(
          grayBuffer,
          targetW,
          targetH,
          QUIET_ZONE_PX
        );
        const span = high - low;

        for (let p = 0, i = 0; p < pixelCount; p++, i += 4) {
          const normalized = ((grayBuffer[p] - low) / span) * 255;
          const clamped = normalized < 0 ? 0 : normalized > 255 ? 255 : normalized;
          const boosted = clampByte((clamped - 128) * CONTRAST_MULTIPLIER + 128);
          data[i] = boosted;
          data[i + 1] = boosted;
          data[i + 2] = boosted;
          data[i + 3] = 255;
        }
      } else {
        for (let i = 0; i < data.length; i += 4) {
          if (shouldInvert) {
            data[i] = 255 - data[i];
            data[i + 1] = 255 - data[i + 1];
            data[i + 2] = 255 - data[i + 2];
          }
          data[i + 3] = 255;
        }
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
