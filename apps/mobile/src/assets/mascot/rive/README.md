# Animações Rive do mascote

Salve nesta pasta os arquivos `.riv` exportados pelo Rive em **Export → For Runtime**.

Arquivo integrado: `aqualino_professor.riv` (exportado pelo MCP do Rive, com fundo transparente).

- Artboard: `Aqualino Professor - Tchau e Piscada`.
- State machine: `Aqualino - Saudacao`.
- Timeline: `Tchau e piscada`.

Use nomes de arquivo em minúsculas, sem espaços ou acentos, separados por `_`.

`OnboardingMascot` carrega o arquivo local com `require()` nas telas `WelcomeScreen` e `OnboardingScreen`. O Metro inclui `.riv` em `assetExts`, empacotando o arquivo no app para uso offline. A animação pausa em segundo plano, fora de foco e com redução de movimento. Se o runtime reportar erro, há fallback para o mascote estático existente.

O runtime instalado é `rive-react-native@9.8.5`. O pacote mais novo `@rive-app/react-native@0.4.20` exige Nitro `<0.36`, incompatível com o `0.37.1` já utilizado pelo projeto. O runtime anterior evita trocar essa dependência. O patch versionado em `patches/rive-react-native@9.8.5.patch` adapta o plugin Kotlin ao AGP 9 do app.

Após instalar as dependências com `pnpm install`, é necessário recompilar o app nativo: `pnpm mobile:android`; no macOS, execute `bundle exec pod install` em `apps/mobile/ios` e depois `pnpm mobile:ios`. Uma recarga do Metro sozinha não instala o módulo nativo. Futuras trocas apenas do `.riv` não exigem alterar o componente.

Guarde os backups editáveis `.rev` em [design/rive/backups](../../../../../../design/rive/backups/). Consulte os detalhes da animação em [design/rive](../../../../../../design/rive/README.md).
# Aqualino chorando

`aqualino_chorando.riv`: rosto vetorial com fundo transparente, lágrimas e soluço em ciclo de 3 segundos.
Artboard: `Aqualino Chorando - Rosto`. State machine: `Aqualino - Choro`.
Usado por `CryingMascot` na Home para `angry` e `skeleton`, que antes usavam a imagem triste.
A reprodução pausa fora da tela, em segundo plano e com redução de movimento; falhas usam a imagem estática.
O export inclui os artboards do documento; selecione explicitamente o artboard pelo nome.
Backup editável: `design/rive/backups/aqualino_chorando_2026-09-09.rev`.
# Aqualino feliz

`aqualino_feliz.riv`: rosto vetorial baseado em `loading_aqualino.png`, com sorriso, piscadas e balanço suave em ciclo de 4 segundos. Fundo transparente.
Artboard: `Aqualino Feliz - Rosto`. State machine: `Aqualino - Feliz`.
Usado por `HappyMascot` nos estados `empty` e `happy` da Home, com pausa em segundo plano, fora da tela e com redução de movimento. Em caso de erro, exibe a imagem feliz estática.
Backup editável: `design/rive/backups/aqualino_feliz_2026-09-09.rev`.
# Aqualino Strong

`aqualino_strong.riv`: versão vetorial de `strong_aqualino.png`, com faixa turquesa, braços flexionados, sorriso e confetes. Fundo transparente e ciclo de 4 segundos.
Artboard: `Aqualino Strong - Forca`. State machine: `Aqualino - Strong`.
`StrongMascot` substitui a imagem forte no estado `boiling` da Home, com pausa fora da tela, em segundo plano e com redução de movimento. Falhas exibem a imagem forte estática.
Backup: `design/rive/backups/aqualino_strong_2026-09-10.rev`.
# Aqualino Loading

`aqualino_loading.riv`: personagem completo baseado em `loading_aqualino.png`, com braços simples, pés com brilho, piscadas, flutuação e três bolinhas de espera. Fundo transparente, ciclo de 4 segundos.
Artboard: `Aqualino Loading`. State machine: `Aqualino - Loading`.
Usado em `HomeLoading` por `LoadingMascot`, com pausa fora de foco, em segundo plano e com redução de movimento. Falhas usam a imagem original estática.
Backup: `design/rive/backups/aqualino_loading_2026-09-10.rev`.
# Fogo do streak

`streak_fire.riv`: chama em três camadas, com tremulação e faíscas em ciclo de 2 segundos.
Artboard: `Streak - Fogo`. State machine: `Streak - Queimando`.
Usado em `HydrationFlame` na Home e no perfil quando `totalMl > 0`. Pausa fora da tela, em segundo plano e com redução de movimento. Sem registro de água, mantém o ícone apagado; falhas do Rive usam o ícone estático.
Backup editável: `design/rive/backups/streak_fire_2026-09-10.rev`.
