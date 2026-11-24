# AGENTS.md — instruções para agentes de IA

Fonte única de regras para qualquer assistente (Claude Code, Codex, Copilot, Cursor etc.) trabalhando neste repositório. `CLAUDE.md`, `.github/copilot-instructions.md` e `.cursor/rules/` apenas apontam para cá. **Atualize este arquivo quando uma regra mudar.**

## O produto em uma frase

App desktop (Electron) que mostra um dashboard animado numa **tela-barra de 1920×480** ao lado de um notebook **Windows corporativo**, mais uma central de controle para personalizar. O desenvolvimento acontece no **macOS**; o `.exe` é gerado no Mac.

## Ambiente — leia antes de rodar qualquer coisa

- **Node 22+ é obrigatório** (`.nvmrc`). Máquinas com nvm podem abrir o shell no Node 16: o `electron-vite` então quebra com `styleText`/`node:util`, e se a saída estiver num pipe (`| tail`, `| grep`) o erro passa despercebido e você acaba usando um `out/` velho. Sempre confira `node -v` e o `✓ built` no fim do build.
- Instalação: `npm install`. Se `node_modules/electron/dist` não existir (scripts de instalação bloqueados), rode `node node_modules/electron/install.js`.
- Antes de concluir qualquer mudança: `npm run typecheck` **e** `npm run build`, os dois sem erro.
- `npm run dist:win` demora vários minutos (7-Zip máximo + NSIS). Rode em segundo plano e não rode duas vezes ao mesmo tempo.

## Comandos

| Comando | Uso |
|---|---|
| `npm run dev` | App em dev (central + janela de prévia 960×240) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Build em `out/` |
| `npm run shots` | Build + regenera `docs/screenshots/*.png` em 1920×480 (estado simulado) |
| `npm run dist:win` | `.exe` portable x64 em `dist/` |

## Mapa do código

```
src/main/       Node/Electron: store.ts (estado + config.json), windows.ts (telinha/prévia/central),
                claude.ts (servidor 127.0.0.1:47800 + instalador de hooks), zoho.ts (OAuth, polling, demo),
                index.ts (IPC, bandeja, atalhos, protocolo vick-media://)
src/preload/    Ponte contextIsolation → window.vick (tipo VickApi)
src/shared/     types.ts e defaults.ts, usados por main e renderer
src/renderer/   common/ (Stage, Background, widgets, Mascot, AlertLayer, stage.css, api.ts),
                dashboard/ (telinha), control/ (central)
scripts/        screenshots.cjs
```

## Regras que evitam bugs reais

### Layout da telinha
- Todo o dashboard é desenhado em **coordenadas fixas de 1920×480** dentro de `<Stage>`, que só aplica `transform: scale/rotate`. **Não use** `vw`/`vh`, media queries nem `window.innerWidth` dentro do palco: a prévia da central e a telinha devem renderizar idênticas.
- `stage.css` aplica `box-sizing: border-box` dentro de `.stage`. Painéis usam `height: 100%` do slot. Não reintroduza padding que estoure a altura: valide com um print (`npm run shots`).
- O grid tem 12 colunas (~126 px cada com o mascote ligado). Um widget novo precisa caber na sua `minSpan` sem texto quebrando de forma feia. Use `white-space: nowrap` + `text-overflow` para números e rótulos.

### Preact 11
- **Valores numéricos em `style` não ganham `px` automaticamente.** Escreva ``{ width: `${n}px` }`` ou `{ gap: '12px' }`. Só propriedades sem unidade (`opacity`, `flexGrow`, `zIndex`) aceitam número.
- Variáveis CSS via style: `style={{ '--accent': cor }}`.

### API entre processos (três lugares sempre juntos)
Ao adicionar ou alterar um método de `window.vick`:
1. o tipo `VickApi` em `src/shared/types.ts`;
2. a implementação em `src/preload/index.ts` + `ipcMain.handle` em `src/main/index.ts`;
3. o **mock** em `src/renderer/common/api.ts` (usado no navegador e pelo `npm run shots`).
O renderer **nunca** importa módulos Node/Electron; tudo passa pelo preload.

### Estado e config
- Estado único no main (`store`). Os renderers só leem (`state`) e pedem mudanças por IPC. Eventos efêmeros (alertas, falas do mascote) vão por `store.emit`, não pelo estado.
- Campo novo de config: adicione em `Config` (types) **e** em `defaultConfig` (defaults). O `merge` cuida de configs antigas já salvas.
- Config do usuário fica em `app.getPath('userData')/config.json`, nunca no repositório.

### Integração com o Claude Code
- Porta fixa `47800` (`HOOK_PORT`). Os hooks instalados são reconhecidos pela string `127.0.0.1:47800`: se mudar o comando, mantenha essa marca, senão `Remover` deixa lixo no `settings.json` do usuário.
- **Nunca rode `claudeHooks('install')` nem edite `~/.claude/settings.json` da máquina do desenvolvedor** sem ele pedir. Para testar, faça POST direto:
  `curl -s -X POST -H "Content-Type: application/json" -d '{"hook_event_name":"UserPromptSubmit","session_id":"t","prompt":"teste"}' http://127.0.0.1:47800/hook`
- O parsing do payload deve ser defensivo (campos ausentes não podem derrubar o servidor).

### Zoho CRM
- Credenciais (client id/secret/refresh token) só em `config.json` local. **Nunca** em código, testes, prints, logs ou commits.
- Sem credenciais, use `zoho.demo = true`. A primeira leitura real é silenciosa (`firstRun`), para não disparar alertas de itens antigos.

### Alvo Windows corporativo
- Nada que exija admin, driver ou serviço. Autostart via `setLoginItemSettings` (HKCU).
- **Sem dependências nativas** (`node-gyp`, `.node`): o cross-build Mac→Windows não as compila. Prefira APIs do Node/Electron.
- `signAndEditExecutable: false` no `electron-builder.yml` é proposital (sem Wine no Mac). Não remova.
- Fontes são empacotadas via `@fontsource/*`. Nada de CDN em runtime: o app precisa funcionar offline.

## Design e texto

- Visual **HUD escuro**. Tokens em `:root` no `stage.css` (`--cyan`, `--amber`, `--red`, `--green`, `--violet`). Use os tokens, não hex soltos.
- Tipografia: `Chakra Petch` (display/números) e `IBM Plex Sans` (texto).
- Central de controle **minimalista**: pouco texto, ícones com `title`/`aria-label`, sem explicações longas na interface.
- Interface em **pt-BR**, sentence case, sem caixa alta em rótulos.
- Animações contínuas devem ser CSS ou `requestAnimationFrame` e mirar 60 fps em notebook comum; respeite `prefers-reduced-motion`.

## Git

- Commits no padrão Conventional Commits, em pt-BR (`feat:`, `fix:`, `docs:`, `chore:`).
- Não versionar `out/`, `dist/`, `node_modules/` (já no `.gitignore`).
- Mudança visual → regenere os prints afetados com `npm run shots` e confira as imagens antes de commitar.
