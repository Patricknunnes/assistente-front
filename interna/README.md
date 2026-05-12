# Distribuição de Aldeias — interna

Mini ferramenta para distribuir as aldeias de um alvo entre jogadores da tribo, respeitando alcance máximo individual e qtd exata por jogador.

A distribuição é resolvida via **programação linear inteira** (PuLP/CBC) com restrições duras:

- cada aldeia atribuída a exatamente 1 jogador;
- cada jogador recebe exatamente `qtd` aldeias;
- aldeias fora do `alcance` de um jogador nunca são atribuídas a ele;
- objetivo: minimizar a soma das distâncias `aldeia → referência`.

Se for inviável, o backend devolve **diagnóstico**: quais jogadores estão saturados (pediram mais do que conseguem alcançar) ou quais aldeias estão fora do alcance de todo mundo.

## Stack

- Backend: FastAPI + PuLP
- Frontend: HTML/JS estático (canvas para visualização, pan/zoom/tooltip)
- Gerenciamento Python: `uv`

## Como rodar

```bash
cd interna
uv run uvicorn main:app --reload --port 8765
```

Abrir no navegador: <http://127.0.0.1:8765>

## Fluxo na UI

1. Colar as coordenadas do alvo na textarea (qualquer separador serve: espaço, vírgula, quebra de linha — só aceita o formato `x|y`).
2. Adicionar uma linha por jogador destinatário:
   - **Nome** — texto livre, vai aparecer no output e no mapa.
   - **Qtd** — quantas aldeias esse jogador deve receber.
   - **Ref (x\|y)** — coordenada de referência (geralmente a aldeia "líder" dele).
   - **Alcance** — distância máxima em campos (default `29`). Pode variar por jogador.
3. A soma das qtds tem que bater com o total de coordenadas (a UI valida antes de chamar o backend).
4. Clicar **Distribuir**.

### Visualização

- Cada aldeia aparece como um ponto colorido pelo jogador que ficou.
- Cada referência aparece como um quadrado com o nome.
- Círculo translúcido em torno da referência = raio de alcance do jogador.
- Mouse sobre uma aldeia = tooltip com `coord → jogador (distância)`.
- Scroll = zoom, arrastar = pan.

### Output

Textarea inferior com uma linha por aldeia no formato:

```
547|351 | dh
552|349 | dh
567|348 | Umboi
...
```

Botão **Copiar tudo** copia o bloco inteiro pro clipboard.

### Quando dá infactível

O backend retorna exatamente o motivo:

- `aldeias_sem_cobertura`: lista de coords fora do alcance de qualquer jogador. Ação: aumentar alcance de alguém ou adicionar/ajustar referência.
- `jogadores_saturados`: lista de `{nome, qtd_pedida, max_alcancavel}`. Ação: reduzir a qtd desse jogador, aumentar o alcance dele, ou trocar a referência.

## Endpoint

`POST /distribuir`

```json
{
  "coordenadas": ["547|351", "577|349", "..."],
  "jogadores": [
    { "nome": "dh", "qtd": 4, "ref": "547|354", "alcance": 29 },
    { "nome": "otavio", "qtd": 3, "ref": "482|365", "alcance": 29 }
  ]
}
```

Resposta de sucesso:

```json
{
  "status": "ok",
  "atribuicoes": [{ "coord": "547|351", "x": 547, "y": 351, "player": "dh", "player_idx": 0, "dist": 3.0 }, ...],
  "jogadores": [{ "nome": "dh", "ref": "547|354", "ref_x": 547, "ref_y": 354, "alcance": 29, "qtd": 4, "idx": 0 }, ...]
}
```

Resposta de erro (`status` ∈ `"erro"`, `"infeasible"`):

```json
{
  "status": "infeasible",
  "mensagem": "Nao foi possivel respeitar todas as restricoes (solver: Infeasible).",
  "aldeias_sem_cobertura": [],
  "jogadores_saturados": [{ "nome": "otavio", "qtd_pedida": 4, "max_alcancavel": 3 }]
}
```

## Estrutura

```
interna/
├── main.py              # FastAPI app + endpoint /distribuir
├── static/
│   └── index.html       # UI single-file (canvas + form + output)
├── pyproject.toml       # deps gerenciadas por uv
└── uv.lock
```
