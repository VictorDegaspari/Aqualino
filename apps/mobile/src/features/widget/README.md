# Widgets do Aqualino

Esta é a referência técnica e funcional dos widgets da tela inicial. Consulte este arquivo antes de alterar o contrato, o layout nativo, os previews, o deep link ou a sincronização para evitar uma nova leitura de toda a implementação Android e iOS.

## Escopo atual

Os widgets são nativos e funcionam sem manter o processo React Native aberto.

| Plataforma | Implementação | Versão mínima | Tamanhos |
| --- | --- | --- | --- |
| Android | Jetpack Glance 1.1.1 | API 24 / Android 7 | pequeno 2×2 e horizontal 4×2 |
| iOS | WidgetKit + SwiftUI | iOS 15.1 | `systemSmall` e `systemMedium` |

O tamanho pequeno mostra sequência, mascote e frase. O horizontal também mostra os cinco dias mais recentes. Os dois abrem o registro rápido de água ao toque.

Não existem widgets redimensionáveis, `systemLarge`, tela bloqueada, Live Activity ou registro de água diretamente no widget. Essas possibilidades não devem ser presumidas pela interface React Native.

## Arquitetura

```text
API / cache local
      |
      v
OfflineHydrationService
      |
      v
widgetBridge.ts -- acrescenta is_authenticated
      |
      v
NativeAqualinoWidget (TurboModule)
      |
      +--> Android SharedPreferences --> Jetpack Glance
      |
      +--> iOS App Group UserDefaults --> WidgetKit

Widget -- aqualino://hydrate/quick?source=widget --> AppNavigation
```

O widget não chama a API, não recebe token e não conhece e-mail, nome ou outros dados pessoais. Ele renderiza somente o último snapshot JSON gravado pelo aplicativo. A API continua sendo a fonte de verdade para sequência, condição do mascote e totais reconciliados.

O módulo exposto ao JavaScript está em [`specs/NativeAqualinoWidget.ts`](../../../specs/NativeAqualinoWidget.ts) e oferece:

- `writeSnapshot`: grava o JSON de forma síncrona no armazenamento nativo;
- `requestReload`: pede a atualização das instâncias instaladas;
- `getSchemaVersion`: impede que JavaScript e código nativo usem contratos incompatíveis;
- `setAppIconMood`: alterna o ícone feliz ou triste do aplicativo;
- `readPendingAction`: reservado para ações nativas futuras; o toque atual usa deep link.

## Contrato do snapshot

O contrato público fica em [`packages/contracts/src/index.ts`](../../../../../packages/contracts/src/index.ts). O schema atual é `2`.

| Campo | Uso |
| --- | --- |
| `schema_version` | Precisa ser `2`; outra versão produz o estado seguro desconectado. |
| `generated_at` | Data ISO-8601 da geração e validação básica do snapshot. |
| `user_timezone` | Calcula os cinco dias civis no fuso do perfil. |
| `last_log_at` | Mantido no contrato para semântica e evolução do snapshot. |
| `days_since_last_log` | Ajuda a migrar snapshots antigos no cache React Native. |
| `last_log_semantic_key` | Semântica do último registro usada pela atualização otimista. |
| `current_streak` | Quantidade de dias consecutivos mostrada no título e nos checks. |
| `today_total_ml` | Determina se o dia atual já conta para a sequência; o mínimo é 50 ml. |
| `daily_goal_ml` | Permite identificar meta atingida e escolher apresentação do mascote. |
| `condition` | Seleciona frases, cores e humor: `empty`, `happy`, `angry`, `boiling` ou `skeleton`. |
| `decoration`, `animation` | Metadados do mascote mantidos no contrato; o widget atual é estático. |
| `static_asset` | Compatibilidade com a resposta da API; os renderizadores atuais escolhem o asset final pela condição, variação e meta. |
| `is_authenticated` | Campo local acrescentado por `widgetBridge`; nunca vem da API. |

Ao evoluir o schema, altere em conjunto:

1. o tipo `WidgetSnapshot` do pacote de contratos e a resposta da API;
2. `sessionSnapshot` e a migração do cache React Native;
3. `SCHEMA_VERSION`, o modelo e o parser Kotlin;
4. `schemaVersion`, `WidgetSnapshot.CodingKeys` e o decoder Swift;
5. fixtures e testes;
6. este documento e o ADR 0004.

Nunca reutilize uma versão com significado diferente. Dados incompatíveis devem cair no fallback seguro, não ser interpretados parcialmente.

## Estados de apresentação

| Estado | Conteúdo |
| --- | --- |
| Sem snapshot, JSON inválido ou schema incompatível | Estado desconectado seguro. |
| `is_authenticated: false` | Frase “Você está desconectado da conta”, Aqualino triste e fundo espacial em degradê; sequência e dias ficam ocultos. |
| Autenticado, tamanho pequeno | Sequência, Aqualino e frase curta. |
| Autenticado, tamanho horizontal | Sequência, frase, janela de cinco dias e Aqualino maior. |

Não há skeleton de rede no widget. A condição de domínio `skeleton` representa o humor do mascote por longo tempo sem água e não um carregamento. Isso evita loading infinito quando o aplicativo ainda não gravou dados.

Os cinco marcadores terminam no dia atual e usam o fuso do perfil. As iniciais seguem `D S T Q Q S S`. Dias consecutivos concluídos são agrupados em uma cápsula arredondada com checks; dias pendentes permanecem circulares.

## Cores, frases e mascote

Cada condição possui três combinações de frase e paleta. A variação é determinística em janelas de três horas, portanto a apresentação muda periodicamente sem trocar a cada recomposição.

- `empty`: Aqualino feliz e convite para o primeiro registro;
- `happy`: mensagens positivas; pode usar Aqualino forte quando a meta foi atingida;
- `angry` e `skeleton`: Aqualino triste;
- `boiling`: alterna Aqualino triste e forte;
- desconectado: sempre Aqualino triste e paleta espacial.

Android e iOS implementam a mesma regra separadamente. Toda alteração de frases, cores, dimensões ou condição precisa ser replicada e revisada nas duas plataformas.

Os textos estão atualmente fixos em português dentro dos renderizadores nativos. A localização automática conforme `locale` do perfil ainda é uma limitação conhecida; quando for implementada, o locale deverá entrar no snapshot ou no armazenamento compartilhado e todos os textos e labels de acessibilidade deverão usar recursos localizados.

## Arredondamento e fundo

- Android 12+: `appWidgetBackground()` e o raio `system_app_widget_background_radius` permitem ao launcher aplicar recorte e transições corretos.
- Android 7–11: drawables próprios preservam visualmente os cantos; o recorte final ainda pode variar conforme o launcher.
- iOS 17+: `containerBackground(for: .widget)` integra o fundo ao sistema.
- iOS 15.1–16: fundo e `ContainerRelativeShape` são aplicados pela própria view.

Não use um retângulo opaco fora da superfície arredondada. Ao trocar o fundo, confira também o modo desconectado e os fallbacks de preview.

## Previews no seletor

As prévias não dependem de login nem de snapshot real.

No Android, cada receiver aponta para:

- `previewLayout`, usado em launchers compatíveis, especialmente Android 12+;
- `previewImage`, fallback estático para versões e launchers antigos;
- `initialLayout`, exibido enquanto o conteúdo Glance ainda é preparado.

O widget horizontal usa `aqualino_widget_preview.xml`; o pequeno usa `aqualino_widget_small_preview.xml`. Alterações visuais no Glance devem atualizar também esses layouts e drawables, pois eles não são gerados automaticamente a partir do Composable.

No iOS, `placeholder` e `getSnapshot` usam `WidgetSnapshot.preview` quando `context.isPreview` é verdadeiro. O preview apresenta dados demonstrativos e nunca lê a conta da pessoa.

## Ciclo de atualização

O snapshot é gravado nos seguintes momentos:

1. login grava imediatamente uma sessão autenticada vazia;
2. logout, ausência de token ou rejeição 401 grava o estado desconectado;
3. carregamento da Home grava dados remotos ou o cache migrado;
4. registro de água atualiza primeiro o total otimista local;
5. confirmação da API substitui o snapshot pelo valor reconciliado;
6. sincronização da outbox offline repete a reconciliação quando a rede retorna.

Falhas no widget são deliberadamente capturadas e nunca podem impedir login, logout, abertura da Home ou registro de água.

Depois da gravação, o app solicita reload imediato. Atualizações periódicas continuam sob controle do sistema:

- Android declara `updatePeriodMillis="1800000"` nos dois providers;
- iOS cria a próxima timeline após 1.800 segundos.

Esses 30 minutos são uma solicitação, não uma garantia. Economia de bateria, launcher, WidgetKit e frequência de uso podem adiar a atualização. Não implemente polling de rede dentro do widget.

## Interação e navegação

Toda a superfície abre:

```text
aqualino://hydrate/quick?source=widget
```

O deep link é declarado no Manifest Android, no linking do React Navigation e no esquema de URL do iOS. A rota `QuickHydration` fica no navigator raiz:

- pessoa autenticada e com onboarding completo: abre o registro rápido;
- sem sessão: redireciona para os steps de entrada;
- onboarding pendente: redireciona para o onboarding.

Registros originados nessa rota usam `source: "widget"`, inclusive quando entram na fila offline.

## Configuração Android

Arquivos essenciais:

- [`AqualinoGlanceWidget.kt`](../../../android/app/src/main/java/com/aqualino/widget/AqualinoGlanceWidget.kt): modelos, layouts e receivers;
- [`AqualinoWidgetModule.kt`](../../../android/app/src/main/java/com/aqualino/widget/AqualinoWidgetModule.kt): armazenamento, reload e ícone dinâmico;
- [`AndroidManifest.xml`](../../../android/app/src/main/AndroidManifest.xml): receivers, aliases e deep link;
- [`aqualino_widget_info.xml`](../../../android/app/src/main/res/xml/aqualino_widget_info.xml): provider horizontal;
- [`aqualino_widget_small_info.xml`](../../../android/app/src/main/res/xml/aqualino_widget_small_info.xml): provider pequeno;
- `res/layout` e `res/drawable`: previews e superfícies;
- `res/drawable-nodpi`: mascotes WebP lossless compartilhados pelo app e Glance.

Os dados ficam em `SharedPreferences("aqualino_widget")`, chave `snapshot_json`. Como os receivers pertencem ao mesmo aplicativo, não há provider exportado nem permissão adicional.

Mudanças em Kotlin, Manifest, XML ou recursos exigem rebuild nativo; Fast Refresh atualiza somente JavaScript.

## Configuração iOS

Arquivos essenciais:

- [`AqualinoWidget.swift`](../../../ios/AqualinoWidget/AqualinoWidget.swift): provider, timeline e views;
- [`RCTNativeAqualinoWidget.mm`](../../../ios/Aqualino/NativeAqualinoWidget/RCTNativeAqualinoWidget.mm): implementação do TurboModule;
- [`AqualinoWidgetReloader.swift`](../../../ios/Aqualino/AqualinoWidgetReloader.swift): chamada ao `WidgetCenter`;
- `Aqualino/Aqualino.entitlements` e `AqualinoWidget/AqualinoWidget.entitlements`: App Group;
- `Aqualino.xcodeproj`: target e embed da extensão;
- `Images.xcassets`: mascotes compartilhados com o target do widget.

Aplicativo e extensão precisam usar exatamente o App Group:

```text
group.br.com.aqualino.shared
```

O JSON fica em `UserDefaults(suiteName:)`, chave `snapshot_json`. O bundle do app é `br.com.aqualino.mobile` e o da extensão é `br.com.aqualino.mobile.widget`. Assinatura e provisioning devem habilitar o mesmo App Group nos dois targets.

Mudanças em Swift, Objective-C++, entitlements, catálogo ou target exigem rebuild pelo Xcode; Fast Refresh não recompila a extensão.

## Assets

As duas plataformas reutilizam versões de 512 px de `aqualino_happy_active`, `aqualino_sad` e `aqualino_strong`.

- Android: WebP lossless em `res/drawable-nodpi`, sem escala automática por densidade;
- iOS: PNG otimizado no catálogo compartilhado pelo app e pela extensão.

Ao substituir um mascote:

1. preserve transparência e proporção;
2. mantenha o nome do recurso nas duas plataformas ou atualize os dois mapeamentos;
3. confira pequeno, horizontal, preview e estado desconectado;
4. evite incluir uma segunda cópia do mesmo bitmap no APK/AAB;
5. valide em fundo claro e escuro para detectar halos de transparência.

## Ícone dinâmico do aplicativo

O snapshot autenticado também solicita o humor do ícone:

- `empty` e `happy` usam o ícone feliz;
- `angry`, `boiling` e `skeleton` usam o triste.

No Android, aliases de Activity são alternados com `DONT_KILL_APP`. No iOS, `setAlternateIconName` seleciona `AppIconSad` ou retorna ao ícone principal. A troca pode exibir a confirmação padrão do iOS.

O script [`generate-dynamic-icons.sh`](../../../scripts/generate-dynamic-icons.sh) gera os tamanhos Android e iOS a partir dos masters em `src/assets/app-icon/source`, usando Lanczos. O widget nunca recebe o token da conta durante essa operação.

## Desenvolvimento e validação

A partir da raiz do monorepo:

```bash
pnpm --filter @aqualino/mobile typecheck
pnpm --filter @aqualino/mobile lint
pnpm --filter @aqualino/mobile test
pnpm mobile:android:light
```

Para testar o deep link no Android conectado:

```bash
adb shell am start -a android.intent.action.VIEW -d 'aqualino://hydrate/quick?source=widget' com.aqualino
```

Validação manual mínima:

1. instalar um build nativo novo;
2. conferir os dois previews no seletor;
3. adicionar pequeno e horizontal à tela inicial;
4. validar cantos e espaçamento no launcher disponível;
5. abrir sem sessão e confirmar que dias e sequência estão ocultos;
6. fazer login e abrir a Home para gravar o snapshot;
7. registrar água pelo app e conferir a atualização otimista;
8. tocar no widget e registrar com origem `widget`;
9. testar offline e depois reconectar;
10. sair da conta e confirmar a apresentação desconectada;
11. repetir em Android anterior e posterior à API 31, quando disponíveis;
12. repetir no iOS 15.1–16 e iOS 17+, quando disponíveis.

Testes automatizados atuais cobrem mapeamento de humor do ícone, escrita otimista/reconciliada e estado de autenticação. Layout e integração com launcher/WidgetKit ainda exigem validação em dispositivo ou simulador.

## Diagnóstico

### Widget continua desconectado após login

- abra a Home para forçar a leitura remota ou do cache;
- confirme que o TurboModule retorna schema `2`;
- no Android, confira `aqualino_widget/snapshot_json` no armazenamento privado;
- no iOS, confira App Group e assinatura dos dois targets;
- remova e adicione novamente apenas depois de confirmar que o snapshot foi gravado.

### Widget mostra conteúdo antigo

- lembre que o reload é solicitado, mas o sistema decide quando renderizar;
- faça um registro de água ou reabra a Home;
- após alterações nativas, reinstale/recompile em vez de usar somente Fast Refresh;
- confira se o snapshot não foi descartado por schema ou JSON inválido.

### Preview está correto, mas o widget real não

Preview e conteúdo real seguem caminhos distintos. No Android, revise tanto `res/layout`/drawables quanto o Composable Glance. No iOS, diferencie `WidgetSnapshot.preview` do snapshot carregado pelo App Group.

### Cantos variam entre aparelhos Android

Launchers aplicam padding, escala e máscara próprios. A API 31 fornece o raio do sistema; versões anteriores dependem dos drawables. Valide pelo menos um launcher Samsung e um launcher Android padrão antes de ajustar dimensões para todos.

### `NativeAqualinoWidget` não foi encontrado

Mudanças no spec exigem codegen e rebuild nativo. Confirme o `codegenConfig` de `apps/mobile/package.json`, `AqualinoWidgetPackage` no Android e a classe Objective-C++ no target principal do iOS.

## Referências

- [ADR 0004 — widget nativo alimentado por snapshot](../../../../../docs/adr/0004-native-widgets.md)
- [Arquitetura geral](../../../../../docs/architecture/overview.md)
- [Mapeamento de performance e cold start](../../../PERFORMANCE.md)
- [Navegação e guardas do deep link](../../app/navigation/AppNavigation.tsx)
- [Ponte React Native](data/widgetBridge.ts)
- [Sincronização offline](../hydration/application/offlineHydrationService.ts)
