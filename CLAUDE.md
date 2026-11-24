@AGENTS.md

## Notas específicas do Claude Code

- As regras do projeto estão em `AGENTS.md` (importado acima). Não as duplique aqui.
- Este repositório **instala hooks no `~/.claude/settings.json`** do próprio usuário. Nunca clique em "Instalar" na central nem chame `claudeHooks('install')` durante testes sem pedido explícito; teste a ponte com `curl` na porta 47800.
- Se o app estiver rodando em dev, ele recebe os hooks desta própria sessão quando instalados. Isso é esperado.
- Para validar visual, prefira `npm run shots` e leia os PNGs em `docs/screenshots/` a descrever o resultado sem ver.

## Contexto de hardware

Wisecoco 8.8" IPS 1920×480 60 Hz, ligada por mini-HDMI (vídeo) e USB-C (energia), vista pelo Windows como segunda tela em modo estendido. O painel é nativamente 480×1920 (em pé), e a rotação automática do `<Stage>` cobre isso. Docks e hubs costumam falhar com essa resolução.
