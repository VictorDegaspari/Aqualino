# Navegação e conferência da interface

Para explorar ou validar o app em um Android, use a automação existente antes de montar comandos ADB avulsos ou estimar coordenadas por screenshot. Execute da raiz do repositório:

```sh
python3 scripts/mobile_nav.py doctor
python3 scripts/mobile_nav.py map
python3 scripts/mobile_nav.py open home
python3 scripts/mobile_nav.py inspect
python3 scripts/mobile_nav.py tap nav.history --expect history
```

- O [guia de navegação](../../scripts/mobile_automation/README.md) explica os comandos, requisitos e subfluxos. O [mapa executável](../../scripts/mobile_automation/map.json) relaciona telas, controles e painéis.
- `open` usa deep links e verifica o identificador da tela. `tap` encontra o controle na hierarquia atual. Prefira os aliases estáveis do mapa; use `inspect` quando precisar descobrir controles de um modal ou de uma lista.
- `run tour` visita as telas principais e gera um relatório com capturas em `.artifacts/mobile-nav/`. `avatar-preview` e `water-preview` conferem os respectivos painéis sem salvar escolhas ou água.
- O aparelho precisa estar desbloqueado. Falta de login, confirmação de e-mail, câmera externa ou modal que impeça continuar deve aparecer como uma limitação da validação, nunca como teste aprovado.
- Ao alterar rotas, atualize `linking.ts` e o mapa. Execute `python3 -m unittest discover -s scripts/mobile_automation/tests -v` para verificar o contrato e o executor, além dos testes relevantes do app.
- O executor atual é Android. Para iOS, o mapa e os identificadores podem ser reaproveitados, mas a execução física requer um Mac com XCUITest/Appium.
