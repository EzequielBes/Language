# Fluxo de commits

Este projeto usa [Conventional Commits](https://www.conventionalcommits.org/pt-br/).

## Formato

```
<tipo>(<escopo opcional>): <descrição curta no imperativo>

<corpo opcional explicando o porquê>
```

## Tipos aceitos

| Tipo       | Quando usar                                             |
|------------|----------------------------------------------------------|
| `feat`     | Nova funcionalidade                                       |
| `fix`      | Correção de bug                                           |
| `docs`     | Apenas documentação (README, comentários)                 |
| `style`    | Formatação, sem mudança de lógica                          |
| `refactor` | Mudança de código que não corrige bug nem adiciona feature |
| `perf`     | Melhoria de performance                                    |
| `test`     | Adição ou ajuste de testes                                 |
| `chore`    | Manutenção (deps, config, build)                           |
| `build`    | Mudanças no sistema de build                               |
| `ci`       | Mudanças em CI/CD                                          |
| `revert`   | Reverte um commit anterior                                 |

## Exemplos

```
feat(flashcards): add pronunciation button via Web Speech API
fix(spaced-repetition): correct ease factor floor at 1.3
docs: update README migration list for 0005
refactor(mcp): simplify session resolution
```

## Validação automática

Este repositório aponta `core.hooksPath` para `.githooks/`, que roda um hook
`commit-msg` validando o formato acima. Se um commit for rejeitado, a
mensagem de erro mostra o exemplo esperado.

Essa configuração é local a este clone (`git config core.hooksPath`, não
versionada em `.git/config`), então cada pessoa que clonar o repo precisa
rodar uma vez:

```
git config core.hooksPath .githooks
```
