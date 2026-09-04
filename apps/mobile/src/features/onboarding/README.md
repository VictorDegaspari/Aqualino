# Entrada, contas lembradas e onboarding

Este arquivo é a fonte curta de verdade para o fluxo de entrada do app. Leia-o antes de alterar `WelcomeScreen`, autenticação ou navegação; isso evita reconstruir as mesmas decisões a partir de vários arquivos.

## Fluxo sem sessão

Existe uma única rota visual de entrada: `Welcome`. Login e cadastro são estados internos do terceiro step, não telas abertas pela navegação principal.

1. idioma do aplicativo;
2. meta diária de água;
3. escolha da conta, login ou cadastro.

A barra continua em `3/3` enquanto o usuário escolhe e preenche login ou cadastro. `LoginForm` e `RegisterForm` são renderizados diretamente por `WelcomeScreen`; o navigator desconectado registra somente `Welcome` e não possui rotas `Login` ou `Register`.

Depois de um cadastro, a sessão autenticada segue para `OnboardingScreen`, que conclui as preferências da nova conta. Uma conta existente com `onboarding_completed_at` preenchido segue diretamente para a Home; se o campo estiver vazio, também conclui `OnboardingScreen`.

## Logout e contas lembradas

Ao autenticar ou restaurar uma sessão, o app guarda no máximo três identificações recentes em `aqualino.remembered-accounts`: id, nome, username, e-mail e URL do avatar. Ao sair, elas continuam disponíveis na tela de entrada.

Selecionar uma conta lembrada abre o formulário de login dentro do terceiro step e apenas preenche o e-mail. A senha continua obrigatória.

“Adicionar nova conta” executa `restartWelcome`: volta ao step 1, remove a meta local anterior e mantém o idioma apenas como valor inicialmente selecionado. Depois dos três steps, o usuário pode cadastrar a nova conta ou entrar em outra conta existente.

## Segurança e tokens de autenticação

- Só existe um token de sessão ativo no dispositivo.
- O token fica no Keychain/Keystore por meio de `secureTokenStore`.
- Logout remove token e usuário autenticado locais e invalida o token no backend quando a API está disponível.
- Contas lembradas nunca armazenam token ou senha; elas são somente atalhos de identificação.
- O snapshot do widget também é marcado como desconectado no logout e não contém o token.

## Estado e arquivos principais

- `presentation/WelcomeScreen.tsx`: estado e orquestração dos três steps;
- `presentation/AccountAccessStep.tsx`: escolha de conta e formulários do terceiro step;
- `application/onboardingPreferencesStore.ts`: idioma, meta e conclusão/reinício dos steps;
- `../auth/application/rememberedAccountsStore.ts`: identificações recentes;
- `../auth/application/sessionStore.ts`: restauração, autenticação e logout;
- `../auth/presentation/LoginScreen.tsx`: `LoginForm` reutilizável;
- `../auth/presentation/RegisterScreen.tsx`: `RegisterForm` reutilizável;
- `../../app/navigation/AppNavigation.tsx`: registra apenas `Welcome` quando não há sessão.

## Regras que não devem regredir

- Não navegar para Login ou Cadastro fora dos steps.
- Não marcar os steps como concluídos antes de uma autenticação bem-sucedida.
- Não apagar as identificações lembradas no logout comum.
- Não reutilizar meta diária de uma conta anterior ao iniciar “Adicionar nova conta”.
- Não persistir senha nem múltiplos tokens para implementar troca de conta.
