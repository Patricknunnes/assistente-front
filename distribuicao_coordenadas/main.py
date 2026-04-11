


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

coords = array_coordenadas

import random
import math

# ---------------------------
# Helpers
# ---------------------------
def distance(a, b):
    return math.sqrt((a[0] - b[0])**2 + (a[1] - b[1])**2)

def mean(points):
    x = sum(p[0] for p in points) / len(points)
    y = sum(p[1] for p in points) / len(points)
    return (x, y)


import math
import heapq
from collections import defaultdict

# ---------------------------
# CONFIG
# ---------------------------
MAX_DIST = 29
BEAM_WIDTH = 5  # aumenta = melhor qualidade / mais lento

divisoes = [
    {'renner': 30, 'referencia': (554, 414)},
    {'otavio': 5},
    {'alba': 17, 'referencia': (554, 418)},
    {'dukstenn': 23, 'referencia': (569, 435)},
    {'reboucas': 14, 'referencia': (581, 398)}
]

coords = array_coordenadas  # [(x, y), ...]

# ---------------------------
# Helpers
# ---------------------------
def distance(a, b):
    return math.sqrt((a[0] - b[0])**2 + (a[1] - b[1])**2)


def can_attach(idx, cluster, coords):
    """Verifica conectividade (efeito ponte)"""
    return any(distance(coords[idx], coords[c]) <= MAX_DIST for c in cluster)


def choose_seed(ref, coords):
    """Escolhe seed próxima da referência"""
    candidates = [
        (i, distance(coords[i], ref))
        for i in range(len(coords))
        if distance(coords[i], ref) <= MAX_DIST
    ]

    if not candidates:
        return None

    return min(candidates, key=lambda x: x[1])[0]


# ---------------------------
# Setup divisões
# ---------------------------
names = []
sizes = []
references = []

for d in divisoes:
    key = [k for k in d.keys() if k != 'referencia'][0]
    names.append(key)
    sizes.append(d[key])
    references.append(d.get('referencia', None))

k = len(names)
n = len(coords)

# ---------------------------
# Seeds iniciais
# ---------------------------
seeds = []

used = set()

for i in range(k):
    if references[i] is not None:
        seed = choose_seed(references[i], coords)
        if seed is None:
            raise ValueError(f"Sem ponto próximo da referência {references[i]}")
    else:
        for j in range(n):
            if j not in used:
                seed = j
                break

    seeds.append(seed)
    used.add(seed)


# ---------------------------
# Score (QUALIDADE)
# ---------------------------
def score_solution(clusters):
    score = 0

    for i, c in clusters.items():
        size = len(c)
        target = sizes[i]

        # recompensa cluster cheio
        score += min(size, target) ** 2

        # penaliza cluster incompleto
        if size < target:
            score -= (target - size) * 2

    return score


# ---------------------------
# Beam Search
# ---------------------------
def beam_search():
    initial_clusters = {i: [seeds[i]] for i in range(k)}
    initial_assigned = set(seeds)

    beam = [(0, initial_assigned, initial_clusters)]

    for step in range(n):
        new_beam = []

        for score, assigned, clusters in beam:
            for idx in range(n):
                if idx in assigned:
                    continue

                for i in range(k):
                    if len(clusters[i]) >= sizes[i]:
                        continue

                    if can_attach(idx, clusters[i], coords):
                        new_clusters = {
                            j: list(clusters[j]) for j in clusters
                        }
                        new_assigned = set(assigned)

                        new_clusters[i].append(idx)
                        new_assigned.add(idx)

                        new_score = score_solution(new_clusters)

                        new_beam.append(
                            (new_score, new_assigned, new_clusters)
                        )

        if not new_beam:
            break

        # mantém os melhores
        beam = heapq.nlargest(BEAM_WIDTH, new_beam, key=lambda x: x[0])

    return beam[0] if beam else None


# ---------------------------
# Executa
# ---------------------------
result = beam_search()

if result is None:
    print("❌ Nenhuma solução encontrada")
    exit()

score, assigned, clusters = result

# ---------------------------
# Validação
# ---------------------------
print("\n=== VALIDAÇÃO ===")

for i in range(k):
    print(f"\nCluster {names[i]}")

    # tamanho
    print(f"Qtd: {len(clusters[i])} / {sizes[i]}")

    # referência
    if references[i] is not None:
        min_dist = min(
            distance(coords[idx], references[i])
            for idx in clusters[i]
        )

        print(f"Dist ref: {min_dist:.2f}")

        if min_dist > MAX_DIST:
            print("❌ referência não conectada")
        else:
            print("✅ referência OK")

    # conectividade
    for idx in clusters[i]:
        ok = any(
            distance(coords[idx], coords[j]) <= MAX_DIST
            for j in clusters[i] if j != idx
        )

        if not ok and len(clusters[i]) > 1:
            print("❌ ponto isolado:", coords[idx])


# ---------------------------
# Resultado final
# ---------------------------
resultado = {
    names[i]: [f"{coords[idx][0]}|{coords[idx][1]}" for idx in clusters[i]]
    for i in range(k)
}

# print final
for i in range(k):
    print('-' * 40)
    print(names[i])
    print(f"Qtd: {len(resultado[names[i]])}")

    for coord in resultado[names[i]]:
        print(coord)


# ---------------------------
# Não alocados
# ---------------------------
nao_alocados = set(range(n)) - assigned

if nao_alocados:
    print("\n⚠️ Não alocados:", len(nao_alocados))