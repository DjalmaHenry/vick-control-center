# Telinha Dashboard

App para controlar uma **telinha-barra de 8.8" (1920×480)** que fica ao lado do notebook da empresa (Windows) e mostra um dashboard personalizável, com animações contínuas.

## Hardware (já escolhido)

- **Wisecoco 8.8" IPS 1920×480, 60 Hz** (AliExpress).
- É um **monitor comum**: vídeo por **mini-HDMI** e alimentação pela USB-C (cabo USB-A → USB-C). No Windows aparece como **segunda tela** (modo estendido). Não precisa de driver nem de protocolo proprietário.
- O painel é nativamente em pé (480×1920). Pode ser preciso girar para "Paisagem" nas configurações de vídeo do Windows.
- Por causa da resolução incomum, docks e hubs costumam falhar. Ligar direto no HDMI do notebook ou usar um adaptador USB-C → HDMI simples.
- Medidas: ~233 × 66 × 13–18 mm, área visível de ~219 × 55 mm. A furação traseira é 75 × 50 mm (não é VESA padrão).
- Descartados: as telas Turzx/Turing "smart screen" (3.5" e 9.2"). Elas recebem quadros por um protocolo USB, então animação fluida é limitada, e o suporte open source à de 9.2" é recente.

## Objetivo do software

1. Mostrar o dashboard **em tela cheia, fixado na telinha**, com animações (60 fps).
2. Ser **fácil de personalizar**: escolher widgets e layout sem mexer em código.
3. Widgets desejados:
   - **Status de escritório**: Ocupado / Não perturbe / Disponível, com troca rápida.
   - **Acompanhamento do Claude Code**: tarefa ativa, uso de tokens/contexto/custo da sessão e **alerta destacado quando o Claude pedir aprovação**.
   - **Integração com o Zoho** (o escopo ainda precisa ser definido: Projects? CRM? Desk? Cliq?).

## Arquitetura sugerida (ainda pode mudar)

- **Frontend do dashboard**: web (HTML/CSS/canvas), renderizado em 1920×480.
- **App desktop**: Electron ou Tauri, com uma janela sem moldura, em tela cheia, posicionada no monitor de 1920×480 (detectar pelo tamanho do display) e mais uma janela/bandeja para configuração.
- **Servidor local** (WebSocket) que recebe eventos e repassa para o dashboard.
- **Integração com o Claude Code** (via `~/.claude/settings.json`):
  - `statusLine`: um script que roda após cada requisição à API e recebe JSON (modelo, contexto, custo etc.). Ele repassa esse JSON para o servidor local.
  - Hook `PermissionRequest` / `Notification`: dispara quando o Claude pede permissão ou input, e o dashboard mostra o alerta.
  - Hooks `Stop` / `UserPromptSubmit`: marcam a tarefa como concluída / em andamento.
- **Status "Ocupado"**: atalho de teclado global, ícone na bandeja e, no futuro, talvez status do calendário ou do Slack/Teams.

## Restrições

- O alvo é **Windows** em **notebook corporativo**. Evitar qualquer coisa que exija admin ou driver.
- O desenvolvimento acontece num **Mac**, então o código deve ser multiplataforma e testável sem a telinha (por exemplo, uma janela de preview 1920×480).
- O dev é engenheiro de software. Pode explicar em nível técnico.

## Próximos passos

1. Fechar a stack (Electron vs Tauri) e criar o scaffold.
2. Fazer o preview 1920×480 com um tema animado de exemplo.
3. Implementar o widget de status (Ocupado / Não perturbe).
4. Implementar a ponte com o Claude Code (statusLine + hooks → WebSocket).
5. Definir e implementar a integração com o Zoho.
