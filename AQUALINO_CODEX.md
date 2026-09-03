# Aqualino — Especificação de produto e desenvolvimento para o Codex

> Este arquivo é a fonte inicial de verdade para o desenvolvimento do Aqualino. O Codex deve assumir a responsabilidade de estruturar, implementar, testar e documentar o aplicativo, seguindo as decisões abaixo. Caso o repositório já contenha código, deve primeiro inspecioná-lo e adaptar o plano sem apagar ou sobrescrever alterações existentes do usuário.

## 1. Papel do Codex

Atue como engenheiro de software responsável pelo produto, com foco em entregar incrementos executáveis e verificáveis.

O trabalho não termina na criação de arquivos ou em uma explicação teórica. Para cada etapa:

1. inspecione o estado atual do repositório;
2. implemente a menor fatia vertical completa da funcionalidade;
3. crie ou atualize testes;
4. execute os testes, linters e verificações de tipos relevantes;
5. documente comandos, decisões e variáveis de ambiente;
6. informe claramente o que foi concluído, o que foi validado e o próximo incremento recomendado.

Pergunte ao usuário somente quando uma decisão realmente bloquear a implementação ou alterar materialmente produto, custo, segurança ou arquitetura. Para escolhas técnicas reversíveis, adote a recomendação deste documento e registre a decisão.

Não adicionar dependências sem necessidade comprovada. Antes de instalar uma biblioteca, verificar manutenção, compatibilidade, licença e se a plataforma já oferece solução adequada.

## 2. Visão do produto

O Aqualino é um aplicativo para iOS e Android que ajuda pessoas a criar o hábito de beber água por meio de:

- registro rápido de consumo de água;
- metas diárias e sequência de dias;
- feedback visual de um mascote original chamado **Aqualino**;
- conquistas, XP e desafios solo ou em pequenos grupos privados;
- lembretes úteis, sem excesso de notificações;
- widget na tela inicial mostrando o Aqualino e o tempo desde o último registro;
- inventário de poções para proteger ou reacender sequências pessoais e solo;
- plano Pro que remove anúncios, exibe badge VIP, entrega uma pequena cota mensal de poções e oferece desconto nelas, sem vantagem em desafios de grupo;
- interação social leve, positiva e voluntária.

O núcleo do produto não é apenas um contador de água. É um ciclo de hábito:

```text
Lembrete ou estímulo visual
        ↓
Usuário bebe água
        ↓
Registro simples e rápido
        ↓
Recompensa visual, XP e sequência
        ↓
Progresso pessoal e social
        ↓
Retorno ao aplicativo
```

O produto pode se inspirar no ritmo de interação e na clareza de feedback de aplicativos gamificados como o Duolingo, mas não deve copiar personagens, ilustrações, textos, sons, componentes ou identidade visual de terceiros. O Aqualino deve ser uma gota d’água original, reconhecível e com identidade própria.

## 3. Objetivos do MVP

O MVP deve permitir que uma pessoa:

1. escolha `pt-BR`, `en`, `es` ou `zh-Hans` antes da autenticação e use esse idioma globalmente;
2. crie uma conta e conclua um onboarding retomável no primeiro acesso;
3. escolha um modelo visual de personagem entre os assets oficiais disponíveis;
4. defina meta diária, fuso horário e tamanhos favoritos de copo/garrafa;
5. configure lembretes e receba a oferta de adicionar o widget à tela inicial do celular;
6. registre rapidamente quanto bebeu;
7. use uma Home centrada no desafio atual, com uma trilha de dias e o dia vigente destacado;
8. veja consumo do dia, percentual da meta e histórico recente;
9. acompanhe sequência de hidratação, XP e conquistas básicas;
10. veja a reação correta do Aqualino e transições fluidas com linguagem de água;
11. crie ou entre em um grupo privado de até cinco integrantes;
12. acompanhe um desafio saudável de sete dias, proporcional às metas do grupo;
13. escolha desafios solo em um catálogo de modalidades predefinidas;
14. visite a vitrine de conquistas dos integrantes aceitos do grupo;
15. altere posteriormente idioma, personagem, meta, lembretes e preferências do widget no perfil;
16. compre Congelamento ou Poção de reacender mesmo no plano gratuito e use o inventário fora do modo de grupo;
17. use o plano gratuito com anúncios pós-registro ou assine o Pro para remover anúncios, receber um badge VIP, uma pequena cota mensal e desconto em poções.

O MVP não deve incluir, salvo solicitação posterior:

- microserviços;
- Kafka;
- Kubernetes;
- chat entre usuários;
- feed público;
- integração com relógios inteligentes;
- recomendação médica automatizada;
- inteligência artificial generativa no fluxo principal.

## 4. Princípios de produto

### 4.1 Registro com o mínimo de atrito

O usuário deve registrar água em até dois toques. A tela inicial deve oferecer volumes rápidos configuráveis, por exemplo 200 ml, 300 ml, 500 ml e 750 ml.

### 4.2 Gamificação saudável

O mascote deve estimular, e não humilhar. Evitar linguagem agressiva, culpa excessiva, punições financeiras ou comparação social negativa.

### 4.3 Privacidade por padrão

Somente integrantes aceitos de um grupo privado podem consultar dados sociais e vitrines de conquistas. Exibir no placar apenas o necessário: nome público, avatar, volume diário, percentual da meta, pontos acumulados e posição ou empate. Não expor o histórico detalhado de horários para outros integrantes.

### 4.4 Offline primeiro para a ação principal

Registrar água deve funcionar temporariamente sem internet. Os registros locais devem ser sincronizados de maneira idempotente quando a conexão voltar.

### 4.5 Fonte de verdade no backend

O backend calcula regras de gamificação, sequências, desafios, pontuação, premiação e estado do mascote. O aplicativo não deve duplicar regras de negócio críticas em várias telas.

### 4.6 Tempo e fuso horário explícitos

Persistir instantes em UTC e calcular “hoje”, sequência e dias sem registro no fuso horário configurado pelo usuário. A configuração inicial sugerida para usuários brasileiros é `America/Sao_Paulo`, mas não deve ser fixada globalmente.

### 4.7 Idioma global e dinâmico

A primeira tela escolhe entre `pt-BR`, `en`, `es` e `zh-Hans`. A seleção funciona offline, é sincronizada por conta depois da autenticação e pode mudar em tempo de execução sem reiniciar o aplicativo.

Não espalhar strings pela UI. Telas, componentes, validações, erros, acessibilidade, notificações e widgets consomem chaves tipadas do catálogo de tradução. Formatar datas, números e plurais com o locale ativo, sem confundir idioma com fuso horário. Conteúdo criado por usuários não é traduzido automaticamente.

### 4.8 Monetização sem atrapalhar o hábito

Salvar água é sempre mais importante que carregar ou exibir publicidade. Usuários gratuitos mantêm todas as funções centrais e podem comprar os mesmos tipos de poção; anúncios só ficam elegíveis depois da conclusão de um novo registro. O Pro remove anúncios, concede um badge VIP, credita mensalmente `1x streak_freeze` e `1x streak_revive` e oferece desconto inicial de 15% nas poções. Esses benefícios nunca alteram pontos, posição, probabilidades ou resultados de desafios de grupo.

Não enviar dados de hidratação ou desafio para provedores de anúncios ou para as lojas. Consentimento, preço, probabilidades, compra e restauração precisam ser claros, acessíveis, traduzidos e compatíveis com as regras vigentes das lojas.

## 5. Arquitetura recomendada

### 5.1 Visão geral

Adotar um **monorepo** com aplicativo mobile, API e pacotes compartilhados. O backend deve começar como **monólito modular**: um único deploy, banco e processo de aplicação, porém com módulos de domínio bem separados.

```text
React Native mobile
   ├── UI e navegação
   ├── cache e fila offline
   ├── módulo nativo do widget
   └── notificações push
              │
              │ HTTPS / JSON
              ▼
Nginx → Laravel API modular
              ├── Identidade
              ├── Hidratação
              ├── Gamificação
              ├── Grupos
              ├── Desafios
              ├── Conquistas
              ├── Monetização
              ├── Inventário
              ├── Notificações
              └── Widget snapshot
                 │          │
                 ▼          ▼
            PostgreSQL    Redis
                              │
                              ▼
                    Filas + Laravel Horizon
```

### 5.2 Stack recomendada

| Camada | Tecnologia | Motivo |
| --- | --- | --- |
| Mobile | React Native + TypeScript | Código compartilhado entre iOS e Android e aderência ao ecossistema TypeScript |
| Arquitetura mobile | Feature-first + MVVM pragmático + Repository | Separa UI, estado, casos de uso e fontes de dados sem excesso de abstração |
| Estado remoto | TanStack Query | Cache, invalidação, retry e sincronização de chamadas HTTP |
| Estado local simples | Zustand ou equivalente leve | Sessão visual, preferências e estado estritamente local; não duplicar cache da API |
| Persistência local | SQLite | Logs pendentes, fila offline e dados que precisam sobreviver ao fechamento do app |
| Backend | Laravel API, versão estável suportada | Produtividade, filas, autenticação, validação e boa aderência ao conhecimento do projeto |
| Banco | PostgreSQL | Integridade transacional, agregações, índices e evolução segura do domínio |
| Cache e filas | Redis | Cache de leitura, locks, rate limiting e filas |
| Monitor de filas | Laravel Horizon | Supervisão, métricas, retries e balanceamento dos workers Redis |
| Proxy web | Nginx | TLS no ambiente de hospedagem, proxy, limites, compressão e entrega eficiente |
| Push | Firebase Cloud Messaging, incluindo integração APNs | Entrega de notificações em Android e iOS |
| Compras Pro e consumíveis | APIs oficiais de compra das lojas atrás de adapter tipado | Restauração da assinatura e validação/reconciliação das poções com inventário sem confiar no cliente |
| Anúncios | SDK do provedor aprovado atrás de adapter próprio | Isola consentimento, frequência, falhas e bloqueio integral para Pro |
| Mascote animado no app | Rive, após validação do arquivo e da licença | Máquina de estados e animação multiplataforma |
| Widget iOS | SwiftUI + WidgetKit + App Intents | Solução nativa da Apple |
| Widget Android | Kotlin + Jetpack Glance | Solução moderna para App Widgets |
| Contrato da API | OpenAPI + cliente TypeScript gerado | Reduz divergência entre Laravel e mobile |
| Testes mobile | Jest + React Native Testing Library + Maestro | Testes unitários/de componentes e fluxos principais |
| Testes API | Pest ou PHPUnit | Testes de domínio, integração e endpoints |
| Observabilidade | Sentry + logs estruturados | Diagnóstico de falhas mobile, API e jobs |

Usar a versão estável e suportada de cada tecnologia disponível no início da implementação. Registrar as versões em lockfiles e nunca usar a tag `latest` em imagens de produção.

### 5.3 React Native com código nativo versionado

Como o widget é uma funcionalidade central, manter os diretórios nativos `ios/` e `android/` no repositório. Não depender de uma arquitetura que impeça editar targets, extensões, App Groups, intents, receivers ou módulos nativos.

Usar a New Architecture do React Native quando todas as dependências escolhidas forem compatíveis. A ponte de widget deve ser um Turbo Native Module pequeno e tipado, responsável apenas por:

- gravar o snapshot local consumido pelo widget;
- solicitar atualização do widget;
- ler uma ação pendente disparada pelo widget;
- informar a versão do schema nativo.

Regras de gamificação não pertencem ao módulo nativo.

### 5.4 Monólito modular no Laravel

Não criar microserviços no MVP. Separar a aplicação em módulos de domínio dentro da mesma API:

```text
apps/api/app/
├── Modules/
│   ├── Identity/
│   ├── Hydration/
│   ├── Gamification/
│   ├── Group/
│   ├── Challenge/
│   ├── Achievement/
│   ├── Monetization/
│   ├── Inventory/
│   ├── Notification/
│   └── Widget/
├── Shared/
│   ├── Domain/
│   ├── Application/
│   └── Infrastructure/
└── Http/
```

Cada módulo pode conter, quando necessário:

```text
Domain/
Application/
Infrastructure/
Http/
Tests/
```

Evitar criar interfaces, repositories ou DTOs sem uso concreto. Eloquent pode ser usado diretamente na infraestrutura e em consultas simples. Casos de uso devem concentrar operações que alteram estado ou envolvem várias regras.

### 5.5 Eventos internos

Usar eventos de domínio internos e jobs assíncronos, sem broker externo no MVP.

Fluxo ao registrar água:

```text
RecordWaterIntake
        ↓
Transação PostgreSQL
        ├── cria hydration_log
        ├── atualiza daily_user_stat
        └── grava evento/outbox quando necessário
        ↓
Resposta imediata ao usuário
        ↓
Jobs Redis/Horizon
        ├── recalcula desafios ativos afetados
        ├── verifica conquistas
        ├── agenda/cancela lembretes
        └── registra analytics não crítico
```

O resultado crítico exibido imediatamente — total do dia, meta, estado do Aqualino e XP concedido — deve ser consistente na própria resposta. Não colocar toda a regra atrás de uma fila eventual.

Fluxos que alteram inventário também precisam ser transacionais:

```text
StorePurchaseVerified ──→ store_transaction + inventory_transaction + inventory_balance
GroupChallengeClosed  ──→ classificação + challenge_reward_draw + XP/inventory_transaction
PotionApplied         ──→ lock de saldo + streak_protection + inventory_transaction + streak recalculada
```

Em todos eles, publicar notificações e analytics somente via outbox depois do commit. Sorteio, débito e recompensa não podem ficar parcialmente aplicados em caso de retry ou falha do worker.

Para eventos assíncronos que não podem ser perdidos, usar padrão transactional outbox ou uma tabela equivalente processada por job. Não publicar job antes do commit da transação.

## 6. Estrutura do monorepo

Estrutura inicial recomendada:

```text
aqualino/
├── apps/
│   ├── mobile/
│   │   ├── android/
│   │   ├── ios/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── features/
│   │   │   ├── shared/
│   │   │   └── assets/
│   │   └── tests/
│   └── api/
│       ├── app/
│       ├── bootstrap/
│       ├── config/
│       ├── database/
│       ├── routes/
│       └── tests/
├── packages/
│   ├── api-client/
│   ├── contracts/
│   ├── design-tokens/
│   └── i18n/
├── infrastructure/
│   ├── docker/
│   │   ├── api/
│   │   ├── nginx/
│   │   └── horizon/
│   └── nginx/
├── docs/
│   ├── architecture/
│   ├── product/
│   └── adr/
├── .github/workflows/
├── compose.yaml
├── Makefile
├── pnpm-workspace.yaml
├── .env.example
└── README.md
```

O painel administrativo web não faz parte da primeira fatia do MVP. Quando houver necessidade operacional real, adicioná-lo como `apps/admin` usando Vue 3 + TypeScript, sem acoplar sua existência ao funcionamento da API.

Usar `pnpm` para os workspaces JavaScript/TypeScript. Não introduzir Turborepo apenas por tendência; adicioná-lo somente quando houver múltiplos apps JS e ganho mensurável em cache/orquestração.

## 7. Organização do mobile

Organizar o código por funcionalidade, e não por uma pasta global enorme de controllers, services e screens.

```text
apps/mobile/src/
├── app/
│   ├── navigation/
│   ├── providers/
│   └── bootstrap/
├── features/
│   ├── auth/
│   ├── onboarding/
│   ├── hydration/
│   ├── home/
│   ├── gamification/
│   ├── groups/
│   ├── challenges/
│   ├── monetization/
│   ├── inventory/
│   ├── notifications/
│   ├── profile/
│   └── widget/
├── shared/
│   ├── api/
│   ├── components/
│   ├── database/
│   ├── errors/
│   ├── hooks/
│   ├── i18n/
│   ├── telemetry/
│   └── utils/
└── assets/
    ├── mascot/
    ├── icons/
    └── sounds/
```

Dentro de cada feature, usar apenas as camadas necessárias:

```text
hydration/
├── domain/
├── application/
├── data/
├── presentation/
└── tests/
```

Diretrizes:

- componentes de apresentação não chamam HTTP diretamente;
- mutations passam por casos de uso/repositories;
- TanStack Query é responsável pelo estado remoto;
- Zustand não deve duplicar respostas inteiras da API;
- erros devem ser normalizados em um tipo único da aplicação;
- toda tela deve cobrir loading, vazio, erro, offline e sucesso;
- acessibilidade deve incluir labels, contraste, Dynamic Type/font scaling e áreas de toque adequadas;
- deep links devem ser configurados desde o início.

O provider global de idioma deve ser carregado antes da navegação. Empacotar `pt-BR`, `en`, `es` e `zh-Hans` no binário para que a primeira tela funcione offline. A alteração de locale invalida apenas formatações e textos derivados, sem apagar cache de domínio nem exigir remontar toda a aplicação. Gerar recursos nativos equivalentes para widgets e notificações a partir da mesma fonte sempre que viável.

## 8. Funcionalidades iniciais

### 8.1 Autenticação e conta

Implementar:

- cadastro por e-mail e senha;
- login e logout;
- recuperação de senha;
- exclusão de conta dentro do app;
- revogação de tokens;
- nome público único para recursos sociais;
- aceite de termos e política de privacidade com versão e data;
- endpoint para exportação futura dos dados pessoais.

Usar Laravel Sanctum ou solução oficial equivalente para tokens mobile. Armazenar token no Keychain do iOS e Keystore/Encrypted Storage do Android, nunca em armazenamento simples.

Login Apple/Google pode entrar após o fluxo básico. Se login de terceiros for oferecido no iOS, verificar e cumprir os requisitos vigentes de Sign in with Apple antes da publicação.

### 8.2 Onboarding

Antes da autenticação ou das boas-vindas, o bootstrap de primeiro acesso apresenta a seleção de idioma com os nomes escritos em seus próprios idiomas:

- Português (Brasil) — `pt-BR`;
- English — `en`;
- Español — `es`;
- 简体中文 — `zh-Hans`.

O locale compatível do sistema pode vir marcado como sugestão, mas exige confirmação. Persistir a escolha localmente imediatamente. Após autenticar, sincronizá-la com `user_profiles.locale`; em sessões autenticadas, a configuração da conta vence e se propaga para os demais dispositivos.

Depois da escolha de idioma e da autenticação, o onboarding persiste cada etapa no backend e retoma do último ponto confirmado depois que o app for fechado. Fluxo:

1. idioma global confirmado;
2. boas-vindas, proposta do Aqualino e documentos necessários;
3. nome público;
4. escolha de um modelo visual de personagem;
5. meta diária sugerida ou personalizada;
6. copos/garrafas favoritos;
7. fuso horário;
8. lembretes, horários e período silencioso;
9. preview e ação “Adicionar à tela inicial” para o widget;
10. resumo e confirmação antes de abrir a Home.

O personagem deve ser escolhido em um catálogo pequeno formado apenas por assets oficiais já disponíveis. Cada item possui `code` estável, nome traduzível, preview e mapeamento dos estados visuais exigidos. A escolha é cosmética, não altera XP, desafio ou pontuação, pode ser modificada no perfil e usa o modelo padrão caso algum asset esteja indisponível.

Idioma, personagem e meta diária são obrigatórios para concluir o onboarding. Lembretes e widget podem ser pulados. Solicitar a permissão do sistema para notificações somente depois que a pessoa habilitar os lembretes e entender o benefício. Uma recusa não bloqueia o fluxo nem deve provocar solicitações repetitivas.

Antes da etapa do widget, gerar um snapshot inicial com `character_model_code`, condição do mascote, meta e progresso. Usar o fluxo de adição oferecido pelo sistema quando suportado; caso contrário, apresentar instruções curtas específicas da plataforma. Nunca declarar que o widget foi instalado sem uma confirmação confiável da plataforma.

Trocar o idioma em Configurações deve atualizar imediatamente toda a árvore visual, modais, validações, erros, labels de acessibilidade, formatação de datas/números, notificações futuras e snapshot do widget, sem reiniciar. Atualização offline é otimista e sincroniza depois. Usar `pt-BR` como fallback para chave ausente, registrar o erro sem dados pessoais e nunca mostrar a chave técnica ao usuário.

Metas são ferramentas de hábito, não aconselhamento médico. Exibir aviso simples para pessoas com restrição hídrica seguirem orientação profissional. Idioma, personagem, meta, volumes, fuso, lembretes e orientação de widget continuam acessíveis em Perfil e Configurações.

### 8.3 Home e registro de água

A Home é a primeira tela funcional depois da autenticação e do onboarding. Ela deve apresentar como trilha própria do Aqualino:

- a semana civil atual, de segunda-feira a domingo, quando não houver desafio;
- os sete dias da janela quando um desafio de grupo estiver selecionado;
- a duração da modalidade quando um desafio solo estiver selecionado;
- um seletor `Grupo | Solo` quando os dois tipos estiverem ativos ao mesmo tempo;
- o intervalo de datas e o fuso usados pela trilha.

A Home deve priorizar:

- Aqualino no estado atual;
- etapas diárias com estados `futuro`, `sem registro`, `em progresso`, `meta atingida` e `perdido`;
- última etapa em formato de troféu nos desafios;
- dia atual destacado sem depender apenas de cor;
- total consumido hoje;
- meta diária e percentual;
- botão principal “Bebi água”;
- volumes rápidos;
- sequência atual;
- XP e nível;
- atalho para histórico;
- situação offline/sincronização quando aplicável.

A trilha pode empregar gotas, ondas ou recipientes e se inspirar na clareza de progressão de produtos gamificados, sem copiar mapa, personagens, moedas, componentes ou identidade visual de terceiros. Corais inspirados em espécies reais podem decorar as bordas com laranja, salmão, vermelho, rosa, magenta, roxo e amarelo, desde que não prejudiquem contraste, legibilidade ou áreas de toque.

Ao registrar:

- aceitar quantidade em mililitros;
- aceitar horário atual ou passado permitido;
- criar `client_event_id` UUID no dispositivo;
- salvar primeiro na fila local quando offline;
- fazer atualização otimista;
- sincronizar com a API;
- reconciliar a resposta do servidor;
- impedir duplicidade por `client_event_id`;
- atualizar o widget assim que o snapshot consistente estiver disponível.

Validações iniciais recomendadas:

- quantidade por registro entre 50 ml e 2.000 ml;
- não aceitar data futura além de uma tolerância pequena de relógio;
- permitir correção/exclusão de registro próprio, preservando auditoria mínima;
- limitar XP diário para evitar spam, sem impedir o registro real de hidratação.

### 8.4 Histórico

Exibir:

- total diário dos últimos sete dias;
- lista dos registros do dia;
- indicação de meta atingida;
- edição ou exclusão com confirmação;
- estado vazio amigável;
- paginação para histórico mais antigo.

Gráficos complexos ficam para fase posterior. No MVP, priorizar legibilidade e rapidez.

### 8.5 Sequências, XP e níveis

Definição recomendada:

- **sequência de hidratação** aumenta no primeiro registro válido de cada dia local; abrir o app ou fazer login sem registrar água não conta;
- **sequência do desafio** aumenta quando a meta específica do desafio é atingida em dias consecutivos dentro da janela;
- as duas sequências são armazenadas e exibidas separadamente;
- registros adicionais no mesmo dia não incrementam a sequência novamente;
- atingir a meta diária é uma realização separada, com destaque e bônus próprios;
- conceder XP por registro válido, com teto diário;
- conceder bônus ao atingir a meta;
- conceder bônus moderado por sequência;
- não retirar XP finalizado sem uma regra de reconciliação auditável; XP provisório de desafio solo é revogado no cancelamento;
- correções ou exclusões recalculam estatísticas afetadas de forma determinística;
- um dia protegido por poção preserva a continuidade da sequência escolhida, mas permanece identificado como `protected` e não simula atividade;
- Congelamento e Reacender só se aplicam conforme a seção 8.12 e ficam indisponíveis durante desafio de grupo ativo.

Configuração inicial sugerida, armazenada no backend e não hardcoded na UI:

| Evento | XP sugerido |
| --- | ---: |
| Primeiro registro do dia | 10 |
| Cada registro válido adicional | 5 |
| Meta diária atingida | 25 |
| Sequência de 7 dias | 50 |
| Teto de XP por registros no dia | 50 |

Esses valores são ponto de partida e devem poder mudar sem nova publicação do app.

### 8.6 Conquistas iniciais

Implementar pelo menos:

- **Primeira gota:** primeiro registro;
- **Dia completo:** primeira meta atingida;
- **Em ritmo:** 3 dias de sequência;
- **Semana azul:** 7 dias de sequência;
- **Em equipe:** entrar no primeiro grupo;
- **Primeiro desafio:** concluir a primeira janela em grupo;
- **Onda dourada, prateada ou bronze:** terminar uma janela na respectiva posição;
- **Primeira Maré:** concluir a modalidade solo Maré Inicial;
- **Mestre da Corrente:** concluir a modalidade solo Corrente Forte;
- **Guardião do Oceano:** concluir a modalidade solo Oceano Azul.

Conquistas devem ser verificadas de forma idempotente. Uma mesma conquista não pode ser concedida duas vezes.

### 8.7 Grupos privados

Implementar:

- nome e avatar do grupo;
- convite por código/link profundo;
- aceite explícito do convite;
- grupo com no mínimo duas e no máximo cinco pessoas, contando quem criou;
- um único grupo ativo por pessoa no MVP;
- vitrine de conquistas visível somente entre integrantes aceitos;
- saída, remoção e transferência simples de responsabilidade;
- privacidade restrita a integrantes aceitos;
- rate limit em busca e convites.

Não permitir enumeração massiva de usuários por e-mail ou telefone.

### 8.8 Desafio de sete dias do grupo

Quando o grupo tiver ao menos duas pessoas aceitas, o primeiro desafio fica `scheduled` para 00:00 do próximo dia civil no fuso do grupo. Portanto, um grupo elegível na quarta-feira começa a competir na quinta-feira. A janela contém sete dias consecutivos e termina às 23:59:59 do sétimo dia; `end_date = start_date + 6 dias`.

O elenco é congelado no início. Pessoas aceitas depois participam apenas da janela seguinte. Ao fechar uma janela, a próxima começa no dia seguinte se ainda houver ao menos duas pessoas elegíveis.

Cada integrante recebe por dia o percentual da própria meta limitado a 100 pontos. A pontuação acumulada tem máximo de 700. Volumes acima da meta continuam registrados, mas não aumentam a pontuação competitiva.

Regras:

- empates são permitidos e usam classificação de competição;
- 1º lugar recebe ouro, 2º prata e 3º bronze; demais posições não recebem medalha de pódio;
- pessoas empatadas recebem a mesma posição e medalha, pulando-se a posição seguinte;
- cada participante em 1º lugar recebe exatamente um sorteio gratuito e independente depois do fechamento: 70% para `+100 XP`, 20% para `1x streak_freeze` e 10% para `1x streak_revive`;
- a tabela do sorteio soma 100%, usa versão imutável por desafio, fica visível antes do início e mantém XP extra como resultado mais provável;
- plano Pro não altera probabilidades; empates em 1º lugar geram um sorteio idempotente por vencedor;
- o último nó da trilha é um troféu com cor projetada durante a janela e definitiva após o fechamento;
- a janela usa o fuso do grupo, definido na criação e devolvido pela API;
- início, fim, status e versão da regra são explícitos no payload;
- o sexto integrante é rejeitado de forma transacional mesmo com convites aceitos simultaneamente;
- eventos offline aparecem como pendentes até a confirmação do servidor;
- horários detalhados dos registros não são compartilhados.

Redis pode manter o placar quente, mas PostgreSQL permanece como fonte de verdade. O desafio, a classificação e cada sorteio devem poder ser reconstruídos integralmente a partir dos dados persistidos e sua regra não pode mudar silenciosamente. Poções concedidas pelo sorteio entram no inventário depois de `completed` e jamais retroagem sobre o desafio encerrado.

### 8.9 Desafios solo predefinidos

O usuário escolhe uma modalidade em um catálogo versionado pelo backend; não edita livremente duração, meta, XP ou premiação. Cada modalidade possui nome, duração, `target_ml_per_day`, XP provisório, limiares de bronze/prata/ouro e uma conquista exclusiva.

Catálogo inicial:

| Modalidade | Duração | Meta/dia | Bronze | Prata | Ouro | Conquista |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Maré Inicial | 3 dias | 1.500 ml | 1 dia seguido | 2 dias seguidos | 3 dias seguidos | Primeira Maré |
| Corrente Forte | 5 dias | 1.800 ml | 3 dias seguidos | 4 dias seguidos | 5 dias seguidos | Mestre da Corrente |
| Oceano Azul | 7 dias | 2.000 ml | 3 dias seguidos | 5 dias seguidos | 7 dias seguidos | Guardião do Oceano |

Uma modalidade só pode ser iniciada quando sua meta não ultrapassa a meta diária do perfil. O desafio começa no próximo dia civil do fuso individual. Somente um solo pode estar `scheduled` ou `active`, embora ele possa coexistir com o desafio de grupo.

Cancelar exige confirmação e é irreversível. O cancelamento zera a sequência do desafio, revoga seu XP provisório e impede medalha ou conquista. Registros de água, sequência de hidratação e XP normal não são apagados. Após cancelar, outra modalidade pode ser agendada para o próximo dia.

### 8.10 Notificações

Tipos iniciais:

- lembrete em horários escolhidos;
- lembrete inteligente quando ainda não houve registro no dia;
- aviso de sequência em risco;
- conquista desbloqueada;
- convite de grupo aceito;
- resumo semanal opcional.

Regras:

- respeitar fuso horário e período silencioso;
- renderizar título, corpo e ações no locale global mais recente do perfil;
- trocar o idioma afeta notificações futuras, sem tentar alterar notificações já entregues;
- permitir desligar cada categoria;
- deduplicar notificações;
- não enviar lembrete de água logo após um registro;
- processar envio por jobs Redis/Horizon;
- armazenar falha, tentativas e motivo final;
- remover tokens inválidos retornados pelo provedor.

### 8.11 Plano Pro e anúncios pós-registro

A primeira entrega é Freemium. O plano gratuito contém hidratação, streaks, desafios, grupos, conquistas, widget e acesso à compra dos dois tipos de poção. O entitlement **Aqualino Pro** remove todos os anúncios, concede um badge cosmético **VIP**, credita mensalmente `1x streak_freeze` e `1x streak_revive` e oferece desconto inicial de 15% nas poções. Não existe vantagem paga em desafios de grupo.

O badge VIP é calculado a partir do entitlement e não é uma conquista permanente. Em `pro_active` ou `grace_period`, exibi-lo com ícone e texto no próprio perfil, no perfil acessível a integrantes aceitos e ao lado do participante no grupo/placar. Em `expired` ou `revoked`, removê-lo após reconciliação. Não expor a outros participantes preço, datas, período de carência, renovação ou situação detalhada da cobrança.

O fluxo de compra deve usar o mecanismo oficial da loja, permitir consultar a oferta, assinar, restaurar e abrir o gerenciamento da assinatura. Preço, periodicidade, teste gratuito, SKUs e provedores de compra/anúncio exigem decisão comercial explícita antes da publicação e não ficam hardcoded na UI. A oferta VIP de poções usa produto, oferta ou SKU suportado pela loja; o preço devolvido pela loja sempre prevalece sobre qualquer cálculo visual do cliente.

Um anúncio só fica elegível após `POST /hydration/logs` concluir logicamente um novo registro iniciado em primeiro plano pela pessoa. Antes de consultar o anúncio, o mobile precisa reconciliar a resposta, atualizar Home, streak, XP, desafio e widget e terminar a recompensa visual aplicável.

Regras obrigatórias:

- nunca carregar como condição, mostrar antes ou interromper a persistência do registro;
- falha ou lentidão do anúncio nunca altera o resultado nem bloqueia a navegação;
- registro offline pendente, sincronização em background, retry idempotente, edição e exclusão não geram oportunidade;
- conquista, meta atingida ou troféu aparecem antes do anúncio;
- não usar publicidade recompensada para conceder água, XP, streak ou vantagem;
- não mostrar anúncios em onboarding, autenticação, lembretes, instalação do widget, compra ou restauração;
- associar cada oportunidade ao `client_event_id` e consumi-la no máximo uma vez;
- política inicial: um anúncio a cada três registros finalizados, intervalo mínimo de dez minutos e máximo de três por dia;
- manter limites em configuração remota versionada, permitindo apenas torná-los mais restritivos sem nova publicação;
- não enviar ao provedor volume, meta, streak, condição do mascote, desafio ou grupo;
- usar publicidade não personalizada enquanto não houver base legal/consentimento válido para outra modalidade;
- traduzir oferta, consentimento, ações e acessibilidade no locale global.

O backend é a autoridade para `badges: ["vip"]`; o cliente não pode promover o usuário alterando estado local. O badge não altera ordenação, pontuação, XP, streak, personagem, conquista ou acesso a desafios. A cota e o desconto não melhoram probabilidades nem podem ser usados durante uma janela de grupo ativa.

Estados mínimos do entitlement: `free`, `pro_active`, `grace_period`, `expired` e `revoked`. Durante `pro_active` ou `grace_period`, o app não solicita nem exibe anúncios. A compra é validada no backend e sincronizada por notificações da loja. Cache local permite respeitar o Pro offline, mas PostgreSQL e a loja permanecem fontes reconciliadas de verdade.

### 8.12 Poções e inventário pessoal

Tipos iniciais:

| Código | Efeito |
| --- | --- |
| `streak_freeze` | Depois de ativado, protege o próximo dia elegível perdido da sequência selecionada e só então consome uma unidade. |
| `streak_revive` | Recupera a quebra mais recente da sequência selecionada quando usado em até 48 horas. |

Cada uso escolhe exatamente um escopo: `hydration_streak` pessoal ou `solo_challenge_streak` de um desafio solo ativo. Um dia protegido ou recuperado continua sem registro de água e deve ser distinguido visualmente; a poção não inventa volume, meta atingida, XP, pontos, medalha ou conquista. Não empilhar efeitos sobre a mesma quebra e não consumir mais de uma unidade por `user_id + scope + affected_date`.

O inventário é pessoal, vinculado à conta, não transferível, sem valor em dinheiro e sem expiração. Tanto usuários gratuitos quanto VIP podem comprar qualquer poção como produto consumível pelas APIs oficiais da App Store ou Google Play. O servidor valida a transação e credita o item uma única vez por identificador externo; o saldo só muda por um ledger imutável. A compra não contém resultado aleatório.

Após reinstalação ou troca de dispositivo, o saldo é recuperado da conta no backend; “restaurar compras” não recria poções consumidas nem duplica um consumível já creditado. Se um desafio solo for concluído ou cancelado com Congelamento armado nesse escopo, cancelar a proteção e liberar sua reserva sem consumir a unidade.

Enquanto a pessoa participar de um desafio de grupo `active`:

- bloquear ativação, uso e consumo automático de poções em qualquer escopo;
- suspender sem consumo uma proteção já armada até a janela terminar; depois, rearmá-la apenas para uma falta futura, sem recuperar retroativamente quebras ocorridas no modo de grupo;
- permitir consultar o saldo, comprar e receber itens, mantendo-os guardados;
- nunca alterar `daily_challenge_stats`, `challenge_participants`, pontos, posição, medalha ou sorteio.

A cota VIP é concedida somente em `pro_active`, uma vez por competência `YYYY-MM`, inclusive para assinaturas anuais. `grace_period`, retry, reinstalação, restauração e mais de uma notificação da loja não duplicam a concessão. Os itens já recebidos ou comprados permanecem após cancelamento, expiração ou revogação; apenas novas cotas e o desconto deixam de valer.

O desconto inicial é 15%, configurável no backend e materializado em uma oferta/SKU compatível com cada loja. Se a loja não suportar exatamente esse percentual, não calcular um preço alternativo no cliente: mostrar e cobrar o preço oficial retornado. Qualquer alteração futura de quantidade mensal, percentual, janela de 48 horas, efeitos ou probabilidades exige nova versão de regra e decisão explícita do produto.

O sorteio do 1º lugar não depende de compra. Executá-lo no backend com gerador criptograficamente seguro, usando inteiro uniforme de `0` a `9.999`: `0–6.999` concede `+100 XP`, `7.000–8.999` concede `1x streak_freeze` e `9.000–9.999` concede `1x streak_revive`. Registrar versão, valor, resultado e contexto, e conceder exatamente um item/lançamento de XP por vencedor. A publicação das regras deve exibir 70% `+100 XP`, 20% `streak_freeze` e 10% `streak_revive` antes de a pessoa entrar na janela correspondente; não oferecer nova rolagem paga ou por anúncio.

## 9. Aqualino e motor de estados

### 9.1 Separar condição e recompensa

Não representar todo o Aqualino com um único `if` espalhado pela UI. O backend deve devolver um snapshot de gamificação.

Para evitar conflito entre a condição de hidratação e uma premiação de desafio, separar:

- `condition`: condição de hidratação;
- `decoration`: recompensa visual opcional;
- `animation`: sugestão de animação dentro do app;
- `static_asset`: imagem estática para widget e fallback.

Contrato conceitual:

```json
{
  "mascot": {
    "condition": "happy",
    "decoration": "challenge_gold",
    "animation": "celebrating",
    "static_asset": "aqualino_happy"
  }
}
```

### 9.2 Estados iniciais

| Estado visual | Regra inicial | Observação |
| --- | --- | --- |
| `happy` | Existe registro no dia atual | Pode ficar mais comemorativo quando a meta for atingida |
| `angry` | Nenhum registro no dia atual, porém o último ocorreu há menos de 3 dias | Usar expressão de cobrança leve, nunca ameaçadora |
| `boiling` | 3 a 6 dias completos desde o último registro | Aqualino “fervendo” é um alerta visual, não uma afirmação médica |
| `skeleton` | 7 ou mais dias completos desde o último registro | Deve continuar simpático e claramente fictício |
| `challenge_gold` | Usuário recebeu ouro no desafio | Usar como decoração sobre a condição atual, não como condição concorrente |
| `challenge_silver` | Usuário recebeu prata no desafio | Usar como decoração sobre a condição atual, não como condição concorrente |
| `challenge_bronze` | Usuário recebeu bronze no desafio | Usar como decoração sobre a condição atual, não como condição concorrente |
| `empty` | Usuário ainda não possui registro | Estado acolhedor de primeiro uso |

Precedência da condição:

```text
Sem histórico → empty
7+ dias → skeleton
3–6 dias → boiling
Sem registro hoje → angry
Com registro hoje → happy
```

A premiação do desafio não deve esconder um alerta importante. A recompensa pode aparecer como decoração sobre `happy`, `angry`, `boiling` ou `skeleton`. Se não existir um asset combinado, usar um troféu ou badge independente já fornecido.

### 9.3 Cálculo de dias

`days_since_last_log` deve representar a diferença entre datas civis no fuso do usuário, e não simplesmente `floor(segundos / 86400)`.

Exemplo:

- último registro: segunda-feira às 23:50;
- agora: terça-feira às 00:10;
- resultado: 1 dia civil desde o último registro;
- texto amigável: “Ontem” ou “1 dia desde o último registro”.

O backend deve fornecer tanto o valor numérico quanto uma chave semântica. A tradução final pode ser feita no mobile.

### 9.4 Assets

As imagens fornecidas ao projeto devem ser tratadas como referência visual quando não forem claramente assets originais do Aqualino. Não colocar imagens do Duolingo no aplicativo publicado.

Os modelos selecionáveis do personagem devem reutilizar os assets oficiais fornecidos. Cada modelo precisa de preview para o onboarding e de um manifesto que associe seu `character_model_code` aos estados suportados. Nomes de arquivo não são identificadores de domínio; um modelo incompleto usa o estado equivalente do modelo padrão como fallback.

Estrutura:

```text
apps/mobile/src/assets/mascot/
├── source/
├── static/
│   ├── aqualino_empty.png
│   ├── aqualino_happy.png
│   ├── aqualino_angry.png
│   ├── aqualino_boiling.png
│   ├── aqualino_skeleton.png
│   ├── aqualino_challenge_winner.png
│   ├── trophy_gold.png
│   ├── trophy_silver.png
│   └── trophy_bronze.png
└── rive/
    └── aqualino.riv
```

Requisitos para as imagens estáticas:

- fundo transparente;
- margem interna consistente;
- leitura clara em tamanho pequeno;
- silhueta reconhecível;
- versões adequadas para modo claro e escuro quando necessário;
- sem textos embutidos na imagem;
- exportação otimizada para os asset catalogs nativos;
- arquivo fonte preservado separadamente do arquivo comprimido de produção.

O app pode usar Rive para animações. O widget deve usar assets estáticos leves e não depender do runtime Rive.

## 10. Widget da tela inicial

### 10.1 Objetivo

O widget deve trazer o hábito para a tela inicial sem exigir que o aplicativo esteja aberto. Ele mostra:

- imagem do Aqualino no estado correto;
- tempo desde a última marcação;
- total consumido hoje e meta, quando houver espaço;
- ação curta para abrir o registro rápido;
- estado vazio quando não há conta ou registros;
- indicação discreta quando os dados estão desatualizados.

Exemplos de texto:

- “Bebeu água hoje”;
- “Último registro há 1 dia”;
- “Há 3 dias sem registrar”;
- “Há 7 dias sem registrar”;
- “Ainda não há registros”.

### 10.2 Tamanhos do MVP

Implementar primeiro:

- iOS `systemSmall` e `systemMedium`;
- Android pequeno e médio, com layout responsivo por breakpoint.

O tamanho pequeno mostra mascote + tempo. O médio acrescenta progresso e botão/atalho.

### 10.3 Oferta no primeiro acesso

Depois de personagem, meta, volumes e fuso estarem salvos, gravar o primeiro snapshot e apresentar um preview do widget no onboarding.

- a ação principal é “Adicionar à tela inicial”;
- usar a solicitação de fixação oferecida pela plataforma quando disponível;
- quando a adição depender de ação manual, mostrar passos visuais curtos e permitir abrir novamente a ajuda em Configurações;
- “Agora não” conclui o onboarding normalmente;
- persistir apenas que a oferta foi `requested` ou `skipped`, sem assumir instalação quando o sistema não fornecer confirmação confiável;
- nunca solicitar permissão de notificação como requisito para o widget.

### 10.4 Implementação iOS

Usar:

- SwiftUI;
- WidgetKit;
- Widget Extension;
- App Group para snapshot compartilhado;
- `UserDefaults(suiteName:)` ou arquivo atômico no container compartilhado;
- App Intent somente quando houver ação interativa compatível e segura;
- deep link como fallback universal.

O app React Native grava o snapshot no App Group por meio do módulo nativo e solicita reload do timeline quando houver mudança relevante.

### 10.5 Implementação Android

Usar:

- Kotlin;
- Jetpack Glance;
- `GlanceAppWidgetReceiver`;
- DataStore/SharedPreferences ou arquivo local controlado para snapshot;
- `ActionCallback` ou deep link para interação;
- atualização explícita após mudança de dados e atualização periódica conservadora.

Widgets Android são renderizados em processo remoto e possuem limitações próprias. Não reutilizar componentes React Native ou Jetpack Compose comuns diretamente dentro do Glance.

### 10.6 Snapshot compartilhado

Definir schema versionado:

```json
{
  "schema_version": 1,
  "generated_at": "2026-09-02T12:00:00Z",
  "locale": "pt-BR",
  "user_timezone": "America/Sao_Paulo",
  "last_log_at": "2026-09-02T11:45:00Z",
  "days_since_last_log": 0,
  "today_total_ml": 1200,
  "daily_goal_ml": 2200,
  "character_model_code": "default",
  "condition": "happy",
  "decoration": null,
  "static_asset": "aqualino_happy"
}
```

O snapshot não deve conter token, e-mail, data de nascimento ou informações pessoais desnecessárias.

O widget resolve textos, datas e números pelo `locale` do snapshot usando recursos nativos gerados para os quatro idiomas. Alterar idioma no app grava novo snapshot e solicita atualização do widget.

### 10.7 Fluxo do widget no MVP

Fase inicial segura:

1. widget lê o último snapshot local;
2. toque em “Bebi água” abre `aqualino://hydrate/quick?source=widget`;
3. o app abre o seletor de volume ou usa um volume favorito confirmado pelo usuário;
4. o registro entra na mesma fila idempotente usada pela Home;
5. após resposta local/servidor, o app atualiza o snapshot e solicita refresh do widget.

Depois de estabilizar esse fluxo, implementar registro direto no widget com App Intent no iOS e Action Callback no Android. A ação direta deve usar um `client_event_id`, suportar offline, impedir toque duplicado e sincronizar com a mesma fila do app.

### 10.8 Limitações a respeitar

- o sistema operacional controla quando atualizações periódicas realmente ocorrem;
- não fazer polling frequente;
- não depender de chamadas contínuas à API pelo widget;
- usar o snapshot local como fonte imediata;
- imagens e layout devem ser leves;
- atualizar ao abrir o app, registrar água, sincronizar dados e receber evento relevante;
- o texto temporal pode ser calculado pela timeline nativa, mas a regra semântica precisa permanecer compatível com o backend.

## 11. Modelo de dados inicial

Usar UUID/ULID para entidades expostas publicamente. Manter `created_at`, `updated_at` e, onde fizer sentido, `deleted_at`. Valores de volume são inteiros em mililitros.

### 11.1 Tabelas principais

#### `users`

- `id`;
- `email` normalizado e único;
- `password`;
- `email_verified_at`;
- timestamps.

#### `user_profiles`

- `user_id` único;
- `display_name`;
- `username` único e normalizado;
- `avatar_url` opcional;
- `character_model_code`;
- `timezone` IANA;
- `locale`: `pt-BR`, `en`, `es` ou `zh-Hans`;
- `locale_selected_at`;
- `onboarding_current_step`;
- `onboarding_started_at`;
- `onboarding_completed_at`;
- `widget_prompt_status`: `pending`, `skipped` ou `requested`;
- configurações públicas controladas.

No dispositivo, persistir também o locale de bootstrap para renderizar telas pré-login e funcionar offline. Após login, reconciliar com o perfil sem misturar idioma e fuso horário.

#### `character_models`

- `code` único e estável;
- `name_key` e `description_key`;
- `asset_manifest_version`;
- mapeamento dos assets de preview e estados do Aqualino;
- `sort_order`;
- `is_active`;
- timestamps.

O modelo padrão deve permanecer disponível como fallback. Desativar um modelo impede novas escolhas, mas não deve quebrar perfis existentes sem uma migração explícita.

#### `hydration_goals`

- `id`;
- `user_id`;
- `daily_goal_ml`;
- `starts_on`;
- `ends_on` opcional;
- origem da configuração.

Manter histórico de alteração de metas para que relatórios passados não sejam reinterpretados silenciosamente.

#### `hydration_logs`

- `id`;
- `user_id`;
- `amount_ml`;
- `occurred_at` UTC;
- `local_date` calculada/validada para consultas;
- `timezone_at_event`;
- `source`: `mobile`, `widget`, `shortcut`, `import`;
- `client_event_id`;
- `metadata` JSONB opcional e controlado;
- timestamps e soft delete quando necessário.

Índice único recomendado: `(user_id, client_event_id)`.

#### `daily_user_stats`

- `user_id`;
- `local_date`;
- `total_ml`;
- `goal_ml_snapshot`;
- `goal_achieved_at`;
- `xp_earned`;
- `log_count`;
- timestamps.

Chave única: `(user_id, local_date)`.

É uma projeção reconstruível e deve ser atualizada transacionalmente ou reconciliada por job.

#### `user_streaks`

- `user_id` único;
- `current_streak`;
- `longest_streak`;
- `last_active_date` com pelo menos um registro válido;
- `updated_at`.

#### `streak_protections`

- `id`;
- `user_id`;
- `inventory_transaction_id` da unidade consumida, opcional enquanto armada;
- `potion_code`: `streak_freeze` ou `streak_revive`;
- `scope`: `hydration_streak` ou `solo_challenge_streak`;
- `challenge_id` obrigatório para escopo solo;
- `affected_date` opcional até a proteção ser aplicada;
- `status`: `armed`, `suspended`, `consumed` ou `cancelled`;
- `rule_version`;
- `armed_at`, `consumed_at` e timestamps.

Impedir por constraint/lock duas proteções efetivas para o mesmo `user_id + scope + challenge_id + affected_date`. Uma proteção armada fica `suspended`, sem débito, durante desafio de grupo ativo.

#### `groups`

- `id`;
- `owner_id`;
- `name`;
- avatar opcional;
- `timezone` IANA;
- código de convite protegido e expiração opcional;
- timestamps.

#### `group_memberships`

- `id`;
- `group_id`;
- `user_id`;
- `role`: `owner`, `member`;
- `status`: `invited`, `accepted`, `declined`, `removed`;
- `joined_at` e `removed_at` opcionais;
- timestamps.

Garantir no banco e na transação no máximo cinco associações aceitas por grupo e apenas um grupo ativo por usuário no MVP.

#### `challenge_presets`

- `id`;
- `code` e `version` únicos em conjunto;
- `name_key` e `description_key`;
- `duration_days`;
- `target_ml_per_day`;
- XP provisório por evento e bônus de conclusão;
- limiares de streak para `bronze`, `silver` e `gold`;
- `achievement_id` opcional;
- `is_active`;
- timestamps.

O catálogo é administrado pelo produto. O mobile somente escolhe uma versão publicada e nunca envia valores livres para duração, volume, XP ou medalhas.

#### `challenges`

- `id`;
- `type`: `group` ou `solo`;
- `group_id` opcional;
- `owner_user_id` opcional para solo;
- `preset_id` opcional para solo;
- `timezone` IANA;
- `start_date` e `end_date` inclusivas;
- `status`: `scheduled`, `active`, `completed`, `cancelled`;
- `rule_version`;
- `first_place_reward_rule_version` e snapshot JSONB da tabela, obrigatórios para grupo;
- `roster_locked_at`, `completed_at` e `cancelled_at` opcionais;
- timestamps.

Para grupo, a duração é sete dias e `end_date = start_date + 6 dias`. Para solo, a duração e os limiares vêm do snapshot da versão do preset. Garantir por constraint/lock que cada pessoa tenha no máximo um solo `scheduled` ou `active`.

#### `challenge_participants`

- `challenge_id`;
- `user_id`;
- `goal_ml_snapshot`;
- `current_challenge_streak` e `longest_challenge_streak`;
- `total_score`;
- `projected_position` e `final_position` opcionais;
- `projected_medal` e `final_medal`: `gold`, `silver`, `bronze` ou `none`;
- `provisional_xp` e `finalized_xp`;
- timestamps.

Chave única: `(challenge_id, user_id)`. O elenco do grupo não pode mudar depois de `roster_locked_at`.

#### `challenge_reward_draws`

- `id`;
- `challenge_id`;
- `user_id`;
- `final_position`, obrigatoriamente `1` no MVP;
- `reward_rule_version` e snapshot JSONB da tabela de probabilidades;
- `random_value` em intervalo documentado;
- `outcome`: `xp_extra`, `streak_freeze` ou `streak_revive`;
- `amount`: `100` para XP ou `1` para poção;
- `xp_transaction_id` ou `inventory_transaction_id` concedido;
- `drawn_at` e timestamps.

Chave única: `(challenge_id, user_id)`. Criar o sorteio e o lançamento da recompensa na mesma transação; retries do fechamento devolvem o mesmo resultado.

#### `daily_challenge_stats`

- `challenge_id`;
- `user_id`;
- `challenge_date` no fuso do desafio;
- `total_ml`;
- `target_ml_snapshot`;
- `score_percentage` limitado a 100;
- `goal_achieved_at` opcional;
- estado de progresso;
- timestamps.

Chave única: `(challenge_id, user_id, challenge_date)`. É uma projeção reconstruível a partir dos registros de hidratação, metas, desafio e elenco persistidos.

#### `xp_transactions`

- `id`;
- `user_id`;
- `source_type` e `source_id`;
- `amount` positivo ou negativo;
- `status`: `provisional`, `finalized` ou `revoked`;
- `reason` e `rule_version`;
- timestamps.

Usar lançamentos auditáveis e idempotentes. Cancelar um solo cria a reversão do XP provisório do desafio sem remover XP normal de hidratação.

#### `achievements`

- `id`;
- `code` único;
- `name_key`;
- `description_key`;
- `rule_version`;
- `is_active`;
- configuração JSONB controlada.

#### `user_achievements`

- `id`;
- `user_id`;
- `achievement_id`;
- `unlocked_at`;
- contexto JSONB mínimo.

Chave única: `(user_id, achievement_id)` quando a conquista não for repetível.

#### `device_tokens`

- `id`;
- `user_id`;
- `platform`;
- token criptografado ou protegido conforme a ameaça;
- `last_seen_at`;
- `revoked_at`;
- metadados de versão do app.

#### `notification_preferences`

- `user_id`;
- categorias habilitadas;
- horários escolhidos;
- início/fim do período silencioso;
- fuso horário;
- timestamps.

#### `store_products`

- `id`;
- `code`: `pro`, `streak_freeze_1`, `streak_revive_1` ou outro pacote aprovado;
- `product_type`: `subscription` ou `consumable`;
- `platform`: `ios` ou `android`;
- `store_product_id` único por plataforma;
- `store_offer_id` opcional para oferta VIP;
- `entitlement_code` opcional: `pro`;
- `inventory_item_code` e `quantity` opcionais para consumíveis;
- `audience`: `all` ou `vip`;
- `benefits`: `ad_free`, `vip_badge`, `monthly_potion_grant` e `potion_discount` quando aplicável;
- `is_active`;
- timestamps.

Preço, período e desconto exibidos vêm da loja; não persistir cópia como autoridade comercial no mobile. Garantir coerência entre tipo, entitlement e item por constraints.

#### `store_transactions`

- `id`;
- `user_id`;
- `platform`;
- `store_transaction_id` e `original_transaction_id`;
- `store_product_id`;
- `status`: `purchased`, `renewed`, `expired`, `cancelled`, `refunded` ou `revoked`;
- `purchased_at`, `expires_at`, `credited_at` e `revoked_at` opcionais;
- hash/referência segura do comprovante validado, sem logar payload sensível;
- timestamps.

Os identificadores externos precisam de constraints únicas para processar compra, restauração e notificações da loja de modo idempotente.

#### `entitlements`

- `id`;
- `user_id`;
- `code`: `pro`;
- `status`: `active`, `grace_period`, `expired` ou `revoked`;
- `source_transaction_id`;
- `starts_at`, `expires_at` e `verified_at`;
- timestamps.

Derivar `ad_free = true` e `badges = ["vip"]` apenas quando o status estiver `active` ou `grace_period`. A nova cota mensal e a oferta com desconto exigem `active`; não concedê-las em `grace_period`. Não persistir uma flag VIP independente que possa divergir do entitlement.

#### `inventory_balances`

- `user_id`;
- `item_code`: `streak_freeze` ou `streak_revive`;
- `quantity` inteiro não negativo;
- `reserved_quantity` inteiro não negativo;
- timestamps.

Chave única: `(user_id, item_code)`, com `0 <= reserved_quantity <= quantity`. `available_quantity = quantity - reserved_quantity`. Armar um Congelamento reserva uma unidade; cancelar libera a reserva; o consumo efetivo reduz `quantity` e `reserved_quantity` atomicamente. Esta tabela é uma projeção transacional do ledger e pode ser reconstruída.

#### `inventory_transactions`

- `id`;
- `user_id`;
- `item_code`;
- `quantity_delta` diferente de zero;
- `source_type`: `store_purchase`, `vip_monthly_grant`, `group_first_place_reward`, `potion_use`, `refund` ou `reversal`;
- `source_id` estável;
- `store_transaction_id`, `challenge_reward_draw_id` ou `streak_protection_id` opcional conforme a origem;
- `rule_version` e metadados mínimos de auditoria;
- timestamps.

Chave única recomendada: `(user_id, item_code, source_type, source_id)`. Atualizar ledger e saldo na mesma transação com lock pessimista, impedindo saldo negativo. Para a cota VIP, usar `source_id = YYYY-MM` e inserir as duas unidades em uma única transação de banco; isso torna a concessão mensal idempotente sem depender de uma flag do cliente.

#### `ad_opportunities`

- `id`;
- `user_id`;
- `client_event_id`;
- `placement`: `post_hydration_log`;
- `policy_version`;
- `status`: `eligible`, `consumed`, `skipped` ou `expired`;
- `consumed_at` opcional;
- timestamps.

Chave única: `(user_id, client_event_id, placement)`. Aplicar retenção curta e não armazenar volume de água, meta ou contexto de desafio nessa tabela.

#### `outbox_events`

- `id`;
- `type`;
- `aggregate_id`;
- payload mínimo;
- `available_at`;
- `processed_at`;
- tentativas e último erro.

### 11.2 Integridade e índices

Criar índices a partir das consultas reais. No mínimo avaliar:

- `hydration_logs (user_id, occurred_at desc)`;
- `hydration_logs (user_id, local_date)`;
- `daily_user_stats (local_date, total_ml desc)`;
- `group_memberships (user_id, status)` e `(group_id, status)`;
- `challenges (group_id, status, start_date)`;
- `challenges (owner_user_id, type, status)` com garantia de um solo ativo/agendado;
- `challenge_participants (challenge_id, total_score desc)`;
- `challenge_reward_draws (challenge_id, final_position)` e unicidade por participante;
- `daily_challenge_stats (challenge_id, challenge_date, score_percentage desc)`;
- `xp_transactions (user_id, status, created_at)`;
- `store_transactions (user_id, status, expires_at)`;
- `entitlements (user_id, code, status)`;
- `inventory_transactions (user_id, item_code, created_at)` e constraint de idempotência por origem;
- `streak_protections (user_id, scope, status, affected_date)`;
- `ad_opportunities (user_id, created_at)` e constraint única por evento/placement;
- `outbox_events (processed_at, available_at)`;
- `device_tokens (user_id, revoked_at)`.

Adicionar constraints de quantidade positiva, estados válidos e relacionamentos. Não confiar apenas na validação do mobile.

## 12. API inicial

Versionar endpoints em `/api/v1` e padronizar erros.

Formato conceitual de erro:

```json
{
  "error": {
    "code": "HYDRATION_AMOUNT_INVALID",
    "message_key": "errors.hydration.amount_invalid",
    "message": "A quantidade informada é inválida.",
    "fields": {
      "amount_ml": [
        {
          "message_key": "validation.between_ml",
          "params": { "min": 50, "max": 2000 }
        }
      ]
    },
    "request_id": "..."
  }
}
```

`code` e `message_key` são estáveis; `message` é apenas fallback. O mobile traduz pela chave usando o locale global. Erros de validação devem identificar campos e regras sem obrigar o backend a decidir o texto final da interface.

Endpoints iniciais:

```text
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/forgot-password
GET    /api/v1/me
PATCH  /api/v1/me/profile
PUT    /api/v1/me/onboarding/progress
POST   /api/v1/me/onboarding/complete
DELETE /api/v1/me

GET    /api/v1/character-models

GET    /api/v1/hydration/today
GET    /api/v1/hydration/logs
POST   /api/v1/hydration/logs
PATCH  /api/v1/hydration/logs/{id}
DELETE /api/v1/hydration/logs/{id}
GET    /api/v1/hydration/goals/current
PUT    /api/v1/hydration/goals/current

GET    /api/v1/gamification/snapshot
GET    /api/v1/achievements
GET    /api/v1/profiles/{user_id}
GET    /api/v1/profiles/{user_id}/achievements

GET    /api/v1/groups/current
POST   /api/v1/groups
POST   /api/v1/groups/current/invitations
POST   /api/v1/groups/invitations/{code}/accept
DELETE /api/v1/groups/current/members/me
DELETE /api/v1/groups/current/members/{user_id}
PATCH  /api/v1/groups/current/owner
GET    /api/v1/groups/current/challenges/current

GET    /api/v1/challenge-presets
GET    /api/v1/solo-challenges/current
POST   /api/v1/solo-challenges
POST   /api/v1/solo-challenges/{id}/cancel

GET    /api/v1/monetization/products
GET    /api/v1/monetization/entitlement
POST   /api/v1/monetization/purchases/verify
POST   /api/v1/monetization/purchases/restore
POST   /api/v1/monetization/ad-opportunities/{id}/consume

GET    /api/v1/inventory
POST   /api/v1/inventory/potions/streak-freeze/arm
DELETE /api/v1/inventory/streak-protections/{id}
POST   /api/v1/inventory/potions/streak-revive/use

GET    /api/v1/notifications/preferences
PUT    /api/v1/notifications/preferences
POST   /api/v1/devices
DELETE /api/v1/devices/{id}

GET    /api/v1/widget/snapshot
```

O endpoint `POST /hydration/logs` deve aceitar `client_event_id` e retornar o mesmo resultado lógico em retries. Avaliar suporte a header `Idempotency-Key`, especialmente para futuras ações diretas do widget.

Resposta agregada sugerida após registrar água:

```json
{
  "data": {
    "log": {},
    "today": {
      "total_ml": 1500,
      "goal_ml": 2200,
      "percentage": 68
    },
    "gamification": {
      "xp_awarded": 5,
      "level": 3,
      "hydration_streak": 4,
      "new_achievements": []
    },
    "mascot": {
      "character_model_code": "default",
      "condition": "happy",
      "decoration": null,
      "static_asset": "aqualino_happy"
    },
    "widget": {
      "schema_version": 1,
      "days_since_last_log": 0
    },
    "selected_challenge": {
      "id": "...",
      "type": "group",
      "status": "active",
      "start_date": "2026-09-03",
      "end_date": "2026-09-09",
      "timezone": "America/Sao_Paulo",
      "day_number": 1,
      "challenge_streak": 1,
      "daily_score": 68,
      "total_score": 68,
      "projected_position": 2,
      "projected_medal": "silver",
      "provisional_xp": 5,
      "pending": false
    },
    "monetization": {
      "plan": "free",
      "entitlement_status": "free",
      "badges": [],
      "potion_discount_percent": 0,
      "post_log_ad": {
        "eligible": true,
        "opportunity_id": "...",
        "placement": "post_hydration_log",
        "policy_version": 1
      }
    }
  }
}
```

O retry do mesmo `client_event_id` devolve a mesma oportunidade lógica, sem criar uma segunda. Depois de `consumed`, ela não pode ser exibida novamente. Para Pro ativo ou em carência, `eligible` é sempre `false` e o mobile não inicializa carregamento de anúncio para esse fluxo.

Os endpoints que armam ou usam poção exigem `Idempotency-Key`, escopo explícito e, para solo, `challenge_id`. Devem devolver saldo reconciliado, proteção criada/consumida, sequência resultante e a data afetada. Erros estáveis mínimos: `POTION_BALANCE_INSUFFICIENT`, `POTION_GROUP_MODE_FORBIDDEN`, `POTION_SCOPE_INVALID`, `STREAK_FREEZE_ALREADY_ARMED`, `STREAK_BREAK_NOT_FOUND` e `STREAK_REVIVE_WINDOW_EXPIRED`. Uma rejeição nunca debita ou reserva item.

`GET /inventory` devolve saldo total, saldo reservado, saldo disponível e proteções armadas/suspensas. `GET /monetization/products` devolve apenas os identificadores de produtos/ofertas elegíveis para a plataforma e audiência atuais; o mobile consulta o SDK da loja para renderizar o preço localizado autoritativo. `POST /monetization/purchases/verify` aceita tanto assinatura quanto consumível e nunca confia em `item_code`, quantidade, preço ou status VIP enviados pelo mobile.

O payload do desafio de grupo inclui a tabela versionada `first_place_reward` antes do início e, depois de `completed`, o `reward_draw` do usuário autenticado. Não expor `random_value` interno aos demais participantes. Cada vencedor empatado em 1º lugar recebe exatamente um resultado, sem duplicação em retry.

Os payloads do próprio perfil e dos participantes do grupo devolvem `badges: ["vip"]` somente para Pro ativo/em carência. Consultas de outros perfis exigem vínculo aceito no mesmo grupo e nunca incluem detalhes da assinatura.

Notificações de compra, renovação, reembolso e revogação vindas das lojas usam endpoints de webhook separados da API mobile, validação de assinatura, proteção contra replay e processamento idempotente. Reembolso de consumível ainda não gasto estorna o inventário; se já consumido, segue política de saldo/revisão documentada sem criar quantidade negativa silenciosamente.

## 13. Docker, Redis, Horizon e Nginx

### 13.1 Ambiente local

O `compose.yaml` deve conter serviços separados:

```text
nginx
api (php-fpm)
horizon
scheduler
postgres
redis
mailpit (apenas desenvolvimento)
```

O mobile roda no host/emulador, consumindo a API pelo endereço apropriado da plataforma. Documentar diferenças entre simulador iOS, emulador Android e dispositivo físico.

### 13.2 Imagens e processos

- usar build multi-stage;
- imagem PHP enxuta e com extensões estritamente necessárias;
- executar como usuário não-root quando possível;
- API, Horizon e Scheduler podem compartilhar a mesma imagem, mas executar comandos/processos distintos;
- usar healthchecks reais;
- configurar `restart` apenas onde fizer sentido;
- não embutir `.env` nem secrets na imagem;
- fixar versões das imagens base;
- usar volumes de código somente em desenvolvimento;
- ativar OPcache em produção;
- instalar dependências de produção com flags apropriadas;
- executar migrations como etapa controlada de deploy, não em todo start concorrente.

### 13.3 Horizon

Definir filas por prioridade:

```text
critical      confirmação curta necessária ao produto
notifications push e e-mails
gamification  conquistas e reconciliações
analytics     eventos não críticos
maintenance   agregações e limpezas
```

Configurar supervisors separados quando a carga justificar. Definir timeout, tries, backoff e tags de job. Jobs precisam ser idempotentes.

Não colocar no Horizon uma operação que precisa terminar antes da resposta HTTP, salvo quando a API assumir explicitamente consistência eventual.

### 13.4 Scheduler

Executar `schedule:work` ou mecanismo equivalente em container/processo dedicado. Usar scheduler para:

- gerar lembretes devidos em lotes;
- ativar desafios agendados e fechar/reconciliar janelas concluídas, incluindo sorteios idempotentes de 1º lugar;
- conceder a cota VIP mensal uma única vez por `user_id + YYYY-MM` para entitlements ativos;
- reprocessar outbox;
- limpar tokens inválidos;
- reconciliar entitlements, compras consumíveis e reembolsos pendentes e expirar oportunidades de anúncio antigas;
- reconciliar agregados;
- podar jobs e dados operacionais conforme retenção.

Usar locks para impedir execução duplicada quando houver mais de uma réplica.

### 13.5 Redis

Usar Redis para:

- filas;
- locks distribuídos;
- rate limiting;
- cache de snapshots curtos;
- placar do desafio ativo com sorted sets, quando necessário;
- deduplicação temporária de notificações.

Não usar Redis como única fonte de verdade de consumo, XP, conquistas, grupos, desafios, sorteios, compras, inventário, proteções ou entitlements.

Definir prefixo por ambiente e aplicação. Em produção, exigir autenticação/TLS conforme o provedor, política de memória e estratégia de persistência compatível com o uso.

### 13.6 Nginx

Configurar:

- reverse proxy para a API/PHP-FPM;
- limite de tamanho do corpo;
- timeouts coerentes;
- compressão para JSON/texto quando vantajosa;
- headers de segurança aplicáveis;
- propagação de `X-Request-ID`;
- rate limit de proteção em autenticação, busca e convites;
- logs de acesso estruturados ou facilmente correlacionáveis;
- endpoint de health sem dados sensíveis.

TLS deve terminar no load balancer/provedor ou Nginx, conforme o ambiente de produção.

## 14. Performance e escalabilidade

O objetivo inicial é eficiência simples e mensurável:

- paginar todas as listas potencialmente grandes;
- evitar N+1 no Laravel;
- selecionar apenas colunas necessárias;
- cachear somente leituras caras e com estratégia clara de invalidação;
- usar agregados diários para histórico e desafios;
- comprimir imagens e carregar animações sob demanda;
- reduzir re-renderizações mobile com profiling, não por suposição;
- manter payloads pequenos;
- usar ETag/conditional requests quando trouxer ganho real;
- enviar operações offline em lote controlado;
- usar índices baseados em `EXPLAIN ANALYZE` quando a base crescer.

Não implementar Kubernetes, sharding ou microserviços antecipadamente. O monólito modular deve permitir extrair um módulo apenas se métricas e necessidades organizacionais justificarem.

## 15. Segurança, LGPD e abuso

Implementar desde o início:

- validação e autorização no backend;
- políticas Laravel para recursos do usuário;
- rate limiting;
- senhas com algoritmo seguro padrão do framework;
- tokens mobile em armazenamento seguro;
- logs sem senha, token ou payload pessoal desnecessário;
- secrets somente no backend/infraestrutura;
- proteção contra enumeração de contas;
- verificação de propriedade em edição/exclusão de logs;
- bloqueio de usuário em recursos sociais;
- exclusão de conta e política de retenção;
- consentimento e preferências de notificação;
- consentimento de publicidade e opção não personalizada quando aplicável;
- validação de compras e restaurações no backend;
- validação do produto, oferta, audiência VIP e quantidade de consumível diretamente contra a loja;
- assinatura e proteção contra replay nos webhooks das lojas;
- autorização do entitlement Pro por usuário, sem confiar em flag local editável;
- ledger imutável, lock transacional e idempotência para impedir saldo negativo, crédito duplicado ou uso concorrente da mesma poção;
- bloqueio no backend de toda ativação ou consumo de poção durante desafio de grupo ativo;
- auditoria da versão, entrada aleatória e resultado de cada sorteio de 1º lugar;
- proibição de enviar hidratação, meta, streak ou desafio ao provedor de anúncios;
- auditoria mínima de alterações que afetam desafios, medalhas ou XP;
- dependabot ou equivalente para dependências;
- análise estática e verificação de vulnerabilidades no CI.

Tudo dentro do APK/IPA deve ser considerado público. Nunca incluir senha de banco, segredo Redis, chave privada de push ou credencial de provedor no mobile.

## 16. Observabilidade e analytics

### 16.1 Logs e erros

- gerar `request_id` por requisição;
- correlacionar API e jobs;
- usar logs JSON em produção;
- enviar erros inesperados ao Sentry;
- não enviar dados pessoais desnecessários ao monitoramento;
- criar healthchecks separados de liveness e readiness quando a hospedagem suportar.

### 16.2 Eventos de produto

Eventos iniciais:

```text
onboarding_started
language_selected
onboarding_step_completed
onboarding_completed
character_model_selected
reminder_opt_in_changed
widget_add_requested
widget_add_skipped
water_log_created
water_log_synced
daily_goal_reached
streak_incremented
achievement_unlocked
widget_opened
widget_quick_action_started
group_created
group_invite_sent
group_invite_accepted
group_challenge_scheduled
group_challenge_viewed
group_challenge_completed
group_first_place_reward_drawn
solo_challenge_started
solo_challenge_cancelled
solo_challenge_completed
inventory_viewed
potion_offer_viewed
potion_purchase_started
potion_purchase_completed
vip_monthly_potions_granted
streak_freeze_armed
streak_freeze_consumed
streak_revive_consumed
potion_use_blocked_in_group
pro_offer_viewed
pro_purchase_started
pro_purchase_completed
pro_purchase_restored
pro_entitlement_changed
post_log_ad_eligible
post_log_ad_impression
post_log_ad_dismissed
post_log_ad_failed
notification_opened
```

Definir schema versionado. Analytics e publicidade não podem bloquear o registro de água. Eventos internos podem medir o funil, mas loja, analytics e provedor de anúncios não recebem quantidade, meta, streak, desafio ou grupo. Não enviar `random_value`, comprovante da loja ou saldo individual de inventário para ferramentas de analytics.

## 17. Design system e experiência visual

Centralizar cores, tipografia, espaçamento, raios, sombras, motion e estados em design tokens. Evitar cor hardcoded em telas individuais.

Estrutura recomendada:

```text
packages/design-tokens/
├── tokens.json
├── src/typescript/
├── generated/swift/
└── generated/kotlin/
```

Estrutura mínima de traduções:

```text
packages/i18n/
├── locales/
│   ├── pt-BR.json
│   ├── en.json
│   ├── es.json
│   └── zh-Hans.json
├── src/
└── generated/
    ├── ios/
    └── android/
```

Todos os catálogos devem possuir o mesmo conjunto tipado de chaves. O CI falha em caso de chave ausente, parâmetro incompatível ou tradução ainda igual à chave técnica.

Os widgets nativos devem consumir tokens gerados a partir da mesma fonte sempre que viável.

Direção visual:

- moderna, simples, amigável e energética;
- predominância de azuis/turquesas próprios do Aqualino;
- Home organizada como trilha do desafio atual, com etapas em forma de gotas, ondas ou recipientes;
- último nó do desafio em formato de troféu, usando ouro, prata ou bronze para a premiação projetada/final;
- corais inspirados nas cores reais de recifes — laranja, salmão, vermelho, rosa, magenta, roxo e amarelo — nas bordas, sem prejudicar contraste ou toque;
- alto contraste e compatibilidade com modo escuro;
- cards arredondados sem excesso de sombras;
- transições de entrada, modais, registro, streak e conquistas com continuidade inspirada no movimento da água;
- animações comuns entre 180 ms e 450 ms, priorizando `transform` e `opacity`;
- animações curtas como recompensa, nunca como bloqueio de interação;
- alternativa por `fade` curto quando a redução de movimento do sistema estiver ativa;
- feedback tátil opcional em ações importantes;
- anúncio pós-registro somente depois do estado de sucesso e das recompensas, com fechamento acessível;
- oferta Pro objetiva, mostrando remoção de anúncios, badge VIP, cota mensal, desconto de poções e ações de assinar, restaurar e gerenciar;
- badge VIP com ícone e texto no perfil e nos participantes do grupo, sem depender apenas de cor;
- inventário com saldo total/disponível, origem da última alteração e estados claros para Congelamento e Reacender;
- probabilidades do sorteio de 1º lugar visíveis antes do desafio, sem animação que sugira chances diferentes das regras publicadas;
- controles de poção desabilitados com explicação durante o modo de grupo, sem esconder itens comprados;
- textos naturais e revisados em `pt-BR`, `en`, `es` e `zh-Hans`, sem strings de UI espalhadas;
- fonte e layout com cobertura para caracteres chineses, expansão de texto em espanhol e inglês e pluralização por locale.

Criar storybook/catálogo de componentes somente se trouxer utilidade no ritmo do MVP. No mínimo, manter uma tela interna de desenvolvimento para validar tokens, componentes e todos os estados do Aqualino.

## 18. Testes obrigatórios

### 18.1 Backend

Cobrir ao menos:

- cadastro/login/logout;
- autorização por usuário;
- validação e sincronização dos locales `pt-BR`, `en`, `es` e `zh-Hans`;
- renderização de notificações no locale mais recente do perfil;
- catálogo de personagens, fallback e persistência idempotente do progresso do onboarding;
- bloqueio da conclusão sem personagem ou meta;
- criação idempotente de hydration log;
- cálculo por fuso horário;
- transição dos estados `empty`, `happy`, `angry`, `boiling`, `skeleton`;
- decoração de ouro/prata/bronze sem esconder a condição de hidratação;
- atualização e reconstrução de `daily_user_stats`;
- sequência no primeiro registro válido do dia, sem contar login isolado;
- limite de XP;
- edição/exclusão e reconciliação;
- autorização, limite transacional de cinco integrantes e grupo único por pessoa;
- desafio de grupo começando no próximo dia local e terminando após sete dias inclusivos;
- elenco congelado, pontuação diária limitada a 100, total limitado a 700 e desempate/classificação de competição;
- premiação de ouro, prata e bronze, incluindo empates e posições puladas;
- sorteio único para cada 1º lugar, incluindo empates, com fronteiras exatas de 70%/20%/10%, versão persistida e XP mais provável;
- retry concorrente do fechamento sem repetir sorteio, XP ou crédito de poção;
- catálogo solo versionado e bloqueio de dois desafios solo ativos/agendados;
- cancelamento solo com reversão apenas de streak e XP provisórios do desafio;
- elegibilidade pós-registro, frequência e consumo idempotente da oportunidade de anúncio;
- ausência de oportunidade em offline pendente, background, retry, edição, exclusão e Pro;
- validação de compra, restauração e webhooks de renovação/reembolso/revogação;
- transições do entitlement `free`, `pro_active`, `grace_period`, `expired` e `revoked`;
- badge VIP derivado do entitlement, visível somente em `pro_active`/`grace_period` e sem detalhes de cobrança;
- compra de ambos os consumíveis por conta gratuita e VIP, validada contra produto/oferta da loja;
- crédito único por transação, saldo não negativo e uso concorrente de uma única unidade;
- cota de `1x` de cada poção por competência apenas em `pro_active`, sem duplicação por retry, restauração, reinstalação ou webhook;
- ausência de nova cota em `grace_period` e preservação do inventário após cancelamento/expiração;
- reserva, cancelamento e consumo de Congelamento, além da janela de 48 horas do Reacender;
- liberação da reserva sem consumo quando o desafio solo alvo termina ou é cancelado;
- proteção distinta para hidratação e solo sem gerar água, meta, XP, pontos, medalha ou conquista fictícios;
- rejeição de ativação, consumo automático e recuperação durante grupo ativo, sem debitar saldo;
- suspensão e rearme de Congelamento sem recuperação retroativa de quebra ocorrida no grupo;
- estorno seguro de consumível não gasto e tratamento explícito quando o item já foi consumido;
- autorização para consultar badge/perfil apenas entre integrantes aceitos do mesmo grupo;
- concessão idempotente de conquistas;
- jobs de notificação idempotentes;
- resposta padronizada de erro.

Usar relógio congelado nos testes de data/hora e testar mudança de dia no fuso do usuário.

### 18.2 Mobile

Cobrir:

- seletor de idioma como primeira tela, disponível offline e antes da autenticação;
- troca dinâmica global entre os quatro locales sem reiniciar ou perder estado;
- fallback para `pt-BR`, plurais, datas, números, acessibilidade e layouts com caracteres chineses;
- primeiro acesso completo, retomada de cada etapa e abertura da Home após confirmação;
- escolha e alteração de personagem refletidas em Home, perfil e snapshot;
- meta obrigatória, configuração dos volumes e fuso;
- permissão de notificação solicitada somente após opt-in e recusa sem bloqueio;
- oferta do widget, fluxo suportado, instrução de fallback e opção “Agora não”;
- Home nos estados loading, vazio, offline, erro e sucesso;
- trilha do desafio com intervalo, dia atual, todos os estados e último nó em formato de troféu;
- alternância entre grupo e solo quando ambos estiverem ativos;
- registro otimista e rollback;
- fila offline e sincronização sem duplicar;
- reconciliação visual de streak, pontuação e medalha pendentes;
- criação, convite, entrada, saída e desafio de sete dias do grupo;
- seleção, início, conclusão e cancelamento de modalidade solo;
- vitrine de conquistas restrita a integrantes aceitos;
- anúncio gratuito somente depois da confirmação, atualização visual e recompensa do registro;
- limites de frequência, falha do SDK sem bloqueio e oportunidade exibida no máximo uma vez;
- Pro sem carregar ou exibir anúncios, inclusive a partir do cache válido offline;
- oferta, compra, restauração e gerenciamento traduzidos e acessíveis;
- badge VIP no próprio perfil e nos participantes do grupo, removido após expiração/revogação;
- inventário e ofertas dos dois tipos de poção para usuários gratuitos e VIP;
- preço oficial da loja e desconto VIP exibidos sem cálculo autoritativo no cliente;
- concessão mensal refletida uma única vez e inventário preservado ao perder o Pro;
- ativação do Congelamento, uso do Reacender e estados `armed`, `suspended` e `consumed`;
- controles bloqueados e motivo acessível durante desafio de grupo ativo, mantendo compra e consulta disponíveis;
- regras e probabilidades de 70%/20%/10% visíveis antes do grupo e revelação do prêmio depois do fechamento;
- motion de entrada, modal, registro e conquistas, incluindo redução de movimento;
- hidratação do cache ao reabrir;
- navegação por deep link do widget;
- atualização do snapshot nativo;
- renderização dos estados do Aqualino;
- acessibilidade dos controles principais.

### 18.3 Widget

Criar testes nativos onde possível e checklist manual automatizável para:

- usuário deslogado;
- sem registros;
- registro hoje;
- 1, 3, 6, 7 e mais dias;
- mudança de fuso;
- modo claro/escuro;
- tamanho pequeno/médio;
- snapshot antigo ou inválido;
- atualização após registrar;
- deep link com app fechado;
- múltiplos toques;
- funcionamento offline;
- textos, datas e números corretos nos quatro locales após atualização do snapshot.

### 18.4 E2E crítico

Fluxo mínimo:

```text
Escolher idioma
→ criar conta
→ concluir onboarding
→ registrar 300 ml
→ visualizar progresso e Aqualino feliz
→ fechar e reabrir app
→ confirmar persistência
→ abrir pelo deep link do widget
→ registrar novamente
→ confirmar que não houve duplicidade
→ no plano gratuito, confirmar anúncio somente após o sucesso e respeitando a frequência
→ assinar ou restaurar o Pro
→ registrar novamente e confirmar que nenhum anúncio foi solicitado
→ confirmar badge VIP, cota de uma unidade de cada poção e oferta com desconto
→ iniciar um desafio de grupo e confirmar que nenhuma poção pode ser usada ou debitada
→ concluir em 1º lugar com RNG controlado e confirmar um único prêmio conforme a tabela versionada
→ fora do grupo, armar Congelamento e usar Reacender dentro da janela permitida
```

## 19. Qualidade e CI/CD

Pipeline mínimo em pull request:

- validação de formatação;
- paridade de chaves, placeholders e tipos entre os quatro catálogos de tradução;
- ESLint;
- TypeScript sem erros;
- testes mobile;
- Laravel Pint;
- Larastan/PHPStan em nível progressivamente rigoroso;
- testes da API;
- validação do OpenAPI;
- build da imagem Docker;
- scan de dependências e secrets;
- build Android de verificação;
- build iOS em runner compatível quando disponível.

Separar pipelines por paths para não construir tudo em toda alteração. Usar cache de Composer, pnpm, Gradle e CocoaPods com chaves corretas.

Deploys:

- API por imagem imutável;
- migrations controladas;
- rollback de aplicação compatível com migrations;
- mobile por tracks de teste interno antes de produção;
- feature flags simples para alterações de gamificação de maior risco.

## 20. Fases de implementação

### Fase 0 — Fundação

Entregar:

- monorepo e workspaces;
- React Native inicial executando em iOS/Android;
- Laravel API executando via Docker;
- PostgreSQL, Redis, Horizon, Scheduler e Nginx;
- healthcheck;
- autenticação base;
- OpenAPI inicial;
- lint, testes e CI;
- design tokens iniciais;
- pacote de i18n com catálogos completos para `pt-BR`, `en`, `es` e `zh-Hans`;
- manifesto e catálogo inicial dos modelos de personagem existentes;
- ADRs essenciais.

Critério: novo desenvolvedor consegue executar o backend com um comando documentado e iniciar o mobile seguindo o README.

### Fase 1 — Hidratação vertical

Entregar:

- seletor de idioma pré-login e troca dinâmica global;
- onboarding retomável com escolha de personagem;
- meta, volumes rápidos, fuso e preferências iniciais de lembrete;
- Home com trilha semanal sem desafio;
- registro online/offline;
- histórico curto;
- snapshot agregado;
- estados `empty`, `happy`, `angry`, `boiling` e `skeleton`;
- testes de fuso e idempotência.

Critério: o fluxo principal funciona de ponta a ponta e sobrevive a perda temporária de conexão.

### Fase 2 — Widget

Entregar:

- snapshot compartilhado versionado;
- WidgetKit pequeno/médio;
- Glance pequeno/médio;
- imagens estáticas do Aqualino;
- snapshot respeitando o personagem escolhido;
- preview e oferta de adicionar o widget dentro do onboarding;
- deep link de registro rápido;
- atualização após mudança;
- testes/checklist nativos.

Critério: o widget exibe corretamente os dias desde o último registro com o app fechado e abre o fluxo certo ao tocar.

### Fase 3 — Gamificação

Entregar:

- XP;
- níveis;
- sequência;
- conquistas;
- motion fluido para entrada, registro, modais, streak e conquistas;
- Rive dentro do app, caso o asset esteja pronto;
- eventos de analytics;
- tela de progresso.

Critério: regras são determinísticas, testadas e configuráveis no backend.

### Fase 4 — Desafios solo e em grupo

Entregar:

- username;
- grupo privado com convite;
- limite de cinco integrantes e um grupo ativo por pessoa;
- entrada, saída, remoção e transferência de responsabilidade;
- janela de grupo iniciando no dia seguinte e durando sete dias;
- placar acumulado com volume, percentual, posição e empate;
- troféu final e medalhas ouro, prata e bronze;
- regra versionada e divulgação do sorteio gratuito do 1º lugar;
- sorteio idempotente por vencedor com 70% `+100 XP`, 20% Congelamento e 10% Reacender;
- ledger e saldo mínimo do inventário para creditar poções ganhas, ainda sem compra ou uso;
- catálogo versionado de modalidades solo;
- exclusividade, conclusão e cancelamento auditável de desafio solo;
- vitrine de conquistas entre integrantes aceitos;
- conquistas de grupo e específicas de cada modalidade solo;
- privacidade e rate limits.

Critério: apenas integrantes aceitos compartilham o placar e as vitrines; o sexto integrante é rejeitado de forma transacional; desafios, cancelamentos, XP, sorteios e premiações são reconstruíveis a partir do PostgreSQL.

### Fase 5 — Pro, poções, anúncios, notificações e preparação das lojas

Entregar:

- produtos Pro nas lojas e oferta traduzida no app;
- produtos consumíveis de Congelamento e Reacender disponíveis para gratuito e VIP;
- compra, restauração, gerenciamento e cache do entitlement;
- validação no backend e webhooks assinados de renovação, reembolso e revogação;
- inventário pessoal com ledger, saldo transacional e reconciliação de consumíveis/reembolsos;
- cota mensal VIP de uma unidade de cada poção e oferta com desconto inicial de 15%;
- ativação/consumo de Congelamento e Reacender para hidratação ou solo, com janela de 48 horas;
- bloqueio integral de poções em grupo ativo sem débito e sem alteração da competição;
- anúncio pós-registro com oportunidade idempotente e limites de frequência;
- bloqueio integral de anúncios para `pro_active` e `grace_period`;
- badge VIP no próprio perfil e nos participantes autorizados do grupo;
- remoção do badge após expiração/revogação, sem expor informações de cobrança;
- consentimento e publicidade não personalizada quando aplicável;
- FCM/APNs;
- entrega dos lembretes conforme preferências e período silencioso definidos no onboarding/perfil;
- jobs Horizon;
- exclusão de conta;
- política de privacidade/termos;
- ícones, splash e screenshots;
- acessibilidade e performance;
- builds assinados de homologação;
- checklist App Store/Play Store.

Critério: versões internas instaláveis, observáveis e prontas para revisão, com assinatura e consumíveis testados no sandbox, inventário idempotente, poções bloqueadas em grupo, restauração funcional, Pro sem anúncios e gratuito exibindo publicidade somente depois do registro concluído.

### Fase 6 — Interação direta no widget

Entregar somente após o fluxo base estar estável:

- App Intent no iOS;
- Action Callback no Android;
- registro offline idempotente pelo widget;
- feedback visual imediato;
- reconciliação com API e app;
- telemetria de falha sem dados sensíveis.

## 21. Decisões que o Codex não deve tomar silenciosamente

Solicitar confirmação antes de:

- trocar React Native por Flutter ou desenvolvimento totalmente nativo;
- dividir o backend em microserviços;
- adicionar Kafka/Kubernetes;
- alterar os benefícios iniciais do Pro além de remover anúncios, exibir badge VIP, conceder a cota mensal e oferecer o desconto de poções aqui definidos;
- alterar `1x` de cada poção por mês, desconto inicial de 15%, janela de 48 horas, efeitos das poções ou tabela 70%/20%/10% sem nova decisão de produto e versão de regra;
- definir preço, periodicidade, teste grátis, pacote, SKU, oferta ou provedor pago sem aprovação;
- coletar dado de saúde sensível adicional;
- tornar perfis, grupos, vitrines ou placares públicos;
- usar serviço pago não previsto;
- alterar a regra central de sequência, desafio ou premiação já publicada;
- publicar em produção ou nas lojas;
- executar migração destrutiva ou apagar dados.

## 22. Restrições de implementação

- não deixar regra de domínio crítica apenas no mobile;
- não usar Redis como banco definitivo;
- não colocar secrets no app;
- não criar um store global com todo o estado do produto;
- não chamar API diretamente de componentes visuais;
- não calcular dias ignorando o fuso do usuário;
- não criar registros sem chave de idempotência;
- não executar chamadas frequentes à rede a partir do widget;
- não mostrar anúncio antes/durante o registro ou bloquear seu resultado por falha publicitária;
- não carregar anúncios para entitlement Pro ativo/em carência;
- não enviar dados de hidratação, streak, desafio ou grupo à rede de anúncios;
- não confiar apenas no cliente para validar compra ou entitlement;
- não creditar consumível, cota VIP, desconto ou sorteio com base em estado enviado pelo cliente;
- não permitir saldo negativo, duplicar lançamento do inventário ou substituir o ledger por um contador sem auditoria;
- não ativar, consumir automaticamente ou reacender streak com poção durante desafio de grupo ativo;
- não permitir que poção crie volume, XP, pontuação, medalha ou conquista fictícios;
- não vender produto com resultado aleatório nem ocultar as probabilidades do sorteio gratuito de 1º lugar;
- não confiar em flag VIP local nem exibir detalhes de cobrança para outros participantes;
- não usar assets ou identidade do Duolingo em produção;
- não prometer precisão médica;
- não declarar uma fase concluída sem executar validações relevantes;
- não esconder testes falhando ou warnings relevantes.

## 23. Definição de pronto por funcionalidade

Uma funcionalidade só está pronta quando:

- o comportamento e os critérios de aceite estão claros;
- API, mobile e persistência necessária foram implementados;
- loading, vazio, erro, offline e sucesso foram considerados;
- autenticação/autorização foram validadas;
- eventos e jobs são idempotentes quando aplicável;
- testes relevantes passam;
- lint e tipos passam;
- migrations possuem estratégia segura;
- compras e restaurações foram verificadas no sandbox das lojas quando aplicável;
- consumíveis, cota VIP, desconto, inventário e reembolsos foram verificados de forma idempotente quando aplicável;
- probabilidades e versão do sorteio estão visíveis, persistidas e cobertas por testes determinísticos;
- publicidade não antecede/bloqueia registros e não é carregada para Pro;
- logs/telemetria não expõem dados sensíveis;
- documentação e `.env.example` estão atualizados;
- a funcionalidade foi verificada no emulador/simulador ou dispositivo adequado;
- nenhuma alteração não relacionada foi sobrescrita.

## 24. Primeira ordem de execução para o Codex

Ao receber este documento em um repositório vazio:

1. criar `docs/product/MVP.md` resumindo escopo e critérios sem alterar a intenção deste arquivo;
2. criar ADR para monorepo, React Native, monólito modular e widget nativo;
3. criar a estrutura mínima do monorepo;
4. configurar Docker Compose com API, Nginx, PostgreSQL, Redis, Horizon e Scheduler;
5. iniciar Laravel e healthcheck;
6. iniciar React Native com TypeScript e navegação;
7. configurar design tokens, tema, catálogos i18n e catálogo dos modelos de personagem existentes;
8. implementar seleção de idioma pré-login e provider global dinâmico;
9. implementar autenticação vertical;
10. implementar o onboarding retomável com personagem, meta, lembretes e preparação do widget;
11. implementar o registro de hidratação idempotente de ponta a ponta;
12. implementar estados do Aqualino e snapshot respeitando idioma e personagem escolhidos;
13. implementar o widget e sua oferta no onboarding somente após o contrato do snapshot estar testado;
14. implementar desafios solo e de grupo com medalhas, sorteio do 1º lugar e inventário mínimo para o prêmio;
15. implementar compra e uso de poções, cota/desconto VIP, Pro, restauração, entitlement e anúncios pós-registro com adapters de teste;
16. executar e registrar todas as verificações.

Antes de escrever muito código, apresentar um plano curto com arquivos/módulos que serão alterados e critérios de validação. Em seguida, começar a implementação; não parar apenas no plano.

## 25. Critérios de aceite da primeira entrega utilizável

A primeira entrega utilizável deve atender simultaneamente:

- `compose up` inicia API, Nginx, PostgreSQL, Redis, Horizon e Scheduler sem erro;
- a primeira tela permite confirmar `pt-BR`, `en`, `es` ou `zh-Hans` mesmo offline;
- a troca de idioma atualiza app e próximo snapshot do widget globalmente, sem reiniciar;
- o mobile cria conta e autentica;
- o primeiro acesso retoma etapas incompletas e exige idioma, personagem, meta e fuso;
- o personagem escolhido aparece na Home, no perfil e no snapshot do widget;
- o usuário configura ou pula lembretes sem receber pedido de permissão antes do opt-in;
- o usuário pode adicionar ou pular o widget sem bloquear a conclusão do onboarding;
- o usuário registra água online;
- o usuário registra offline e sincroniza sem duplicar;
- Home mostra total e progresso corretos;
- a Home alterna grupo/solo, mostra o intervalo correto e termina a trilha em troféu;
- o desafio de grupo inicia no dia seguinte, dura sete dias e concede medalhas por posição;
- cada 1º lugar recebe uma única recompensa pela tabela versionada 70% XP, 20% Congelamento e 10% Reacender, inclusive em empate;
- o catálogo solo impede dois desafios simultâneos e o cancelamento revoga apenas progresso provisório;
- usuários gratuitos e VIP podem comprar ambos os tipos de poção, com produto e preço validados pela loja;
- Pro ativo recebe uma unidade mensal de cada poção uma única vez e acessa a oferta com desconto inicial de 15%;
- expiração, revogação ou cancelamento preserva itens já creditados e interrompe apenas novas cotas e descontos;
- Congelamento e Reacender preservam apenas a sequência escolhida, sem inventar hidratação ou recompensas;
- durante desafio de grupo ativo, nenhuma poção é ativada, consumida ou usada para recuperação e nenhuma rejeição debita o saldo;
- o gratuito mantém todas as funções centrais e só recebe anúncio após um registro novo finalizado;
- retries, sincronização em background, registros offline pendentes, edições e exclusões não duplicam anúncio;
- a frequência respeita um anúncio a cada três registros, dez minutos de intervalo e máximo de três por dia;
- compra e restauração ativam o Pro, e Pro ativo/em carência não solicita nem exibe anúncios;
- Pro ativo/em carência exibe badge VIP no perfil e no grupo; expiração/revogação remove o badge;
- outros participantes não recebem preço, datas ou situação detalhada da assinatura;
- renovação, expiração, reembolso e revogação reconciliam o entitlement de forma idempotente;
- o provedor de anúncios não recebe volume, meta, streak, desafio ou grupo;
- o backend devolve estado correto do Aqualino;
- o widget pequeno e médio mostra o asset correto e o tempo desde o último registro;
- tocar no widget abre o registro rápido;
- testes de transição em 0, 1, 3 e 7 dias passam;
- logs do Horizon e API permitem correlacionar falhas;
- README contém comandos reproduzíveis;
- nenhuma credencial real está versionada.

## 26. Referências técnicas oficiais

Consultar documentação oficial durante a implementação, especialmente porque APIs e requisitos de lojas evoluem:

- React Native: <https://reactnative.dev/docs/getting-started>
- React Native Native Modules: <https://reactnative.dev/docs/turbo-native-modules-introduction>
- Apple WidgetKit: <https://developer.apple.com/documentation/widgetkit>
- Apple — interatividade em widgets: <https://developer.apple.com/documentation/widgetkit/adding-interactivity-to-widgets-and-live-activities>
- Apple App Review Guidelines — compras digitais e itens aleatórios: <https://developer.apple.com/app-store/review/guidelines/>
- Android Jetpack Glance: <https://developer.android.com/develop/ui/compose/glance>
- Google Play Payments — bens digitais e divulgação de probabilidades: <https://support.google.com/googleplay/android-developer/answer/9858738?hl=en>
- Google Play — tipos de produto único e consumíveis: <https://support.google.com/googleplay/android-developer/answer/14590082?hl=en-EN>
- Laravel: <https://laravel.com/docs>
- Laravel Horizon: <https://laravel.com/docs/horizon>
- PostgreSQL: <https://www.postgresql.org/docs/>
- Redis: <https://redis.io/docs/latest/>

Quando documentação comunitária conflitar com a documentação oficial atual, priorizar a documentação oficial e registrar a decisão em ADR.

---

## Resumo executivo

Construir o Aqualino como um monorepo com React Native + TypeScript no mobile e Laravel em monólito modular no backend. A primeira tela seleciona `pt-BR`, `en`, `es` ou `zh-Hans`, com troca global dinâmica e catálogos disponíveis offline. Em seguida, o onboarding retomável escolhe o modelo do personagem, define meta e lembretes e oferece a instalação do widget. O gratuito mantém todas as funções centrais, pode comprar Congelamento e Reacender e só recebe anúncio depois de um registro finalizado. O Pro remove anúncios, exibe badge VIP, concede uma unidade mensal de cada poção e oferece desconto inicial de 15%, sem vantagem em grupos. PostgreSQL é a fonte de verdade; Redis e Horizon processam filas, notificações, cache e placares quentes; Nginx atende a API; o registro de água funciona offline e é idempotente; o backend calcula gamificação, sequências, desafios, sorteios, inventário, premiações e entitlements; e o widget é nativo com WidgetKit no iOS e Glance no Android, alimentado por snapshot local versionado.

Priorizar primeiro o ciclo completo “escolher idioma → escolher personagem → configurar meta e lembretes → oferecer widget → registrar água → avançar na semana → atualizar streak, Aqualino e widget”. Em seguida, ainda dentro do MVP, concluir XP, conquistas, desafios, sorteio do 1º lugar, inventário/poções e o fluxo “registro concluído → anúncio elegível no gratuito / nenhum anúncio no Pro” sem quebrar esse núcleo.
