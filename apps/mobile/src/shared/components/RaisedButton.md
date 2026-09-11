# Botões de ação

Use `RaisedButton` para ações com rótulo. A versão preenchida é a padrão; `variant="outlined"` oferece uma ação secundária com fundo transparente. As duas versões afundam 4 px ao pressionar, sem sombra superior e sem deslocar o conteúdo ao redor.

```tsx
<RaisedButton label="Salvar" tone="success" loading={saving} onPress={save} />
<RaisedButton label="Cancelar" variant="outlined" tone="neutral" disabled={saving} onPress={close} />
<RaisedButton label="Remover" variant="outlined" tone="danger" onPress={remove} />
```

| Tom | Uso |
| --- | --- |
| `ocean` | Hidratação e conquistas |
| `aqua` | Navegação de fluxos, amigos e grupos |
| `success` | Salvar, aceitar e concluir |
| `gold` | Prêmios e ações de recuperação |
| `danger` | Remover, recusar e sair |
| `neutral` | Cancelar e ações secundárias |

`size` aceita `compact`, `regular` e `large`. `icon` aceita um elemento React; `subtitle` adiciona uma explicação curta. `loading` mantém o rótulo visível, mostra um spinner nativo na cor do texto e bloqueia novos toques. Os rótulos podem quebrar linha para acompanhar o tamanho de fonte do aparelho.

Para ações compactas somente com ícone, use `iconOnly` com `icon` e mantenha `label` para acessibilidade. O efeito de pressão e o estado de carregamento continuam iguais.

Use `style` para largura, flex e margens. Cores, bordas e o efeito de pressão ficam no componente. Preserve `testID`, rótulos de acessibilidade e os callbacks existentes ao migrar uma ação.

`PrimaryButton`, `AuthButton` e `GroupButton` usam esse componente. Abas, interruptores, cards selecionáveis e controles de voltar mantêm seus próprios componentes e semântica.
