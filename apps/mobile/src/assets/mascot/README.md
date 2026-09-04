# Assets do Aqualino

Coloque aqui os assets originais já existentes, preservando a fonte em `source/` e as versões otimizadas em `static/`:

- `aqualino_empty.png`
- `aqualino_happy.png`
- `aqualino_angry.png`
- `aqualino_boiling.png`
- `aqualino_skeleton.png`
- `aqualino_medalist.png`
- `medal_badge.png`

As artes atualmente integradas são:

- `static/aqualino_happy_active.png`: estado feliz e acolhimento no iOS;
- `static/aqualino_sad.png`: saudade ou ausência prolongada no iOS;
- `static/aqualino_strong.png`: meta alcançada e incentivo intenso no iOS;
- `android/app/src/main/res/drawable-nodpi/*.webp`: equivalentes lossless de 512 px usados no Android.

`mascotImages.ts` referencia cada arte pelo nome lógico do recurso nativo. Assim,
o React Native usa o WebP Android ou o PNG do Asset Catalog iOS sem copiá-los para
o bundle do Metro. A Home e o widget compartilham o mesmo recurso. O script
`scripts/generate-dynamic-icons.sh` recria essas cópias a partir das artes da raiz.

Os arquivos na raiz `happy_aqualino.png`, `sad_aqualino.png` e `strong_aqualino.png` são as fontes dessas versões. Os ícones do launcher usam masters próprios em `src/assets/app-icon/source`, nos quais a superfície do rosto preenche todo o canvas. Execute `apps/mobile/scripts/generate-dynamic-icons.sh` para reconstruir os mascotes nativos e os tamanhos dos ícones de Android e iOS depois de atualizar as fontes.

Os arquivos devem ter fundo transparente, margem interna consistente e leitura clara em tamanhos pequenos. Estados sem arte própria usam um dos três humores integrados e mantêm fallback tipográfico acessível.
