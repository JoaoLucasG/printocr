# PrintOCR

Aplicação web **100% client-side** e **offline-first** para extração de texto (OCR) otimizada especificamente para **prints de tela (screenshots)**.

Todo o processamento — pré-processamento de imagem em `<canvas>` offscreen e reconhecimento via WebAssembly com `tesseract.js` — acontece localmente no seu navegador, **sem backend, sem uploads e sem requisições a CDNs externos**.

---

## Por que o PrintOCR é melhor que OCR genérico para prints?

Ferramentas de OCR tradicionais foram projetadas para documentos digitalizados (papel branco, texto preto, alta DPI) e costumam falhar em capturas de tela modernas. O **PrintOCR** resolve isso automaticamente antes de enviar a imagem ao motor OCR:

1. **Detecção e Auto-Inversão de Dark Mode**: Calcula a luminância média da captura; quando detecta tema escuro (luminância `< 128`), inverte os canais RGB automaticamente para entregar texto escuro em fundo claro — aumentando drasticamente a precisão em prints de IDEs, terminais, Discord, Slack e dashboards dark.
2. **Upscale 2x Local para Fontes Pequenas**: Redimensiona o screenshot em 2x no Canvas offscreen (com suavização de alta qualidade) + conversão para escala de cinza e leve reforço de contraste, ajudando o Tesseract a ler fontes pequenas de interface sem serrilhamento.
3. **Fluxo `Ctrl + V` em Lote (Sem Salvar Arquivos)**: Escuta o evento `paste` em toda a janela. Tire vários prints em sequência (`Win + Shift + S`, Flameshot, Spectacle, macOS Screenshot) e vá colando diretamente na página (`print-01.png`, `print-02.png`, ...) para gerar um único `.txt` consolidado na ordem da fila.

---

## Arquitetura 100% Offline (Zero CDN)

- O script [`scripts/setup-tesseract.mjs`](scripts/setup-tesseract.mjs) é executado automaticamente via `postinstall` (`pnpm install`), copiando `worker.min.js` e os binários WASM (`tesseract-core-simd.wasm.js` e variantes) de `node_modules` para `public/tesseract/`.
- Os modelos de idioma compactados (`por.traineddata.gz` e `eng.traineddata.gz`) são salvos em `public/tesseract/lang-data/`.
- O `createWorker` aponta `workerPath`, `corePath` e `langPath` exclusivamente para `/tesseract/`, garantindo funcionamento completo mesmo offline ou em redes restritas.

---

## Como rodar localmente

Pré-requisitos: **Node.js 20+** e **pnpm**.

```bash
# 1. Instale as dependências (o postinstall prepara public/tesseract/ automaticamente)
pnpm install

# 2. Inicie o servidor de desenvolvimento
pnpm dev

# 3. Build de produção estático (pasta dist/)
pnpm build
```

> Caso precise reexecutar apenas a preparação dos assets offline do Tesseract:
> ```bash
> pnpm run setup:tesseract
> ```

---

## Deploy Estático (Sem Backend)

Por ser uma SPA 100% estática (`dist/`), o PrintOCR pode ser publicado gratuitamente em qualquer hospedagem estática:

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

- **Install Command:** `pnpm install`
- **Build Command:** `pnpm build`
- **Output Directory:** `dist`

### Cloudflare Pages

- **Build command:** `pnpm install && pnpm build`
- **Build output directory:** `dist`

### GitHub Pages

1. Em `vite.config.ts`, configure `base: '/<nome-do-repo>/'` caso publique em subpath (`https://usuario.github.io/<nome-do-repo>/`).
2. Execute `pnpm install && pnpm build` no GitHub Actions e publique o conteúdo de `dist/`.

---

## Stack

- **Vite + React + TypeScript**
- **Tailwind CSS v4**
- **tesseract.js** (Web Worker + WASM local)
- **lucide-react**
