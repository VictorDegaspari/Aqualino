# ADR 0005 — Aparência dinâmica do Aqualino

## Decisão

O `condition` do snapshot de hidratação é a fonte única do humor visual. O app, o ícone do launcher e os widgets reutilizam três artes oficiais: feliz, triste e forte.

- `empty` e `happy`: ícone feliz;
- `angry`, `boiling` e `skeleton`: ícone triste;
- meta diária alcançada: o widget prioriza a arte forte.

Os widgets alternam frases, paletas e, quando coerente, imagens a cada três horas. A seleção usa o horário civil em blocos, portanto é estável durante uma renderização e funciona sem rede.

## Plataformas

No Android, dois `activity-alias` alternam o ícone do launcher com `DONT_KILL_APP`. No iOS, o catálogo fornece `AppIcon` e `AppIconSad`, selecionados por `UIApplication.setAlternateIconName`.

O ícone só é alterado quando o aplicativo processa um snapshot. Widgets podem continuar variando com atualizações periódicas, mas não possuem credenciais e não mudam o ícone do aplicativo sozinhos.

## Assets

As fontes dos mascotes ficam na raiz do repositório. Os masters dos ícones ficam em `apps/mobile/src/assets/app-icon/source`; neles, a superfície azul preenche o canvas e a máscara da plataforma funciona como o corpo da gota, mantendo o rosto na área segura. O script `apps/mobile/scripts/generate-dynamic-icons.sh` gera PNGs de 512 px para iOS, WebPs lossless de 512 px em `res/drawable-nodpi` para Android e todos os tamanhos dos ícones do aplicativo. Home e widget Android compartilham o mesmo drawable. Os ícones mantêm fundo RGB opaco; somente os mascotes preservam transparência.
