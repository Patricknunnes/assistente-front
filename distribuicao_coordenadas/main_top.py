import math
import random
from collections import deque

# ---------------------------
# DADOS
# ---------------------------
array_coordenadas = [
    (571,424),
    (570,414),
    (576,410),
    (576,413),
    (577,409),
    (577,412),
    (589,416),
    (588,406),
    (596,404),
    (611,427),
    (596,406),
    (595,404),
    (611,419),
    (597,404),
    (621,404),
    (583,402),
    (585,399),
    (620,404),
    (619,390),
    (620,389),
    (621,399),
    (622,394),
    (577,425),
    (625,367),
    (629,362),
    (624,366),
    (630,364),
    (639,378),
    (632,377),
    (638,378),
    (618,388),
    (620,403),
    (645,352),
    (646,353),
    (639,376),
    (580,430),
    (580,424),
    (619,388),
    (579,425),
    (646,352),
    (645,350),
    (649,348),
    (641,343),
    (645,351),
    (648,350),
    (641,350),
    (643,349),
    (575,415),
    (582,401),
    (585,402),
    (584,403),
    (585,400),
    (581,399),
    (575,404),
    (583,401),
    (583,400),
    (584,401),
    (583,399),
    (584,402),
    (582,400),
    (652,347),
    (647,350),
    (643,348),
    (648,345),
    (645,343),
    (645,348),
    (644,349),
    (647,355),
    (566,389),
    (644,356),
    (653,348),
    (628,368),
    (633,367),
    (644,354),
    (646,360),
    (645,353),
    (642,348),
    (638,366),
    (645,354),
    (644,352),
    (647,348),
    (645,355),
    (645,349),
    (645,344),
    (648,348),
    (649,349),
    (644,348),
    (643,350),
]


# 647|318, 622|368, 624|367, 638|356, 655|340


# falta 25 p junior
# receber 25 emerson


# ---------------------------
# CONFIG
# ---------------------------
MAX_DIST = 29

divisoes = [
    {'renner': 30, 'referencia': (554, 414)},
    {'otavio': 4},
    {'alba': 17, 'referencia': (554, 418)},
    {'dukstenn': 23, 'referencia': (569, 435)},
    {'reboucas': 14, 'referencia': (581, 398)},
]

coords = array_coordenadas
n = len(coords)

# ---------------------------
# Parse divisoes
# ---------------------------
names, sizes, refs = [], [], []
for d in divisoes:
    key = [kk for kk in d if kk != 'referencia'][0]
    names.append(key)
    sizes.append(d[key])
    refs.append(d.get('referencia'))

k = len(names)
total_needed = sum(sizes)

print(f"Total pontos: {n}")
print(f"Total necessario: {total_needed}")
if total_needed != n:
    diff = total_needed - n
    if diff > 0:
        print(f"  ATENCAO: faltam {diff} ponto(s) no array!")
    else:
        print(f"  ATENCAO: sobram {abs(diff)} ponto(s) no array!")


# ---------------------------
# Helpers
# ---------------------------
def dist(a, b):
    return math.sqrt((a[0] - b[0])**2 + (a[1] - b[1])**2)


# Pre-computar distancias entre todos os pontos
dist_matrix = [[0.0] * n for _ in range(n)]
for i in range(n):
    for j in range(i + 1, n):
        d = dist(coords[i], coords[j])
        dist_matrix[i][j] = d
        dist_matrix[j][i] = d

# Grafo de adjacencia (pontos dentro de MAX_DIST)
adj = [[] for _ in range(n)]
adj_set = [set() for _ in range(n)]
for i in range(n):
    for j in range(i + 1, n):
        if dist_matrix[i][j] <= MAX_DIST:
            adj[i].append(j)
            adj[j].append(i)
            adj_set[i].add(j)
            adj_set[j].add(i)


def is_connected(pts):
    if len(pts) <= 1:
        return True
    pts_set = set(pts) if not isinstance(pts, set) else pts
    start = next(iter(pts_set))
    visited = {start}
    q = deque([start])
    while q:
        p = q.popleft()
        for nb in adj[p]:
            if nb in pts_set and nb not in visited:
                visited.add(nb)
                q.append(nb)
    return len(visited) == len(pts_set)


# Score rapido (sem diametro - usado na otimizacao)
def quick_score(clusters):
    s = 0
    for i in range(k):
        diff = abs(len(clusters[i]) - sizes[i])
        if diff == 0:
            s += 100
        else:
            s -= diff * 20
    return s


# ---------------------------
# Algoritmo: BFS proporcional compacto
# ---------------------------
def solve(attempt=0):
    rng = random.Random(attempt * 7 + 13)

    # --- Seeds ---
    used = set()
    seeds = [None] * k

    ref_order = sorted(
        [i for i in range(k) if refs[i]],
        key=lambda i: -sizes[i]
    )

    for i in ref_order:
        candidates = sorted(
            [(j, dist(coords[j], refs[i])) for j in range(n) if j not in used],
            key=lambda x: x[1]
        )
        pick = 0
        if attempt > 0 and len(candidates) > 2:
            pick = rng.randint(0, min(3, len(candidates) - 1))
        seeds[i] = candidates[pick][0]
        used.add(seeds[i])

    for i in range(k):
        if seeds[i] is None:
            candidates = [j for j in range(n) if j not in used]
            if attempt == 0:
                seeds[i] = max(candidates, key=lambda j: len(adj[j]))
            else:
                seeds[i] = rng.choice(candidates)
            used.add(seeds[i])

    # --- Crescimento BFS proporcional ---
    clusters = [set([seeds[i]]) for i in range(k)]
    assigned = set(seeds)

    for round_num in range(n):
        if all(len(clusters[i]) >= sizes[i] for i in range(k)):
            break
        if len(assigned) >= n:
            break

        # Ordena por % preenchimento (menos preenchido primeiro)
        order = sorted(
            range(k),
            key=lambda i: len(clusters[i]) / max(sizes[i], 1)
        )

        for i in order:
            if len(clusters[i]) >= sizes[i]:
                continue

            # Vizinhos nao alocados do cluster
            candidates = []
            for p in clusters[i]:
                for nb in adj[p]:
                    if nb not in assigned:
                        # Distancia ao ponto mais proximo do cluster
                        min_d = min(dist_matrix[nb][cp] for cp in clusters[i])
                        candidates.append((min_d, nb))

            if not candidates:
                continue

            # Pega o mais proximo (crescimento compacto)
            candidates.sort()
            best = candidates[0][1]
            clusters[i].add(best)
            assigned.add(best)

    # --- Encaixa restantes ---
    for p in range(n):
        if p in assigned:
            continue
        best_i = None
        best_d = float('inf')
        for i in range(k):
            if len(clusters[i]) >= sizes[i]:
                continue
            for cp in clusters[i]:
                if dist_matrix[p][cp] <= MAX_DIST and dist_matrix[p][cp] < best_d:
                    best_d = dist_matrix[p][cp]
                    best_i = i
        if best_i is not None:
            clusters[best_i].add(p)
            assigned.add(p)

    # --- Busca local: mover de cheio para vazio ---
    for _ in range(500):
        improved = False
        for i in range(k):
            if len(clusters[i]) <= sizes[i]:
                continue
            for j in range(k):
                if i == j or len(clusters[j]) >= sizes[j]:
                    continue
                for p in list(clusters[i]):
                    if not (adj_set[p] & clusters[j]):
                        continue
                    clusters[i].remove(p)
                    if not is_connected(clusters[i]):
                        clusters[i].add(p)
                        continue
                    clusters[j].add(p)
                    if not is_connected(clusters[j]):
                        clusters[j].remove(p)
                        clusters[i].add(p)
                        continue
                    improved = True
                    break
                if improved:
                    break
            if improved:
                break
        if not improved:
            break

    return clusters, assigned, quick_score(clusters)


# ---------------------------
# Multi-start
# ---------------------------
best_clusters = None
best_assigned = None
best_score = -float('inf')

NUM_ATTEMPTS = 200

for attempt in range(NUM_ATTEMPTS):
    clusters, assigned, s = solve(attempt)

    if s > best_score:
        best_score = s
        best_clusters = [set(c) for c in clusters]
        best_assigned = set(assigned)

perfect = k * 100
if best_score >= perfect:
    print(f"\nSolucao perfeita encontrada!")
else:
    print(f"\nMelhor score: {best_score} / {perfect}")

clusters = best_clusters
assigned = best_assigned


# ---------------------------
# RESULTADO FINAL
# ---------------------------
print("\n" + "=" * 55)
print("  RESULTADO FINAL")
print("=" * 55)

all_ok = True
for i in range(k):
    sz = len(clusters[i])
    target = sizes[i]

    # Diametro
    diam = 0
    pts = list(clusters[i])
    for a in range(len(pts)):
        for b in range(a + 1, len(pts)):
            d = dist_matrix[pts[a]][pts[b]]
            if d > diam:
                diam = d

    print(f"\n{'-' * 55}")
    print(f"  {names[i].upper()}")
    print(f"{'-' * 55}")

    ok_size = (sz == target)
    status = "OK" if ok_size else f"(faltam {target - sz})" if sz < target else f"(sobram {sz - target})"
    print(f"  Qtd: {sz} / {target}  {status}")
    if not ok_size:
        all_ok = False

    if refs[i]:
        min_d = min(dist(coords[p], refs[i]) for p in clusters[i])
        ok_ref = min_d <= MAX_DIST
        print(f"  Dist ref: {min_d:.1f}  {'OK' if ok_ref else 'FALHA'}")
        if not ok_ref:
            all_ok = False

    conn = is_connected(clusters[i])
    print(f"  Conectado: {'OK' if conn else 'FALHA'}")
    if not conn:
        all_ok = False

    print(f"  Diametro: {diam:.1f}")

    # Ponto isolado check
    for p in clusters[i]:
        has_nb = any(dist_matrix[p][q] <= MAX_DIST for q in clusters[i] if q != p)
        if not has_nb and sz > 1:
            print(f"  PONTO ISOLADO: {coords[p]}")
            all_ok = False

    print(f"  Coordenadas:")
    sorted_pts = sorted(clusters[i], key=lambda p: (coords[p][0], coords[p][1]))
    for p in sorted_pts:
        print(f"    {coords[p][0]}|{coords[p][1]}")


# Nao alocados
unassigned_final = set(range(n)) - assigned
if unassigned_final:
    print(f"\n  NAO ALOCADOS: {len(unassigned_final)}")
    for p in sorted(unassigned_final):
        print(f"    {coords[p][0]}|{coords[p][1]}")

print()
if all_ok:
    print("TODAS AS DIVISOES CORRETAS!")
else:
    print("ALGUMAS DIVISOES COM PROBLEMAS - verifique acima")
