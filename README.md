# PrintOCR

Aplicação web offline-first e 100% client-side para extração de texto (OCR) focada em capturas de tela (screenshots).

## Como Funciona

- **100% Local e Privado:** O reconhecimento roda direto no navegador via WebAssembly (`tesseract.js`) usando modelos offline (`por` e `eng`). Nenhuma imagem é enviada para servidores ou CDNs externos.
- **Pré-processamento para Prints:** Antes do OCR, a imagem passa por um canvas offscreen com detecção e inversão automática de tema escuro (dark mode), upscale 2x para fontes pequenas de interface e reforço de contraste em escala de cinza.
- **Colagem em Lote com Ctrl + V:** Permite colar prints diretamente na janela (`Ctrl + V`) sem salvar arquivos, gerenciar a fila e exportar o texto consolidado em `.txt`.

## Como Rodar Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 20+)
- [pnpm](https://pnpm.io/)

### Passo a Passo

```bash
# 1. Clone o repositório e acesse o diretório
git clone https://github.com/JoaoLucasG/printocr.git
cd printocr

# 2. Instale as dependências (configura os assets offline automaticamente via postinstall)
pnpm install

# 3. Inicie o servidor de desenvolvimento
pnpm dev
```

Abra no navegador em `http://localhost:5173`.

Para gerar o build estático de produção (`dist/`):
```bash
pnpm build
```

---

> 🤖 *Projeto desenvolvido com assistência de Inteligência Artificial.*
