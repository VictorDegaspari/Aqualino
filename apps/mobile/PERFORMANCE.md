# Performance do aplicativo móvel

Este arquivo registra o baseline e as decisões de renderização. Consulte-o antes de iniciar outra auditoria para evitar repetir a leitura de toda a árvore React.

## Baseline local — 2026-09-04

Comando de produção usado:

```bash
pnpm exec react-native bundle --platform android --dev false --entry-file index.js --bundle-output <temporário>/index.android.bundle --assets-dest <temporário>/assets
```

- bundle JavaScript bruto após a otimização: `3.056.069` bytes;
- assets copiados pelo Metro após a otimização: `2.596.840` bytes, em 69 arquivos;
- antes da conversão dos avatares, os assets ocupavam aproximadamente `12 MB`;
- oito avatares WebP lossless: `1.431.850` bytes no total;
- cada avatar possui `512 × 512` pixels e canal alfa preservado;
- antes da conversão, os PNGs `1254 × 1254` somavam `10.285.163` bytes.

O tamanho bruto do bundle não equivale ao tamanho final baixado da loja, pois APK/AAB aplicam empacotamento e compressão. Ele serve como baseline comparável entre alterações locais.

## Cold start aberto pelo widget — 2026-09-04

### Ambiente medido

- aparelho físico: Samsung Galaxy A30s (`SM-A307GT`), Android 11, arm64;
- APK `1.0` debug, com New Architecture, Hermes e bundle servido pelo Metro;
- deep link: `aqualino://hydrate/quick?source=widget`;
- sessão do aparelho durante a amostra: sem token, portanto o guarda terminou nos steps de entrada;
- redirects ADB de `tcp:8080` e `tcp:8081` estavam ativos; a API local não participou dessa amostra sem token;
- ferramenta: `adb shell am start -W`, gravação curta da tela e `logcat` filtrado pelo PID do app.

Os números abaixo não representam o release publicado. Eles servem para separar custo nativo, custo exclusivo do ambiente de desenvolvimento e trabalho JavaScript que também existe em produção.

### Resultado

| Marco | Resultado | Interpretação |
| --- | ---: | --- |
| Primeiro frame da Activity pelo widget | `2.221 ms` | Cold start nativo/debug; ainda mostra a superfície de carregamento, não o registro rápido. |
| Primeiro frame da Activity pelo ícone | `2.155 ms` | Diferença de apenas `66 ms`; o Intent do widget não é o gargalo. |
| Início do carregamento do bundle Metro até `Running "Aqualino"` | `3.311 ms` | Custo do APK debug e da transferência/execução pelo Metro; não existe dessa forma no release. |
| `Running "Aqualino"` até inicialização do root do Gesture Handler | `4.118 ms` | Inicialização do runtime, módulos e grafo React no aparelho de entrada. |
| Carregamento do Metro até a primeira criação de `ScrollView` da rota final | aproximadamente `12.243 ms` | Tempo observado no debug antes da tela de entrada; inclui as etapas abaixo e não deve ser usado como meta de release. |

O `logcat` também registrou uma pausa de GC de aproximadamente `41 ms`, inicialização do Nitro/SQLite, Keychain e MMKV durante o caminho inicial.

### Causas identificadas e status

| Causa | Correção aplicada |
| --- | --- |
| Espera estética obrigatória de `1.300 ms` em `AppNavigation` | Removida. A tela de loading permanece somente enquanto a sessão está realmente em `booting`. |
| Token e usuário lidos sequencialmente do Keychain | As leituras começam em paralelo. Sem token, a rota muda para `signedOut` sem aguardar a limpeza do usuário órfão. |
| Banco aberto na construção de `SQLiteOutboxStore` | A conexão agora é lazy e abre somente na primeira operação. |
| Sincronização offline concorrendo com a primeira tela | Só inicia com sessão `signedIn`, depois de dois frames e mais 500 ms. Usuário desconectado não abre o banco. |
| Todas as telas importadas antecipadamente pelo navigator | Telas usam `getComponent`; `QuickHydrationRoute` foi isolada em módulo próprio. |
| Registro rápido inicia a query completa da Home | `useQuickHydration` monta somente a mutation; ainda reconcilia a Home quando já existe cache. |
| `/me` pode aguardar indefinidamente sem usuário em cache | A chamada agora aborta depois de cinco segundos com `REQUEST_TIMEOUT`. |
| `127.0.0.1:8080` em aparelho físico exige redirecionamento | Continua sendo requisito do ambiente local: usar `adb reverse tcp:8080 tcp:8080` ou uma URL alcançável. |

O APK debug continua baixando o bundle do Metro antes de montar React. Na amostra, essa fase consumiu mais de três segundos e exibiu a tela nativa de download. Esse custo não existe dessa forma no release e não pode ser corrigido pela navegação do app.

O update do Glance disparado ao detectar ausência de sessão apareceu no mesmo período, mas é iniciado em coroutine de IO e não foi identificado como causa primária do bloqueio visual.

### Verificação indicativa após as correções

Uma nova rodada fria, no mesmo aparelho e ainda em debug, apresentou:

| Marco | Antes | Depois |
| --- | ---: | ---: |
| Primeiro frame da Activity | `2.221 ms` | `2.183 ms` |
| Metro `Creating BundleLoader` até `Running "Aqualino"` | `3.311 ms` | `3.335 ms` |
| Metro `Creating BundleLoader` até a primeira `ScrollView` da rota final | `12.243 ms` | `11.227 ms` |

O trecho comparável até a rota caiu aproximadamente `1.016 ms` nessa amostra, cerca de 8,3%. Uma única rodada debug tem alta variância e não constitui benchmark final. O resultado estrutural mais importante foi a ausência da inicialização do proxy/banco Nitro SQLite antes da tela desconectada; apenas o registro nativo da biblioteca, feito pelo autolinking, continua no início do processo.

O bundle Android de produção continuou estável em aproximadamente `3,06 MB` de JavaScript bruto e `2,60 MB` de assets.

### Benchmark release no aparelho físico

Foi gerado um APK release arm64 com Hermes, instalado temporariamente no mesmo Galaxy A30s e aberto diretamente pelo deep link do widget. A primeira execução após a instalação foi descartada (`513 ms`); as cinco partidas frias válidas foram medidas com `adb shell am start -W -S`.

| Execução válida | `TotalTime` |
| --- | ---: |
| 1 | `460 ms` |
| 2 | `454 ms` |
| 3 | `455 ms` |
| 4 | `473 ms` |
| 5 | `448 ms` |
| **Mediana** | **`455 ms`** |
| **P90 (nearest-rank)** | **`473 ms`** |

O primeiro frame release ficou aproximadamente 79,5% abaixo do baseline debug de `2.221 ms`. Essa comparação confirma o impacto do Metro e da instrumentação de desenvolvimento, mas `am start -W` mede a Activity desenhada pelo sistema, não o instante em que o botão da tela React já aceita interação. A sessão continuava desconectada, então o guarda encaminhou para a entrada em vez de exibir o registro rápido.

O APK release produzido ocupou aproximadamente `40 MB`. O build também passou a declarar explicitamente o `hermesCommand`, pois o pnpm mantém `hermes-compiler` na raiz do monorepo e o caminho padrão do plugin Gradle apontava para `apps/mobile/node_modules`.

### Protocolo para as próximas medições

1. medir separadamente sessão válida com cache e sessão válida sem cache;
2. instrumentar o instante em que `QuickHydration` se torna interativa, além do primeiro frame registrado pelo Android;
3. comparar a abertura release pelo widget e pelo ícone;
4. coletar Perfetto/System Trace para JS thread, main thread, I/O e GC;
5. repetir em um Android recente;
6. fazer o equivalente com Instruments/Points of Interest no iOS.

## Melhorias aplicadas

- Stores Zustand são consumidos por seletores de campo; componentes não assinam o estado inteiro.
- Callbacks enviados pela Home, Inventário, Grupos e Lembretes possuem identidade estável.
- Fundo, parallax, caminho SVG, cabeçalho, botão, placar e jogadores da Home são componentes puros memoizados.
- Cards de lembrete são memoizados e recebem ações estáveis; alterar um lembrete não recria os handlers de todos os cards.
- O terceiro step de entrada foi extraído para `AccountAccessStep`; `WelcomeScreen` mantém apenas a orquestração do fluxo.
- Avatares usam WebP lossless e `resizeMethod="resize"` nos tamanhos pequenos exibidos pelo Android, reduzindo o bundle e o custo de decodificação em memória.
- O loading inicial não possui mais duração artificial mínima.
- Telas do stack são carregadas sob demanda e a rota rápida fica em um módulo isolado.
- Keychain inicia as leituras em paralelo; SQLite e sincronização offline saíram do caminho crítico desconectado.
- O registro rápido não dispara a query completa da Home e `/me` possui timeout de cinco segundos.

## Avatares

Os avatares são exibidos entre aproximadamente 38 e 116 pontos. Os derivados WebP de `512 × 512` atendem telas Android de densidade 4x e telas iOS de densidade 3x sem perda perceptível no maior tamanho atual. Os PNGs mestres devem permanecer no repositório de design, fora do bundle do aplicativo.

Se o avatar passar a ocupar uma área maior, gere um novo derivado adequado em vez de voltar a incluir os masters no bundle. Confira Perfil, Grupos e placar em aparelho físico depois de mudanças nesses arquivos.

## Regras para novas telas

- Assinar somente os campos realmente usados de cada store.
- Usar `memo` em componentes puros caros ou repetidos; não aplicar indiscriminadamente.
- Estabilizar callbacks apenas quando atravessam a fronteira de um componente memoizado ou são dependências de effects.
- Usar `FlatList`/`SectionList` quando a quantidade de itens puder crescer; `ScrollView` continua adequado para conjuntos pequenos e limitados.
- Manter cálculos derivados caros em `useMemo`, depois de confirmar que suas dependências são estáveis.
- Medir em build de produção e aparelho físico antes de atribuir lentidão ao JavaScript.
