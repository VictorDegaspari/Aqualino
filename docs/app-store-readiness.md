**Aqualino — checklist para publicar na App Store (Apple)**

Levantamento em 10/09/2026, com base no repositório e na documentação oficial da Apple. O ambiente inspecionado é Linux: não foram executados Xcode, archive, assinatura ou testes em iPhone/iPad. Conta Apple, certificados e App Store Connect não foram consultados.

Marcar somente após concluir e validar cada item. Para condições que não se aplicam ao lançamento, registrar o motivo. Os problemas compartilhados com Android também estão detalhados no [checklist da Google Play](play-store-readiness.md).

**1. Bloqueios compartilhados do produto — prioridade máxima**

- [ ] Configurar a API HTTPS pública no app. [environment.ts](../apps/mobile/src/shared/config/environment.ts) ainda aponta o iOS para `http://127.0.0.1:8080/api/v1`.
- [ ] Validar API, banco, armazenamento privado das fotos, e-mails de confirmação/recuperação, filas, agendador, backups e monitoramento em produção.
- [ ] Publicar política de privacidade e termos de uso; disponibilizar links no cadastro e nas configurações. O cadastro atual registra o aceite, mas não oferece acesso aos documentos.
- [ ] Implementar solicitação de exclusão de conta nas configurações. A remoção da conta lembrada em [sessionStore.ts](../apps/mobile/src/features/auth/application/sessionStore.ts) apenas revoga o acesso e limpa credenciais locais; não aciona a exclusão da conta no servidor.
- [ ] Revisar [DeleteAccount.php](../apps/api/app/Modules/Identity/Application/DeleteAccount.php): tratar exclusão/anonimização de dados, fotos, backups e eventuais retenções justificadas. Os soft deletes atuais não demonstram eliminação definitiva.

A Apple exige que apps com criação de conta permitam iniciar a exclusão dentro do app, incluindo os dados associados. Confirmar identidade e informar prazo é permitido; simples desativação não basta. Se a conclusão ocorrer em uma página web, o app deve levar diretamente ao fluxo. [Exclusão de conta](https://developer.apple.com/support/offering-account-deletion-in-your-app/).

- [ ] Implementar filtragem de conteúdo inadequado, denúncia, bloqueio de usuários e contato público de suporte para fotos e interações sociais; definir quem recebe e resolve as denúncias. [Diretriz 1.2](https://developer.apple.com/app-store/review/guidelines/#user-generated-content).

Critério de conclusão: uma instalação limpa funciona pela internet pública; os documentos são acessíveis; exclusão e moderação têm resultado verificável no app e no servidor.

**2. Conta Apple, assinatura e ambiente de build**

- [ ] Confirmar inscrição ativa no Apple Developer Program, titular e tipo de conta. A anuidade padrão é US$ 99, ou valor local disponível; para organização, verificar entidade jurídica e D-U-N-S. [Inscrição](https://developer.apple.com/help/account/membership/program-enrollment).
- [ ] Configurar acessos da equipe e aceitar contratos pendentes no App Store Connect. Definir dados fiscais/bancários caso o modelo de distribuição exija.
- [ ] Disponibilizar Mac local ou CI macOS com Xcode compatível. Desde 28/04/2026, uploads exigem Xcode 26 ou posterior e SDK iOS/iPadOS 26 ou posterior. Isso não obriga a tornar iOS 26 a versão mínima instalada pelo usuário. [Requisitos de envio](https://developer.apple.com/news/upcoming-requirements/).
- [ ] Instalar dependências iOS, resolver CocoaPods/codegen e conferir o deployment target efetivo. O projeto declara iOS 15.1; validar compatibilidade das dependências e dos dois targets com esse mínimo.
- [ ] Confirmar e registrar os identificadores definitivos do app e do widget: `br.com.aqualino.mobile` e `br.com.aqualino.mobile.widget`.
- [ ] Configurar Development Team, certificados e perfis de distribuição para app e extensão. Não há `DEVELOPMENT_TEAM` explícito no [projeto Xcode](../apps/mobile/ios/Aqualino.xcodeproj/project.pbxproj); configuração externa existente não foi verificada.
- [ ] Registrar o App Group `group.br.com.aqualino.shared` e habilitá-lo nos identificadores/perfis dos dois targets. As declarações locais já existem nos arquivos de entitlements. [App Groups](https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.security.application-groups).
- [ ] Criar o registro do app no App Store Connect, com Bundle ID, nome, idioma principal e SKU.
- [ ] Gerar archive de Release, executar Validate App e carregar o build. Confirmar extensão do widget embutida e assinada, bundle JavaScript/assets incluídos e ausência de dependência do Metro.
- [ ] Definir versão/build e incrementá-los nos próximos envios; conferir consistência entre app e extensão. Hoje ambos declaram versão 1.0 e build 1.

Critério de conclusão: archive válido, build processado no App Store Connect e instalação funcional pelo TestFlight.

**3. Privacidade, permissões e criptografia**

- [ ] Revisar [PrivacyInfo.xcprivacy](../apps/mobile/ios/Aqualino/PrivacyInfo.xcprivacy). Atualmente a lista `NSPrivacyCollectedDataTypes` está vazia, embora o produto envie informações ao servidor. Conferir o conteúdo do manifesto e as respostas de App Privacy de acordo com os fluxos reais; um arquivo existente não comprova a declaração completa.
- [ ] Verificar inclusão do manifesto no bundle final. Ele aparece como referência no projeto, mas não está explicitamente na lista Resources inspecionada. Conferir também o resultado da agregação feita por CocoaPods/React Native. [Manifesto de privacidade](https://developer.apple.com/documentation/bundleresources/adding-a-privacy-manifest-to-your-app-or-third-party-sdk).
- [ ] Revisar os motivos declarados para APIs de uso controlado no app e no widget. O manifesto tem `CA92.1` para UserDefaults; o código também usa `UserDefaults(suiteName:)` em App Group, cenário descrito pelo motivo `1C8F.1`. Incluir os motivos que correspondem ao uso real e conferir o bundle da extensão. [Motivos aprovados](https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacyaccessedapitypes/nsprivacyaccessedapitype).
- [ ] Auditar SDKs e dependências transitivas, seus manifestos e assinaturas quando exigidos. Gerar e revisar o relatório de privacidade do archive. [Requisitos de SDKs](https://developer.apple.com/support/third-party-SDK-requirements/).
- [ ] Preencher App Privacy: e-mail, identificadores/perfil, hidratação, fotos, interações sociais e eventuais diagnósticos. Confirmar vínculo à identidade, finalidades, prestadores e rastreamento segundo as definições da Apple. A declaração inclui parceiros e SDKs. [App Privacy](https://developer.apple.com/app-store/app-privacy-details/).
- [ ] Revisar [Info.plist](../apps/mobile/ios/Aqualino/Info.plist): a descrição da câmera existe em português; `NSLocationWhenInUseUsageDescription` está vazio. Remover a chave de localização se o recurso não usa localização, ou fornecer justificativa correta se houver uso. Localizar mensagens de permissões para os idiomas distribuídos.
- [ ] Confirmar permissões de câmera, biblioteca de fotos e biometria somente conforme as APIs realmente utilizadas; validar cancelamento e negativa. Manter tráfego de produção em HTTPS e revisar exceções de rede local.
- [ ] Confirmar se existe tracking conforme a definição da Apple. Se houver, implementar ATT antes desse rastreamento; se não houver, manter a declaração e o comportamento coerentes. [Privacidade e tracking](https://developer.apple.com/app-store/app-privacy-details/).
- [ ] Responder export compliance considerando também criptografia de dependências. Definir `ITSAppUsesNonExemptEncryption` somente após classificar o uso; não preencher automaticamente para evitar perguntas. [Criptografia e exportação](https://developer.apple.com/documentation/security/complying-with-encryption-export-regulations).

**4. Ajustes e decisões específicos do iOS**

- [ ] Ajustar o texto do onboarding do widget por plataforma. [WidgetOnboardingStep.tsx](../apps/mobile/src/features/onboarding/presentation/WidgetOnboardingStep.tsx) promete confirmar a adição em uma tela do sistema, mas no iOS o fluxo atual mostra instruções manuais. [requestWidgetPin](../apps/mobile/src/features/widget/application/requestWidgetPin.ts) só solicita fixação no Android.
- [ ] Validar o widget pequeno/médio, atualização do consumo, deep links e compartilhamento pelo App Group; limpar dados exibidos após logout, exclusão e troca de conta.
- [ ] Conferir ícones principal/alternativo, todos os tamanhos exigidos pelo asset catalog e mudança de aparência em aparelho real.
- [ ] Confirmar suporte a iPad. Hoje `TARGETED_DEVICE_FAMILY = "1,2"`, e o Info.plist declara orientações de iPad. Se esse suporte permanecer, homologar layout, rotação, multitarefa e capturas específicas.
- [ ] Revisar alegações e incentivos relacionados à hidratação, sobretudo competição entre grupos; evitar promessas médicas sem fundamento ou incentivos a comportamento prejudicial. [Diretriz 1.4](https://developer.apple.com/app-store/review/guidelines/#physical-harm).
- [ ] Registrar a decisão sobre login: o fluxo atual usa e-mail/senha próprios. Sign in with Apple não é obrigatório somente por existir esse login; reavaliar a exigência de alternativa equivalente se forem adicionados provedores sociais. [Diretriz 4.8](https://developer.apple.com/app-store/review/guidelines/#login-services).
- [ ] Confirmar se haverá venda de recursos digitais, itens ou assinatura no lançamento. Se houver, avaliar In-App Purchase e regras aplicáveis às lojas de distribuição escolhidas. [Diretriz 3.1](https://developer.apple.com/app-store/review/guidelines/#payments).

**5. Ficha da App Store e informações para análise**

- [ ] Preparar nome e subtítulo, cada um com até 30 caracteres; definir categoria e direitos do conteúdo. [Informações do app](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information/).
- [ ] Preparar descrição de até 4.000 caracteres, palavras-chave de até 100 bytes, URL pública de suporte com contato, copyright e traduções. Texto promocional é opcional. [Informações da versão](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/).
- [ ] Conferir ícone de marketing de 1.024 × 1.024 px incluído no catálogo e validar sua aceitação pelo Xcode/App Store Connect.
- [ ] Capturar telas reais do iOS, de 1 a 10 por conjunto, sem transparência. Para iPhone, preparar o conjunto de 6,9 polegadas, por exemplo 1.320 × 2.868 px; se não houver esse conjunto, conferir a alternativa de 6,5 polegadas aceita no Console.
- [ ] Preparar capturas de iPad de 13 polegadas se mantido o suporte, por exemplo 2.064 × 2.752 px. Validar os tamanhos exigidos no momento do upload. [Especificações de capturas](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/).
- [ ] Preencher o questionário atual de classificação etária, informando recursos sociais e conteúdo de usuários. Definir público real e avaliar requisitos adicionais se houver direcionamento infantil. [Classificação etária](https://developer.apple.com/news/upcoming-requirements/).
- [ ] Definir países, disponibilidade, preço e modo de lançamento; confirmar status de comerciante e verificações se distribuir na União Europeia. [Exigências vigentes, incluindo DSA](https://developer.apple.com/news/upcoming-requirements/).
- [ ] Preencher App Review Information com contato, conta de demonstração ativa, dados fictícios e instruções de acesso aos grupos, fotos, widget e exclusão. Manter backend acessível durante a análise. [Preparação para App Review](https://developer.apple.com/app-store/review/).
- [ ] Conferir consistência entre descrição, capturas, permissões, privacidade e funções da versão enviada.

**6. TestFlight e homologação**

- [ ] Distribuir a versão candidata no TestFlight. Para testes externos, preparar informações de beta e passar pela Beta App Review quando solicitada. O processo da Apple não replica a regra de 12 pessoas/14 dias da Google Play. [TestFlight](https://developer.apple.com/testflight/).
- [ ] Testar em iPhone físico e em iPad, se suportado, com instalação limpa e atualização; cobrir o iOS mínimo efetivo e versões recentes.
- [ ] Validar cadastro, confirmação de e-mail, recuperação de senha e links abrindo o app instalado pelo TestFlight.
- [ ] Validar registro de água, câmera, histórico, meta pessoal, grupos, rodadas, amigos, denúncias e bloqueios.
- [ ] Validar exclusão e troca de conta sem vazamento de dados entre sessões, inclusive no widget e no armazenamento local.
- [ ] Testar offline/reconexão, chamadas repetidas e retorno do segundo plano, sem duplicação de registros.
- [ ] Testar lembretes com permissão concedida/negada, app encerrado, alteração de fuso e reinicialização; conferir as limitações reais do agendamento no iOS.
- [ ] Validar navegação repetida entre abas, abertura da home, teclado, modais, gesto de voltar, safe areas, fontes ampliadas e VoiceOver.
- [ ] Conferir desempenho, crashes e relatórios do TestFlight; executar testes automatizados relevantes na mesma revisão do archive.

A automação atual de [mobile_automation](../scripts/mobile_automation/README.md) atende Android; esses testes não equivalem à homologação nativa iOS.

**7. Envio e acompanhamento**

- [ ] Resolver bloqueios e avisos relevantes da validação do archive e do processamento do build.
- [ ] Selecionar o build homologado e concluir todos os campos e declarações obrigatórios no App Store Connect.
- [ ] Enviar para App Review e acompanhar solicitações, mantendo conta de demonstração e servidor operacionais.
- [ ] Após aprovação, liberar conforme o modo escolhido e acompanhar estabilidade, suporte e disponibilidade da API.

Ordem sugerida: conta/Mac e produção → correções compartilhadas → assinatura/App Groups/privacidade → archive/TestFlight → materiais e declarações → análise e lançamento. A conclusão dos testes e a aprovação da Apple determinam a data; este levantamento não gerou nem enviou um build.
