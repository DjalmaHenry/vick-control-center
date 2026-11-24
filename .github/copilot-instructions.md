# Instruções para o GitHub Copilot

Siga as regras de [AGENTS.md](../AGENTS.md), a fonte única das convenções deste repositório. Resumo do que mais causa erro:

- Node 22+ (`.nvmrc`); valide com `npm run typecheck` e `npm run build`.
- O dashboard é desenhado em 1920×480 fixos dentro de `<Stage>`; nada de `vw`/`vh`/media queries no palco.
- Preact 11: números em `style` não recebem `px`; use strings com unidade.
- Método novo em `window.vick` exige mudar `VickApi` (types), preload + `ipcMain`, e o mock em `renderer/common/api.ts`.
- Sem dependências nativas, sem admin, e nenhuma credencial do Zoho no código.
- Interface em pt-BR, minimalista, com os tokens de cor do `stage.css`.
