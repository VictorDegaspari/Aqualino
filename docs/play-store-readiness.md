**Aqualino — preparação para publicar na Google Play**

Auditoria em 10/09/2026. Base: código atual, configuração Android, APK de release local de 04/09/2026 e documentação oficial. Não houve acesso ao Play Console, confirmação de infraestrutura pública, geração de um novo AAB ou execução de uma homologação completa. “Não encontrado” se refere ao repositório inspecionado.

**Situação: ainda há bloqueios para publicação.** Os principais são API local, assinatura de debug, privacidade/termos sem páginas acessíveis, exclusão incompleta e ausência de mecanismos de denúncia/bloqueio para o conteúdo social.

**Checklist do que falta**

Marcar cada item somente após implementar e validar, ou confirmar no Play Console. Os critérios e as evidências estão detalhados abaixo. Itens condicionais podem ser registrados como “não se aplica”, com o motivo.

**Bloqueios — prioridade máxima**

- [ ] Configurar API pública com HTTPS e selecionar o ambiente de produção no app.
- [ ] Validar banco, fotos privadas, envio de e-mails, filas/agendador, backups e monitoramento em produção.
- [ ] Confirmar o identificador do app, configurar chave de upload e Play App Signing e gerar o AAB de release.
- [ ] Publicar política de privacidade e termos de uso, com links no cadastro e nas configurações.
- [ ] Disponibilizar solicitação de exclusão de conta dentro do app e pela web.
- [ ] Implementar o tratamento definitivo dos dados e fotos na exclusão, incluindo prazos de retenção e backups.
- [ ] Implementar denúncia, bloqueio e operação de moderação para o conteúdo social.

**Preparação para envio**

- [ ] Confirmar titular, tipo de conta, verificações e situação do acesso à produção no Play Console.
- [ ] Conferir registro do pacote e verificação de desenvolvedor Android.
- [ ] Revisar dados coletados, compartilhamento e SDKs; preencher Segurança dos dados e declaração de saúde.
- [ ] Definir países, preço, público etário, categoria e contato de suporte; preencher classificação indicativa e declaração de anúncios.
- [ ] Preparar nome, descrição curta, descrição completa e traduções da ficha.
- [ ] Exportar ícone da loja, imagem de destaque e capturas da versão final.
- [ ] Conferir direitos de uso dos materiais e esclarecimentos de saúde na descrição.
- [ ] Preparar conta de demonstração e instruções de acesso para os revisores.

**Validação e publicação**

- [ ] Revisar permissões do manifest final, API alvo, suporte a 64 bits e páginas de 16 KB.
- [ ] Executar os testes da versão candidata e a homologação dos fluxos descrita no item 6.
- [ ] Instalar o AAB pela faixa interna e confirmar funcionamento sem o ambiente de desenvolvimento.
- [ ] Corrigir problemas bloqueantes apontados nos testes e no relatório de pré-lançamento.
- [ ] Cumprir o teste fechado obrigatório e solicitar acesso à produção, caso se aplique à conta.
- [ ] Conferir ficha e declarações, enviar para análise e acompanhar o resultado no Console.

**1. Bloqueios no produto e na infraestrutura**

| Prioridade | Evidência atual | Entrega necessária | Critério de conclusão |
| --- | --- | --- | --- |
| P0 — API pública | [environment.ts](../apps/mobile/src/shared/config/environment.ts) aponta todas as plataformas para `http://127.0.0.1:8080/api/v1`. | Configuração por ambiente e URL HTTPS de produção; API, banco, armazenamento privado de fotos e envio de e-mails operacionais. | Instalação limpa funciona fora da rede de desenvolvimento, sem Metro e sem encaminhamento ADB; cadastro, confirmação e recuperação de senha funcionam. |
| P0 — assinatura | [app/build.gradle](../apps/mobile/android/app/build.gradle) usa `signingConfigs.debug` em release; o APK local também está assinado com certificado Android Debug. | Chave de upload protegida, credenciais fora do Git, Play App Signing e AAB de release. Confirmar `com.aqualino` como identificador definitivo antes do primeiro upload. | AAB assinado corretamente, aceito na faixa interna e instalado pela Play; próximo envio usa `versionCode` maior. [Assinatura oficial](https://developer.android.com/studio/publish/app-signing). |
| P0 — documentos | [RegisterScreen.tsx](../apps/mobile/src/features/auth/presentation/RegisterScreen.tsx) registra aceite e versão, mas mostra somente texto. Não foram encontradas páginas de privacidade e termos em [routes/web.php](../apps/api/routes/web.php). | Publicar documentos com identificação do responsável, contato, uso/compartilhamento de dados, retenção e regras de conteúdo; disponibilizar links no cadastro e nas configurações. | Usuário consegue ler os documentos antes do aceite; URLs públicas funcionam e correspondem ao produto e à versão aceita. |
| P0 — exclusão de conta | [sessionStore.ts](../apps/mobile/src/features/auth/application/sessionStore.ts) remove credenciais lembradas e faz logout. [authRepository.ts](../apps/mobile/src/features/auth/data/authRepository.ts) não oferece exclusão. A API já tem `DELETE /me`. | Criar caminho claro de exclusão nas configurações, conectado ao servidor, e página web que permita iniciar a solicitação sem reinstalar o app. | Conta e dados associados são excluídos conforme a política; usuário recebe informação clara sobre prazo e eventual retenção. |
| P0 — retenção/fotos | [DeleteAccount.php](../apps/api/app/Modules/Identity/Application/DeleteAccount.php) arquiva diversos registros com soft delete; não foi encontrada purga definitiva nem remoção dos arquivos de foto nesse fluxo. | Definir e implementar exclusão/anonimização, limpeza de fotos e tratamento de backups. Documentar qualquer retenção legítima, finalidade e prazo. | Verificação após exclusão confirma o tratamento dos dados no banco, arquivos e prestadores envolvidos; retenções justificadas têm prazo definido. |
| P0 — conteúdo social | Grupos exibem fotos e informações fornecidas por usuários. Não foram encontrados denúncia, bloqueio de usuário e fluxo operacional de moderação. | Denunciar conteúdo/usuários, bloquear interações pertinentes, definir regras de uso e responsável por analisar/remover conteúdo. | Denúncia chega à operação, há ação sobre abusos e o bloqueio é respeitado pela API e pelas telas. |

A Google exige um caminho de exclusão dentro do app e um recurso web para solicitar exclusão. Um link dentro do app para esse recurso também pode atender ao caminho interno. Retenções legítimas precisam ser informadas; simplesmente desativar a conta não resolve a obrigação. [Requisitos de exclusão](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en).

Fotos compartilhadas com membros do grupo já se enquadram como conteúdo gerado por usuários, mesmo sem um feed público. A votação sobre um registro de água e a remoção de amizade não implementam, por si, denúncia de abuso ou bloqueio. O mecanismo de moderação deve considerar as interações efetivamente disponíveis. [Política de conteúdo de usuários](https://support.google.com/googleplay/android-developer/answer/9876937?hl=en-GB).

Responsabilidade sugerida: desenvolvimento para app/API/build; operação para hospedagem, e-mails e moderação; responsável pelo produto para documentos e decisões de tratamento de dados.

**2. O que já existe e o que falta validar no Android**

| Item | Situação |
| --- | --- |
| API alvo | `targetSdkVersion = 36`, `compileSdkVersion = 37`, `minSdkVersion = 24` em [android/build.gradle](../apps/mobile/android/build.gradle). A configuração atende ao mínimo API 36 exigido para novos apps desde 31/08/2026; falta validar o artefato final e comportamento no Android 16. [Requisito atual](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en). |
| 64 bits e páginas de 16 KB | Há ABI `arm64-v8a`. O APK antigo passou em `zipalign -c -P 16 4`; as 23 bibliotecas arm64 inspecionadas não apresentaram segmentos ELF com alinhamento inferior a 16 KB. Isso é evidência parcial, não aprovação do futuro AAB ou teste de execução. Validar APKs gerados pelo bundle e executar em ambiente de 16 KB. [Guia oficial](https://developer.android.com/guide/practices/page-sizes). |
| Artefato | Foi encontrado APK de release de aproximadamente 41 MB, datado de 04/09; não foi encontrado AAB pronto. A análise desse APK não cobre as alterações posteriores. |
| Permissões | O APK de release antigo declara notificações, `SCHEDULE_EXACT_ALARM`, serviço em primeiro plano, reinicialização, biometria e acesso à política de notificações, entre outras permissões de dependências. Conferir o manifest final, remover o que não é usado e preencher declarações aplicáveis ao uso real. |
| Ícones | Existem fontes e ícones de launcher, inclusive variantes do mascote. Preparar exportação específica para a loja e conferir nome/ícone após atualização. |
| Operação | [compose.yaml](../compose.yaml) está orientado a desenvolvimento. Confirmar configuração de produção, debug desativado, segredos, migrations, filas/agendador, backups com restauração testada, monitoramento e recuperação de falhas. Não foi verificado se já existe deploy externo. |

Automatizar o build e guardar símbolos nativos/source maps facilita reproduzir releases e investigar falhas. Minificação é uma melhoria a avaliar e testar; não é um bloqueio isolado de publicação.

**3. Declarações e dados**

Por registrar metas e consumo de água, o Aqualino deve ser tratado como app com funcionalidades de saúde/bem-estar para o preenchimento da declaração de saúde. Selecionar as categorias correspondentes no Console e revisar alegações do app e da descrição. A política exige privacidade pública, acessível também no app; para apps de saúde não classificados como dispositivo médico, exige esclarecimento na descrição sobre não diagnosticar/tratar condições e orientação para procurar um profissional para aconselhamento médico. Não foi encontrada integração com Health Connect. [Política de saúde](https://support.google.com/googleplay/android-developer/answer/16679511?hl=en).

Inventário inicial para preparar “Segurança dos dados”; as categorias e respostas finais dependem de confirmar os fluxos de produção:

| Dados/fluxo encontrado | O que documentar e conferir |
| --- | --- |
| E-mail, nome, username e identificador da conta | Autenticação, perfil, descoberta por amigos, prestadores de e-mail e prazo de retenção. |
| Meta, consumo, datas, histórico e progresso | Finalidade de acompanhamento, sincronização, acesso por outros usuários e exclusão. |
| Fotos de registros | Upload, acesso autorizado por grupo, prazo, exclusão e metadados efetivamente enviados. |
| Amigos, grupos, votos e conquistas | Visibilidade, prevenção de abuso e efeitos da exclusão de conta sobre registros compartilhados. |
| Tokens, logs e dados de dispositivo/diagnóstico | Armazenamento local/servidor, conteúdo dos logs, SDKs, prestadores e uso em produção. |

Não presumir “nenhum dado coletado” por não haver anúncios. Diferenciar armazenamento somente local, coleta pelo servidor e compartilhamento conforme as definições do formulário, inclusive exceções para prestadores. Revisar dependências transitivas antes de responder. [Segurança dos dados](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en).

**4. Itens que dependem do Play Console e do responsável pelo app**

- [ ] Confirmar conta existente, titular, verificações de identidade/contato e acesso à produção. Se ainda não houver conta, o cadastro tem taxa única de US$ 25. [Cadastro](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en).
- [ ] Confirmar o tipo de conta adequado ao negócio e à classificação de saúde. A orientação do Google inclui apps de saúde entre os casos para conta de organização; organizações precisam de D-U-N-S. Não assumir conta pessoal como padrão. [Tipos de conta](https://support.google.com/googleplay/android-developer/answer/13634885?hl=en).
- [ ] Conferir verificação Android e registro do pacote no Play Console: em 30/09/2026 começa a aplicação regional no Brasil para lojas participantes, incluindo a Play. O registro de apps da Play é majoritariamente automático, mas o status deste app não foi consultado. [Verificação Android](https://developer.android.com/developer-verification?hl=pt-BR).
- [ ] Definir países, preço/modelo de negócio, categoria, e-mail de suporte e público etário real; responder classificação indicativa, anúncios, acesso ao app e demais declarações apresentadas. Se houver público infantil, avaliar requisitos Families antes de fechar produto e materiais.
- [ ] Preparar conta de demonstração com e-mail verificado, dados fictícios e acesso às funcionalidades restritas; fornecer instruções claras em inglês e credenciais reutilizáveis aos revisores. Evitar dependência de código temporário enviado ao desenvolvedor. [Acesso para análise](https://support.google.com/googleplay/android-developer/answer/15748846?hl=en).
- [ ] Se for conta pessoal criada após 13/11/2023, cumprir teste fechado com pelo menos 12 participantes inscritos continuamente por 14 dias; depois solicitar acesso à produção. O prazo não garante aprovação automática. Registrar testes, feedback e correções. [Regra de teste fechado](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en).

**5. Materiais da página da loja**

| Entrega | Especificação |
| --- | --- |
| Nome | Até 30 caracteres. Confirmar marca e titularidade. |
| Descrição curta | Até 80 caracteres. Explicar o benefício principal. |
| Descrição completa | Até 4.000 caracteres; funcionalidades reais, widget, lembretes, grupos e esclarecimentos de saúde. |
| Ícone da loja | PNG de 512 × 512 px, até 1.024 KB. |
| Imagem de destaque | 1.024 × 500 px, JPEG ou PNG sem transparência. |
| Capturas | Pelo menos 2; dimensões entre 320 e 3.840 px, lado maior até o dobro do menor. Sugestão editorial: 4–6 capturas reais em 1.080 × 1.920 mostrando home, registro, histórico, grupo e widget. |
| Idiomas e direitos | Preparar pt-BR e traduções para os idiomas de divulgação escolhidos; conferir direitos de imagens, animações, fontes e sons. |

Limites de textos: [configuração da ficha](https://support.google.com/googleplay/android-developer/answer/9859152?rd=1). Formatos de imagens e capturas: [recursos de apresentação](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en). Não foi encontrado um pacote final de materiais da loja.

**6. Homologação antes da submissão**

- [ ] Executar testes relevantes de API/mobile, TypeScript e lint sobre a versão candidata; gerar o AAB dessa mesma revisão.
- [ ] Instalar pela faixa interna em aparelho sem ferramentas de desenvolvimento; testar Wi-Fi, rede móvel, offline e reconexão sem duplicar registros.
- [ ] Validar cadastro, login, confirmação de e-mail, recuperação de senha, troca de conta, isolamento dos dados e exclusão pelo app/web.
- [ ] Validar hidratação, histórico, alteração de meta, grupos, convites, limites das rodadas, amigos, denúncia e bloqueio.
- [ ] Testar notificações negadas/permitidas, alarmes, reinicialização, fusos, widget, cancelamento do seletor nativo e câmera negada/cancelada.
- [ ] Repetir trocas rápidas de abas, abertura da home e retorno do segundo plano: os relatos recentes de fundo cinza/lentidão e a apresentação do loading precisam de homologação visual da versão final.
- [ ] Cobrir Android mínimo suportado e versões recentes, navegação por gestos, fontes ampliadas, teclado e dispositivo/emulador com páginas de 16 KB.
- [ ] Revisar relatório de pré-lançamento da Play e corrigir falhas bloqueantes. Definir acompanhamento de crashes/ANRs, disponibilidade da API e suporte após lançamento.

**Ordem sugerida**

1. Confirmar conta, enquadramento e domínio/infraestrutura; iniciar preparação dos documentos e materiais.
2. Resolver API pública, assinatura, exclusão, retenção e moderação.
3. Gerar AAB, distribuir internamente e homologar o produto completo.
4. Finalizar ficha/declarações e executar teste fechado obrigatório, se aplicável.
5. Solicitar acesso à produção quando necessário e enviar a versão para análise, com acesso dos revisores funcionando.

A data de lançamento depende das correções, do estado da conta e da análise do Google. Neste levantamento foram produzidos somente diagnóstico e plano de preparação; nenhum app foi enviado, nenhuma chave foi criada e nenhuma configuração de produção foi alterada.
