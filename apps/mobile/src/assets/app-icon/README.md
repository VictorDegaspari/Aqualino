# Ícones do aplicativo

Os masters quadrados em `source/` têm 1254 px e fundo RGB opaco. A superfície azul do Aqualino preenche todo o canvas, sem uma silhueta de gota ou fundo separado: a máscara quadrada, arredondada ou circular do sistema funciona como o próprio corpo do personagem. Somente os elementos do rosto permanecem visíveis. Há uma versão feliz e outra triste para a aparência dinâmica do launcher.

Execute `apps/mobile/scripts/generate-dynamic-icons.sh` para gerar todos os tamanhos usados pelo Android e pelos catálogos `AppIcon` e `AppIconSad` do iOS. O redimensionamento usa Lanczos e mantém os masters intactos.
