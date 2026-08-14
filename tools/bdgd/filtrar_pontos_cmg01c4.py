import json
import sys


if len(sys.argv) != 4:
    print()
    print("Uso:")
    print(
        "py filtrar_pontos_cmg01c4.py "
        "trechos.geojson pontos.geojson saida.geojson"
    )
    print()
    sys.exit(1)


arquivo_trechos = sys.argv[1]
arquivo_pontos = sys.argv[2]
arquivo_saida = sys.argv[3]


def normalizar(valor):

    if valor is None:
        return None

    return str(valor).strip()


# ==========================================================
# CARREGAR SSDMT
# ==========================================================

print("Carregando trechos SSDMT...")

with open(
    arquivo_trechos,
    "r",
    encoding="utf-8"
) as f:

    trechos = json.load(f)


features_trechos = trechos.get(
    "features",
    []
)


print(
    f"Trechos encontrados: "
    f"{len(features_trechos)}"
)

print()


# ==========================================================
# EXTRAIR PN_CON
# ==========================================================

ids_pontos = set()


print(
    "Extraindo PN_CON_1 e PN_CON_2..."
)

print()


for feature in features_trechos:

    props = feature.get(
        "properties",
        {}
    )

    pn1 = normalizar(
        props.get("PN_CON_1")
    )

    pn2 = normalizar(
        props.get("PN_CON_2")
    )

    if pn1:
        ids_pontos.add(pn1)

    if pn2:
        ids_pontos.add(pn2)


print(
    f"Pontos/conexoes necessarios: "
    f"{len(ids_pontos)}"
)

print()


# ==========================================================
# EXEMPLOS
# ==========================================================

print(
    "Exemplos de PN_CON encontrados:"
)

for codigo in list(ids_pontos)[:10]:

    print(
        f"- {codigo}"
    )


print()


# ==========================================================
# CARREGAR PONNOT
# ==========================================================

print(
    "Carregando PONNOT..."
)

with open(
    arquivo_pontos,
    "r",
    encoding="utf-8"
) as f:

    pontos = json.load(f)


features_pontos = pontos.get(
    "features",
    []
)


print(
    f"Registros PONNOT encontrados: "
    f"{len(features_pontos)}"
)

print()


# ==========================================================
# INDEXAR PONNOT
# ==========================================================

print(
    "Indexando PONNOT por COD_ID..."
)


indice_pontos = {}


for feature in features_pontos:

    props = feature.get(
        "properties",
        {}
    )

    cod_id = normalizar(
        props.get("COD_ID")
    )

    if not cod_id:
        continue

    indice_pontos[cod_id] = feature


print(
    f"COD_ID indexados: "
    f"{len(indice_pontos)}"
)

print()


# ==========================================================
# PROCURAR CORRESPONDENCIAS
# ==========================================================

print(
    "Procurando correspondencias..."
)

print()


features_filtradas = []

encontrados = set()

faltantes = set()


for codigo in ids_pontos:

    feature = indice_pontos.get(
        codigo
    )

    if feature:

        features_filtradas.append(
            feature
        )

        encontrados.add(
            codigo
        )

    else:

        faltantes.add(
            codigo
        )


# ==========================================================
# RESULTADO
# ==========================================================

print(
    f"Trechos encontrados: "
    f"{len(features_trechos)}"
)

print(
    f"PN_CON necessarios: "
    f"{len(ids_pontos)}"
)

print(
    f"Pontos encontrados: "
    f"{len(encontrados)}"
)

print(
    f"Pontos nao encontrados: "
    f"{len(faltantes)}"
)

print()


# ==========================================================
# MOSTRAR FALTANTES
# ==========================================================

if faltantes:

    print(
        "ATENCAO:"
    )

    print(
        "Alguns PN_CON nao foram encontrados "
        "no PONNOT:"
    )

    print()

    for codigo in list(
        faltantes
    )[:20]:

        print(
            f"- {codigo}"
        )

    print()


# ==========================================================
# GEOJSON
# ==========================================================

resultado = {

    "type": "FeatureCollection",

    "name": "CMG01C4_pontos",

    "features": features_filtradas
}


with open(
    arquivo_saida,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        resultado,
        f,
        ensure_ascii=False,
        separators=(
            ",",
            ":"
        )
    )


print(
    "=========================================="
)

print(
    "RESULTADO"
)

print(
    "=========================================="
)

print()

print(
    f"Pontos filtrados: "
    f"{len(features_filtradas)}"
)

print()

print(
    "Arquivo criado:"
)

print(
    arquivo_saida
)

print()

print(
    "Processamento concluido com sucesso."
)