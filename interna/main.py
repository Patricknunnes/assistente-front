import math
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Dict, List, Optional

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


class AristoVillage(BaseModel):
    x: int
    y: int
    spear: int = 0
    sword: int = 0
    axe: int = 0
    archer: int = 0
    scout: int = 0
    light: int = 0
    marcher: int = 0
    heavy: int = 0
    ram: int = 0
    catapult: int = 0
    knight: int = 0
    snob: int = 0


class DistribuirRequest(BaseModel):
    coordenadas: List[str]
    jogadores: List[Jogador]
    mundo: Optional[str] = "br136"
    aristocracia: Optional[Dict[str, List[AristoVillage]]] = None
    use_aristocracia: bool = False
    min_axe: int = 4000
    min_light: int = 2000
    multi_ataque_por_aldeia: bool = False


class AristocraciaUpload(BaseModel):
    aristocracia: Dict[str, List[AristoVillage]]


def parse_coord(s: str):
    x, y = s.strip().split("|")
    return int(x), int(y)


def parse_coords_multi(s: str):
    return [(int(m.group(1)), int(m.group(2))) for m in re.finditer(r"(\d{1,3})\|(\d{1,3})", s or "")]


def dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


_WORLD_CACHE: dict = {}
_WORLD_TTL = 3600  # 1h

_ARISTO_STORE: dict = {"data": None, "updated_at": None}


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


@app.post("/aristocracia")
def upload_aristocracia(payload: AristocraciaUpload):
    data = {k.strip().lower(): v for k, v in payload.aristocracia.items()}
    _ARISTO_STORE["data"] = data
    _ARISTO_STORE["updated_at"] = time.time()
    n_players = len(data)
    n_villages = sum(len(v) for v in data.values())
    return {"status": "ok", "n_players": n_players, "n_villages": n_villages}


@app.get("/aristocracia/status")
def aristocracia_status():
    data = _ARISTO_STORE.get("data")
    if not data:
        return {"loaded": False}
    return {
        "loaded": True,
        "n_players": len(data),
        "n_villages": sum(len(v) for v in data.values()),
        "updated_at": _ARISTO_STORE.get("updated_at"),
    }


@app.get("/aristocracia/data")
def aristocracia_data():
    data = _ARISTO_STORE.get("data") or {}
    return {nome: [v.model_dump() for v in vlist] for nome, vlist in data.items()}


@app.delete("/aristocracia")
def clear_aristocracia():
    _ARISTO_STORE["data"] = None
    _ARISTO_STORE["updated_at"] = None
    return {"status": "ok"}


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
    aristo: Dict[str, List[AristoVillage]] = {}
    if req.aristocracia:
        aristo = {k.strip().lower(): v for k, v in req.aristocracia.items()}
    elif req.use_aristocracia and _ARISTO_STORE.get("data"):
        aristo = _ARISTO_STORE["data"]

    for j in req.jogadores:
        manual = parse_coords_multi(j.ref)
        if manual:
            launches.append(manual)
            refs_auto.append(False)
            continue

        key = j.nome.strip().lower()
        if key in aristo:
            filtradas = [
                (v.x, v.y)
                for v in aristo[key]
                if v.axe >= req.min_axe or v.light >= req.min_light
            ]
            if not filtradas:
                nao_encontrados.append(f"{j.nome} (nenhuma aldeia >= {req.min_axe} axe ou {req.min_light} CL na aristocracia)")
                launches.append([])
                refs_auto.append(True)
                continue
            launches.append(filtradas)
            refs_auto.append(True)
            continue

        if mundo_data is None:
            try:
                mundo_data = fetch_world(req.mundo or "br136")
            except Exception as e:
                return {"status": "erro", "mensagem": f"Falha ao baixar dados do mundo: {e}"}
        vlist = mundo_data.get(key)
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

    limite_atk_por_aldeia = 2 if req.multi_ataque_por_aldeia else 1

    capacidade_real = [sum(1 for v in range(n) if reachable[v][p]) for p in range(k)]
    jogadores_saturados_pre = []
    for p in range(k):
        if capacidade_real[p] < qtds[p]:
            jogadores_saturados_pre.append(
                {"nome": nomes[p], "qtd_pedida": qtds[p], "max_alcancavel": capacidade_real[p], "motivo": "alvos no alcance"}
            )
        elif len(launches[p]) * limite_atk_por_aldeia < qtds[p]:
            jogadores_saturados_pre.append(
                {"nome": nomes[p], "qtd_pedida": qtds[p], "max_alcancavel": len(launches[p]) * limite_atk_por_aldeia, "motivo": "aldeias de ataque disponiveis"}
            )
    if jogadores_saturados_pre:
        return {
            "status": "infeasible",
            "mensagem": "Algum jogador nao tem recursos suficientes (alvos ou aldeias de ataque).",
            "aldeias_sem_cobertura": [],
            "jogadores_saturados": jogadores_saturados_pre,
        }

    # Constroi arestas (v, p, li, d) — uma por par alcancavel
    edges = []
    for v in range(n):
        for p in range(k):
            for li, lv in enumerate(launches[p]):
                d = dist(coords[v], lv)
                if d <= alcances[p]:
                    edges.append((v, p, li, d))

    by_v: List[list] = [[] for _ in range(n)]
    by_p: List[list] = [[] for _ in range(k)]
    by_pli: dict = {}
    for (v, p, li, d) in edges:
        by_v[v].append((p, li, d))
        by_p[p].append((v, li, d))
        by_pli.setdefault((p, li), []).append(v)

    prob = pulp.LpProblem("distribuicao", pulp.LpMinimize)
    y = {(v, p, li): pulp.LpVariable(f"y_{v}_{p}_{li}", cat="Binary") for (v, p, li, _) in edges}

    prob += pulp.lpSum(y[(v, p, li)] * d for (v, p, li, d) in edges)

    for v in range(n):
        if by_v[v]:
            prob += pulp.lpSum(y[(v, p, li)] for (p, li, _) in by_v[v]) <= 1

    for p in range(k):
        prob += pulp.lpSum(y[(v, p, li)] for (v, li, _) in by_p[p]) == qtds[p]

    for (p, li), vs in by_pli.items():
        prob += pulp.lpSum(y[(v, p, li)] for v in vs) <= limite_atk_por_aldeia

    status_code = prob.solve(pulp.PULP_CBC_CMD(msg=0))
    status_str = pulp.LpStatus[status_code]

    if status_str != "Optimal":
        prob2 = pulp.LpProblem("diag", pulp.LpMinimize)
        y2 = {kk: pulp.LpVariable(f"d_{kk[0]}_{kk[1]}_{kk[2]}", cat="Binary") for kk in y}
        s = {p: pulp.LpVariable(f"s_{p}", lowBound=0, cat="Integer") for p in range(k)}
        prob2 += pulp.lpSum(s[p] for p in range(k))
        for v in range(n):
            if by_v[v]:
                prob2 += pulp.lpSum(y2[(v, p, li)] for (p, li, _) in by_v[v]) <= 1
        for p in range(k):
            prob2 += (
                pulp.lpSum(y2[(v, p, li)] for (v, li, _) in by_p[p]) + s[p] == qtds[p]
            )
        for (p, li), vs in by_pli.items():
            prob2 += pulp.lpSum(y2[(v, p, li)] for v in vs) <= limite_atk_por_aldeia
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
            "mensagem": "Conflito: nao da pra atender todos respeitando 1 aldeia de ataque por alvo.",
            "aldeias_sem_cobertura": [],
            "jogadores_saturados": jogadores_saturados,
        }

    atribuicoes = []
    atribuidas = set()
    for (v, p, li, d) in edges:
        if pulp.value(y[(v, p, li)]) > 0.5:
            lv = launches[p][li]
            atribuicoes.append(
                {
                    "coord": f"{coords[v][0]}|{coords[v][1]}",
                    "x": coords[v][0],
                    "y": coords[v][1],
                    "player": nomes[p],
                    "player_idx": p,
                    "dist": round(d, 2),
                    "launch": f"{lv[0]}|{lv[1]}",
                    "launch_x": lv[0],
                    "launch_y": lv[1],
                }
            )
            atribuidas.add(v)

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
