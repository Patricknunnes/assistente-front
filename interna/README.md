# Distribuição de Aldeias — interna

Mini ferramenta para distribuir as aldeias de um alvo entre jogadores da tribo, respeitando alcance individual, qtd exata por jogador, e a regra de **1 aldeia de ataque ataca no máximo 1 alvo**.

A distribuição é resolvida via **programação linear inteira** (PuLP/CBC) com restrições duras:

- cada aldeia atribuída a no máximo 1 jogador;
- cada jogador recebe exatamente `qtd` aldeias;
- cada aldeia de ataque do jogador ataca no máximo 1 alvo (1 launch → 1 target);
- aldeias fora do `alcance` (em campos) de um jogador nunca são atribuídas a ele;
- objetivo: minimizar a soma das distâncias `alvo → aldeia de ataque`.

Se for inviável, o backend devolve **diagnóstico**: quais jogadores estão saturados (pediram mais do que conseguem alcançar, ou têm menos aldeias de ataque disponíveis que o pedido) ou quais conflitos combinatórios estão impedindo a alocação.

## Stack

- Backend: FastAPI + PuLP
- Frontend: HTML/JS estático (canvas para visualização, pan/zoom/tooltip)
- Tampermonkey: userscript que coleta dados da aristocracia da tribo
- Gerenciamento Python: `uv`

## Como rodar

```bash
cd interna
uv run uvicorn main:app --reload --port 8765
```

Abrir no navegador: <http://127.0.0.1:8765>

## Fluxo na UI

1. Colar o **texto bruto** das coordenadas do alvo na textarea — pode ter texto sujo (nomes, pontuação, etc.); o parser extrai só os padrões `x|y`. Paste limpa automaticamente.
2. Definir o **Mundo** (default `br136`) — usado para resolver refs automaticamente.
3. Adicionar uma linha por jogador destinatário:
   - **Nome** — exato como aparece no jogo (case-insensitive).
   - **Qtd** — quantas aldeias esse jogador deve receber.
   - **Ref (vazio=auto)** — coordenada(s) de referência manuais. Vazio = usar todas as aldeias do jogador (do dump do mundo ou da aristocracia, se carregada). Pode informar **múltiplas** coords separadas por espaço/vírgula/`;`.
   - **Alcance** — distância máxima em campos (default `12`). Pode variar por jogador.
4. A soma das qtds tem que ser `<=` ao total de coordenadas. Sobras viram "não atribuídas" (mostradas em cinza no mapa).
5. Clicar **Distribuir**.

### Visualização

- Cada aldeia alvo aparece como um ponto colorido pelo jogador que ficou.
- Aldeias não atribuídas aparecem como círculos cinzas vazios.
- Legenda no canto superior direito com cor por jogador + qtd recebida.
- Hover em qualquer ponto = tooltip com `coord → jogador (distância)`.
- Scroll = zoom, arrastar = pan.

### Output

Textarea inferior com agrupamento por jogador (linha em branco separando), no formato:

```
dh | alvo: 547|351 | ataque saindo: 547|354
dh | alvo: 552|349 | ataque saindo: 549|350

Umboi | alvo: 567|348 | ataque saindo: 565|345
```

Quando **Conferir aristocracia** está ligado, cada linha é enriquecida com tropas do atacante (`machado`/`CL` na aldeia de saída) e defesa do alvo (`lanc`/`esp`/`arq`/`pes`) quando o alvo está na aristocracia:

```
dh | alvo: 547|351 | defesa alvo (svnar): lanc=2000 esp=500 arq=0 pes=100 | ataque saindo: 547|354 | machado=5000, CL=3000
```

Botão **Copiar tudo** copia o bloco inteiro pro clipboard.

### Quando dá infactível

O backend retorna o motivo:

- `aldeias_sem_cobertura`: coords fora do alcance de qualquer jogador. Ação: aumentar alcance ou ajustar referência.
- `jogadores_saturados`: lista de `{nome, qtd_pedida, max_alcancavel, motivo}`. O `motivo` indica se o limite é em alvos no alcance ou aldeias de ataque disponíveis. Pode também trazer `faltam` quando o conflito é combinatório (vários jogadores brigando pelas mesmas aldeias).

---

## Aristocracia (recomendado)

Por padrão, quando `ref` está vazia, o backend usa **todas** as aldeias do jogador no dump público do mundo — incluindo as defensivas. Pra ter um plano realista:

1. **Restringe lançamentos a aldeias de ataque reais** (com `axe >= min_axe` OU `light >= min_light`).
2. **Enriquece o output** com tropas do atacante (saída do ataque) e defesa do alvo (lanc/esp/arq/pes).

Pra isso, marca **Conferir aristocracia** na UI e roda o Tampermonkey companion.

### Fluxo

1. Instala o userscript `scripts/aristocracia.user.js` no Tampermonkey.
   - Verifica se a constante `BACKEND` no topo do script bate com a porta onde você sobe o uvicorn (default `http://127.0.0.1:8765`).
   - O script precisa dos grants `GM_xmlhttpRequest` e `@connect 127.0.0.1` — já vêm declarados no header.
2. Sobe o backend (`uv run uvicorn main:app --reload --port 8765`).
3. Abre o jogo, navega para **Tribo → Defesa** (`screen=ally&mode=members_defense`). Vai aparecer uma barra amarela em cima do dropdown com dois botões:
   - **Exportar aristocracia → backend**: itera todos os membros do dropdown, e pra cada um faz `fetch` POST em `members_defense?player_id=X` — segue paginação automaticamente (`&page=2`, `&page=3`, ...) e deduplica por coord. Parseia a linha "Na Aldeia" de cada village (12 colunas na ordem padrão: lanc/esp/mac/arq/exp/leve/arq-cav/pes/aríete/cata/pal/nobre), e faz `POST` para `/aristocracia` no backend.
   - **Copiar JSON**: fallback — copia o último resultado coletado para o clipboard (útil se o backend estiver off).
4. Espera terminar (status mostra `Buscando X... (Y/N)` e no fim `OK — N jogadores, M aldeias enviados...`).
5. Volta no app `127.0.0.1:8765`, marca **Conferir aristocracia**. Vai aparecer um badge verde:
   ```
   ● Aristocracia carregada: 61 jogadores, 16018 aldeias (há 2min)
   ```
   O badge faz polling a cada 5s enquanto o checkbox estiver marcado.
6. Ajusta **Min. machado** (default `4000`) e **Min. CL** (default `2000`). Uma aldeia conta como "de ataque" se `axe >= min_axe` **OU** `light >= min_light`.
7. **Distribuir** — o backend usa a aristocracia do store em vez do dump público.

### Como o output usa os dados

- Pra cada **launch** (aldeia que vai atacar): mostra `machado` e `CL` do atacante naquela aldeia (valores "Na Aldeia" — ou seja, tropas presentes no village, prontas pra sair).
- Pra cada **alvo**: tenta encontrar o dono na aristocracia (cruza por `x|y`) e mostra `lanc`/`esp`/`arq`/`pes` próprios do dono naquela aldeia ("Na Aldeia" também — só o que pertence ao dono, sem contar apoio recebido de outros).
- Se o alvo for de um jogador **fora** da aristocracia (alvo é inimigo, por exemplo), a parte `defesa alvo` simplesmente não aparece naquela linha.

---

## Endpoints

### `POST /distribuir`

```json
{
  "coordenadas": ["547|351", "577|349", "..."],
  "jogadores": [
    { "nome": "dh", "qtd": 4, "ref": "547|354", "alcance": 12 },
    { "nome": "otavio", "qtd": 3, "ref": "", "alcance": 12 }
  ],
  "mundo": "br136",
  "use_aristocracia": true,
  "min_axe": 4000,
  "min_light": 2000
}
```

Quando `use_aristocracia: true`, o backend usa o store em memória (preenchido pelo Tampermonkey via `POST /aristocracia`). Você também pode passar o JSON inline em `aristocracia` (mesmo formato) — útil para testes.

Resposta de sucesso:

```json
{
  "status": "ok",
  "atribuicoes": [
    { "coord": "547|351", "x": 547, "y": 351, "player": "dh", "player_idx": 0,
      "dist": 3.0, "launch": "547|354", "launch_x": 547, "launch_y": 354 }
  ],
  "jogadores": [
    { "nome": "dh", "ref": "547|354", "ref_x": 547, "ref_y": 354,
      "ref_auto": true, "alcance": 12, "qtd": 4, "idx": 0,
      "launches": [{ "x": 547, "y": 354 }, ...] }
  ],
  "nao_atribuidas": []
}
```

Resposta de infactibilidade:

```json
{
  "status": "infeasible",
  "mensagem": "Conflito: nao da pra atender todos respeitando 1 aldeia de ataque por alvo.",
  "aldeias_sem_cobertura": [],
  "jogadores_saturados": [
    { "nome": "otavio", "qtd_pedida": 4, "max_alcancavel": 3, "motivo": "alvos no alcance" }
  ]
}
```

### `POST /aristocracia`

Recebe o payload do Tampermonkey e armazena no store em memória.

```json
{
  "aristocracia": {
    "nomeplayer": [
      { "x": 547, "y": 354,
        "spear": 0, "sword": 0, "axe": 5000, "archer": 0, "scout": 50,
        "light": 3000, "marcher": 0, "heavy": 200, "ram": 100, "catapult": 0,
        "knight": 1, "snob": 0 }
    ]
  }
}
```

Todos os campos de unidade são opcionais (default `0`). Resposta:

```json
{ "status": "ok", "n_players": 61, "n_villages": 16018 }
```

### `GET /aristocracia/status`

```json
{ "loaded": true, "n_players": 61, "n_villages": 16018, "updated_at": 1715500000.0 }
```

### `GET /aristocracia/data`

Devolve o store inteiro (usado pelo frontend para enriquecer o output).

### `DELETE /aristocracia`

Limpa o store.

---

## Estrutura

```
interna/
├── main.py                       # FastAPI app + endpoints /distribuir e /aristocracia
├── static/
│   └── index.html                # UI single-file (canvas + form + output)
├── scripts/
│   └── aristocracia.user.js      # Tampermonkey: exporta tropas da tribo para o backend
├── pyproject.toml                # deps gerenciadas por uv
└── uv.lock
```
