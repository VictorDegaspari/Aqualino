# Aqualino professor no Rive

Arquivo editável: https://editor.rive.app/file/aqualino/2557663

## Onde salvar os arquivos

- [Animações para o app (`.riv`)](../../apps/mobile/src/assets/mascot/rive/): exportação **For Runtime**; nome previsto `aqualino_professor.riv`.
- [Backups editáveis (`.rev`)](backups/): exportação **For Backup**.
- Prévias estáticas e documentação permanecem nesta pasta (`design/rive/`).

O arquivo `aqualino_professor.riv` está integrado às telas de onboarding por `OnboardingMascot`, com carregamento local e fundo transparente. Veja as [instruções de instalação e recompilação](../../apps/mobile/src/assets/mascot/rive/README.md).

## Personagem e animação

- Artboard: `Aqualino Professor - Tchau e Piscada` (600 × 600).
- Timeline: `Tchau e piscada`, 4 segundos, 60 fps, loop.
- State machine: `Aqualino - Saudacao`, inicia automaticamente a timeline.
- Movimento: levantar o braço, três acenos, piscadinha com o olho direito, retorno ao repouso e piscada com os dois olhos.
- Arte vetorial redesenhada a partir de `aqualino_professor.png`: silhueta arredondada, capelo inclinado, olhos e reflexos maiores, óculos, gravata e degradês de volume em azul/ciano.

Revisão visual: `aqualino-professor-refinado.png` mostra a nova pose inicial. `aqualino-professor-refinado-piscada.png` mostra a pose do quadro 98 aplicada para inspeção, restaurada em seguida. A simulação de 240 quadros foi repetida com sucesso após a revisão. As imagens são prévias estáticas; a animação editável permanece no Rive.

A conexão oficial do editor foi validada em `http://127.0.0.1:9791/mcp` e registrada em `~/.codex/config.toml`. O Rive desktop precisa estar aberto.

Validação: hierarquia e propriedades consultadas via MCP; simulação de 240 quadros confirmou a transição Entry → Tchau e piscada; poses conferidas com a captura do artboard. `aqualino-piscada.png` é uma captura estática da pose do quadro 98, aplicada para inspeção e depois restaurada à pose inicial.

A exportação foi liberada após a atualização do plano: `.riv` salvo no app e `.rev` em `backups/`. O artboard do professor foi marcado para inclusão na exportação. Para reproduzir no editor, selecione a timeline em Animate e pressione Play.

Validação da integração: TypeScript e lint aprovados; 16 testes do onboarding aprovados; bundle Android gerado com o `.riv` em `raw/`. O arquivo exportado também foi carregado no runtime web oficial: artboard e máquina de estados encontrados, quadros diferentes durante a reprodução e fundo transparente. A suíte completa teve 322 testes aprovados e uma falha não relacionada em `GroupChallengePanel.test.tsx` (expectativa pelo texto “15 minutos”). A compilação nativa e o teste em aparelho ainda precisam ser feitos em um ambiente com Android SDK/JDK compatível ou macOS/Xcode.
