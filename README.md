# Vick Control Center

Dashboard animado para a telinha 1920×480 + central de controle (Electron + Preact + TypeScript).

```bash
npm install
npm run dev          # desenvolve (sem telinha abre uma janela de prévia 4:1)
npm run typecheck
npm run dist:win     # gera dist/Vick-Control-Center-<versão>-portable.exe (cross-build no Mac, sem Wine)
```

- **Palco fixo 1920×480** escalado/girado para qualquer janela (`src/renderer/common/Stage.tsx`).
- **Ponte com o Claude Code**: servidor HTTP em `127.0.0.1:47800`; a central instala hooks + statusLine em `~/.claude/settings.json` (com backup `.vick-backup`).
- **Zoho CRM**: OAuth "Self Client" (refresh token) + polling em Leads, Deals e Events; modo demonstração para testar.
- **Atalhos globais**: Ctrl+Alt+1..4 (Disponível, Ocupado, Não perturbe, Ausente).
- Config em `%APPDATA%/vick-control-center/config.json`; fundos próprios em `media/`.
