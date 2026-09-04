# Assets do desafio

`source/` contém os SVGs editáveis usados como fonte da arte temporária. `static/` contém os arquivos carregados pelo React Native.

O mapeamento de todos os assets fica centralizado em `features/home/presentation/challenge/ChallengeAsset.tsx`. Para trocar uma arte definitiva, substitua o arquivo correspondente em `static/` mantendo suas dimensões e transparência, ou altere apenas esse mapeamento.

O app usa PNG/WebP no runtime para que estes assets funcionem no APK atual via Metro, sem adicionar uma dependência nativa nem disparar um novo build do Gradle. A referência visual do layout está em `docs/product/mockups/home-challenge-v2.png`.

Elementos de identidade — gotas, plataformas, caminho d'água, troféu, CTA e medalhas — não devem ser reconstruídos com `View`.
