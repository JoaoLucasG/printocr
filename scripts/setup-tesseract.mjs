import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicTesseractDir = path.join(rootDir, 'public', 'tesseract');
const langDataDir = path.join(publicTesseractDir, 'lang-data');

const require = createRequire(import.meta.url);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFileSafe(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`Arquivo de origem não encontrado: ${src}`);
  }
  fs.copyFileSync(src, dest);
}

async function downloadFile(urls, destPath) {
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1024) {
    console.log(`[setup-tesseract] Cache local existente: ${path.relative(rootDir, destPath)}`);
    return;
  }

  let lastError = null;
  for (const url of urls) {
    try {
      console.log(`[setup-tesseract] Baixando ${path.basename(destPath)} de ${url}...`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length < 1024 || buffer[0] !== 0x1f || buffer[1] !== 0x8b) {
        throw new Error(`Arquivo baixado inválido ou não está em formato gzip (${buffer.length} bytes)`);
      }
      fs.writeFileSync(destPath, buffer);
      console.log(
        `[setup-tesseract] Salvo: ${path.relative(rootDir, destPath)} (${(
          buffer.length /
          1024 /
          1024
        ).toFixed(2)} MB)`
      );
      return;
    } catch (err) {
      lastError = err;
      console.warn(`[setup-tesseract] Falha ao baixar de ${url}: ${err.message}`);
    }
  }

  throw new Error(
    `Não foi possível baixar ${path.basename(destPath)}: ${lastError?.message ?? 'erro desconhecido'}`
  );
}

async function main() {
  ensureDir(publicTesseractDir);
  ensureDir(langDataDir);

  let tesseractPkgPath;
  try {
    tesseractPkgPath = require.resolve('tesseract.js/package.json');
  } catch {
    console.warn('[setup-tesseract] tesseract.js ainda não instalado; pulando cópia.');
    return;
  }

  const tesseractDir = path.dirname(tesseractPkgPath);
  const tesseractDistDir = path.join(tesseractDir, 'dist');

  const tesseractRequire = createRequire(tesseractPkgPath);
  const corePkgPath = tesseractRequire.resolve('tesseract.js-core/package.json');
  const coreDir = path.dirname(corePkgPath);

  // Copia worker.min.js
  copyFileSafe(
    path.join(tesseractDistDir, 'worker.min.js'),
    path.join(publicTesseractDir, 'worker.min.js')
  );
  console.log('[setup-tesseract] Copiado: public/tesseract/worker.min.js');

  // Copia tesseract-core-simd.wasm.js e variantes LSTM/non-SIMD para fallback seguro em /tesseract/
  const coreFiles = [
    'tesseract-core-simd.wasm.js',
    'tesseract-core-simd-lstm.wasm.js',
    'tesseract-core-lstm.wasm.js',
    'tesseract-core.wasm.js',
  ];

  for (const fileName of coreFiles) {
    const src = path.join(coreDir, fileName);
    if (fs.existsSync(src)) {
      copyFileSafe(src, path.join(publicTesseractDir, fileName));
      console.log(`[setup-tesseract] Copiado: public/tesseract/${fileName}`);
    }
  }

  // Baixa modelos de idioma compactados (.traineddata.gz) para uso 100% offline
  const languages = ['por', 'eng'];
  for (const lang of languages) {
    const destPath = path.join(langDataDir, `${lang}.traineddata.gz`);
    const candidateUrls = [
      `https://cdn.jsdelivr.net/npm/@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz`,
      `https://github.com/naptha/tessdata/raw/gh-pages/4.0.0_best/${lang}.traineddata.gz`,
    ];
    await downloadFile(candidateUrls, destPath);
  }

  console.log('[setup-tesseract] Assets offline prontos em public/tesseract/.');
}

main().catch((err) => {
  console.error('[setup-tesseract] Erro:', err);
  process.exit(1);
});
