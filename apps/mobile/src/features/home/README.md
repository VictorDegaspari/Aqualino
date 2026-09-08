# Temas da Home

Os temas ficam em **Inventário → Temas**, junto da categoria **Poções**. O inventário é acessível pelo indicador de XP da Home. Cada tema tem uma prévia; tocar em **Aplicar tema** muda o cenário e marca a opção como **Em uso**. A seleção permanece visível para comparar as opções. Voltar à Home mostra o tema aplicado.

- **Corais** (`coral-reef`): cenário original, com corais e movimento.
- **Oceano** (`open-ocean`): fundo do mar sem a decoração de corais.

A preferência é local, funciona offline e permanece entre aberturas do app. É salva por conta no namespace MMKV `aqualino.home`, chave `themes.v1`. Contas sem escolha usam Corais; dados inválidos ou temas desconhecidos também voltam ao padrão. A gravação acontece antes de aplicar o tema; se falhar, a coleção permite tentar novamente. Os dois temas iniciais estão disponíveis para todas as contas, mesmo se o carregamento das poções falhar, e aplicar um cenário não consome itens.

`domain/homeThemes.ts` reúne os identificadores estáveis e a composição de cada tema. `presentation/HomeScene.tsx` resolve os fundos e as decorações. Para adicionar um cenário, inclua a definição no catálogo e os recursos correspondentes na apresentação, incluindo a prévia em `../inventory/presentation/InventoryThemes.tsx`. A coleção lista o catálogo automaticamente e a persistência usa o identificador do tema, sem depender de um booleano de exibição dos corais.

As regras e o progresso dos desafios continuam independentes do cenário. As decorações são desmontadas quando a Home perde o foco, e o modo Oceano não monta o sensor dos corais.

Conferência Android: `python3 scripts/mobile_nav.py run theme-preview`. O fluxo abre **Inventário → Temas** e volta para **Poções** sem alterar a preferência; `themes.corals` e `themes.ocean` permitem conferir a aplicação de cada cenário.
