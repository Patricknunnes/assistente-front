import math
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import List, Optional

import pulp
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

app = FastAPI()
STATIC_DIR = Path(__file__).parent / "static"


class Jogador(BaseModel):
    nome: str
    qtd: int
    ref: Optional[str] = None
    alcance: float = 12.0


class DistribuirRequest(BaseModel):
    coordenadas: List[str]
    jogadores: List[Jogador]
    mundo: Optional[str] = "br136"


def parse_coord(s: str):
    x, y = s.strip().split("|")
    return int(x), int(y)


def parse_coords_multi(s: str):
    return [(int(m.group(1)), int(m.group(2))) for m in re.finditer(r"(\d{1,3})\|(\d{1,3})", s or "")]


def dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


_WORLD_CACHE: dict = {}
_WORLD_TTL = 3600  # 1h


def _fetch_text(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "interna-distribuicao/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", errors="replace")


def fetch_world(mundo: str):
    """Devolve dict {player_name_lower: [(x,y), ...]}."""
    now = time.time()
    cached = _WORLD_CACHE.get(mundo)
    if cached and now - cached["t"] < _WORLD_TTL:
        return cached["data"]

    base = f"https://{mundo}.tribalwars.com.br/map"
    players_raw = _fetch_text(f"{base}/player.txt")
    name_by_id: dict = {}
    for line in players_raw.splitlines():
        parts = line.split(",")
        if len(parts) >= 2:
            pid, name_enc = parts[0], parts[1]
            name_by_id[pid] = urllib.parse.unquote_plus(name_enc).strip().lower()

    villages_raw = _fetch_text(f"{base}/village.txt")
    villages: dict = {}
    for line in villages_raw.splitlines():
        parts = line.split(",")
        if len(parts) >= 5:
            _, _, x, y, pid = parts[:5]
            name = name_by_id.get(pid)
            if name:
                villages.setdefault(name, []).append((int(x), int(y)))

    _WORLD_CACHE[mundo] = {"t": now, "data": villages}
    return villages


@app.post("/distribuir")
def distribuir(req: DistribuirRequest):
    coords_uniq = list(dict.fromkeys(c.strip() for c in req.coordenadas if c.strip()))
    coords = [parse_coord(c) for c in coords_uniq]
    n = len(coords)
    if n == 0:
        return {"status": "erro", "mensagem": "Nenhuma coordenada valida."}

    # Determinar pontos de lancamento por jogador (uma lista por jogador):
    #  - se ref manual com 1+ coords -> usa essas
    #  - se ref vazia -> todas as aldeias do jogador no mundo
    cx = sum(c[0] for c in coords) / n
    cy = sum(c[1] for c in coords) / n

    launches: List[List[tuple]] = []
    refs_auto: List[bool] = []
    mundo_data = None
    nao_encontrados: List[str] = []

    for j in req.jogadores:
        manual = parse_coords_multi(j.ref)
        if manual:
            launches.append(manual)
            refs_auto.append(False)
        else:
            if mundo_data is None:
                try:
                    mundo_data = fetch_world(req.mundo or "br136")
                except Exception as e:
                    return {"status": "erro", "mensagem": f"Falha ao baixar dados do mundo: {e}"}
            vlist = mundo_data.get(j.nome.strip().lower())
            if not vlist:
                nao_encontrados.append(j.nome)
                launches.append([])
                refs_auto.append(True)
                continue
            launches.append(list(vlist))
            refs_auto.append(True)

    if nao_encontrados:
        return {
            "status": "erro",
            "mensagem": f"Jogador(es) nao encontrado(s) no mundo {req.mundo}: {', '.join(nao_encontrados)}",
        }

    alcances = [j.alcance for j in req.jogadores]
    qtds = [j.qtd for j in req.jogadores]
    nomes = [j.nome for j in req.jogadores]
    k = len(launches)

    # Filtra launches: mantém só os que alcançam algum alvo
    for p in range(k):
        useful = [lv for lv in launches[p] if any(dist(lv, c) <= alcances[p] for c in coords)]
        if useful:
            launches[p] = useful
        else:
            launches[p] = [min(launches[p], key=lambda v: (v[0] - cx) ** 2 + (v[1] - cy) ** 2)]

    # "Ref principal" pra exibicao = lançamento mais proximo do centroide dos alvos
    refs = [min(launches[p], key=lambda v: (v[0] - cx) ** 2 + (v[1] - cy) ** 2) for p in range(k)]

    if sum(qtds) > n:
        return {
            "status": "erro",
            "mensagem": f"Soma das qtds dos jogadores ({sum(qtds)}) e maior que o total de aldeias ({n}).",
        }

    dists = [
        [min(dist(coords[v], lv) for lv in launches[p]) for p in range(k)]
        for v in range(n)
    ]
    reachable = [[dists[v][p] <= alcances[p] for p in range(k)] for v in range(n)]

    capacidade_real = [sum(1 for v in range(n) if reachable[v][p]) for p in range(k)]
    jogadores_saturados_pre = [
        {"nome": nomes[p], "qtd_pedida": qtds[p], "max_alcancavel": capacidade_real[p]}
        for p in range(k)
        if capacidade_real[p] < qtds[p]
    ]
    if jogadores_saturados_pre:
        return {
            "status": "infeasible",
            "mensagem": "Algum jogador nao tem aldeias suficientes no alcance.",
            "aldeias_sem_cobertura": [],
            "jogadores_saturados": jogadores_saturados_pre,
        }

    prob = pulp.LpProblem("distribuicao", pulp.LpMinimize)
    x = {}
    for v in range(n):
        for p in range(k):
            if reachable[v][p]:
                x[(v, p)] = pulp.LpVariable(f"x_{v}_{p}", cat="Binary")

    prob += pulp.lpSum(x[(v, p)] * dists[v][p] for (v, p) in x)

    for v in range(n):
        vars_v = [x[(v, p)] for p in range(k) if (v, p) in x]
        if vars_v:
            prob += pulp.lpSum(vars_v) <= 1

    for p in range(k):
        prob += pulp.lpSum(x[(v, p)] for v in range(n) if (v, p) in x) == qtds[p]

    status_code = prob.solve(pulp.PULP_CBC_CMD(msg=0))
    status_str = pulp.LpStatus[status_code]

    if status_str != "Optimal":
        # Modelo relaxado pra diagnosticar: maximiza o que da pra atender,
        # devolvendo quantas aldeias faltaram pra cada jogador.
        prob2 = pulp.LpProblem("diag", pulp.LpMinimize)
        x2 = {}
        for (v, p) in x:
            x2[(v, p)] = pulp.LpVariable(f"d_{v}_{p}", cat="Binary")
        s = {p: pulp.LpVariable(f"s_{p}", lowBound=0, cat="Integer") for p in range(k)}
        prob2 += pulp.lpSum(s[p] for p in range(k))
        for v in range(n):
            vars_v = [x2[(v, p)] for p in range(k) if (v, p) in x2]
            if vars_v:
                prob2 += pulp.lpSum(vars_v) <= 1
        for p in range(k):
            prob2 += (
                pulp.lpSum(x2[(v, p)] for v in range(n) if (v, p) in x2) + s[p]
                == qtds[p]
            )
        prob2.solve(pulp.PULP_CBC_CMD(msg=0))

        jogadores_saturados = []
        for p in range(k):
            falta_val = pulp.value(s[p]) or 0
            falta = int(round(falta_val))
            if falta > 0:
                jogadores_saturados.append(
                    {
                        "nome": nomes[p],
                        "qtd_pedida": qtds[p],
                        "max_alcancavel": qtds[p] - falta,
                        "faltam": falta,
                    }
                )
        return {
            "status": "infeasible",
            "mensagem": "Conflito entre jogadores: alguns disputam o mesmo bolsao de aldeias e nao da pra atender todos.",
            "aldeias_sem_cobertura": [],
            "jogadores_saturados": jogadores_saturados,
        }

    atribuicoes = []
    atribuidas = set()
    for v in range(n):
        for p in range(k):
            if (v, p) in x and pulp.value(x[(v, p)]) > 0.5:
                launch_v = min(launches[p], key=lambda lv: dist(coords[v], lv))
                atribuicoes.append(
                    {
                        "coord": f"{coords[v][0]}|{coords[v][1]}",
                        "x": coords[v][0],
                        "y": coords[v][1],
                        "player": nomes[p],
                        "player_idx": p,
                        "dist": round(dists[v][p], 2),
                        "launch": f"{launch_v[0]}|{launch_v[1]}",
                        "launch_x": launch_v[0],
                        "launch_y": launch_v[1],
                    }
                )
                atribuidas.add(v)
                break

    nao_atribuidas = [
        {"coord": f"{coords[v][0]}|{coords[v][1]}", "x": coords[v][0], "y": coords[v][1]}
        for v in range(n)
        if v not in atribuidas
    ]

    jogadores_out = [
        {
            "nome": nomes[p],
            "ref": f"{refs[p][0]}|{refs[p][1]}",
            "ref_x": refs[p][0],
            "ref_y": refs[p][1],
            "ref_auto": refs_auto[p],
            "alcance": alcances[p],
            "qtd": qtds[p],
            "idx": p,
            "launches": [{"x": lv[0], "y": lv[1]} for lv in launches[p]],
        }
        for p in range(k)
    ]

    return {
        "status": "ok",
        "atribuicoes": atribuicoes,
        "jogadores": jogadores_out,
        "nao_atribuidas": nao_atribuidas,
    }


@app.get("/")
def index():
    return FileResponse(STATIC_DIR / "index.html")


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
