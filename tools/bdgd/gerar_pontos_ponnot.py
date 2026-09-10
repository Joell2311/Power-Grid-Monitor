import json
import os
import subprocess
import sys
import tempfile


# ==========================================================
# VALIDACAO
# ==========================================================

if len(sys.argv) != 4:

    print()
    print("Uso:")
    print("py gerar_pontos_ponnot.py trechos.geojson banco.gdb saida.geojson")
    print()

    sys.exit(1)


arquivo_trechos = sys.argv[1]
gdb = sys.argv[2]
saida = sys.argv[3]


OGR2OGR = r"C:\Users\vitor\AppData\Local\Programs\OSGeo4W\bin\ogr2ogr.exe"


# ==========================================================
# VALIDAR ARQUIVOS
# ==========================================================

if not os.path.isfile(arquivo_trechos):

    print("ERRO: SSDMT nao encontrado:")
    print(arquivo_trechos)

    sys.exit(1)


if not os.path.isdir(gdb):

    print("ERRO: GDB nao encontrada:")
    print(gdb)

    sys.exit(1)


if not os.path.isfile(OGR2OGR):

    print("ERRO: ogr2ogr nao encontrado:")
    print(OGR2OGR)

    sys.exit(1)


# ==========================================================
# CARREGAR SSDMT
# ==========================================================

print()
print("==========================================================")
print("CARREGANDO SSDMT")
print("==========================================================")
print()


with open(
    arquivo_trechos,
    "r",
    encoding="utf-8"
) as f:

    trechos = json.load(f)


features = trechos.get("features", [])


print(f"Trechos encontrados: {len(features)}")


# ==========================================================
# OBTER COD_ID
# ==========================================================

codigos = set()


for feature in features:

    props = feature.get("properties", {})

    pn1 = props.get("PN_CON_1")
    pn2 = props.get("PN_CON_2")

    if pn1 is not None:

        valor = str(pn1).strip()

        if valor:
            codigos.add(valor)

    if pn2 is not None:

        valor = str(pn2).strip()

        if valor:
            codigos.add(valor)


print(f"COD_ID necessarios: {len(codigos)}")


if not codigos:

    print()
    print("ERRO: nenhum PN_CON foi encontrado.")
    sys.exit(1)


# ==========================================================
# CALCULAR EXTENT DO SSDMT
# ==========================================================

print()
print("Calculando area do alimentador...")
print()


coordenadas = []


for feature in features:

    geometry = feature.get("geometry")

    if not geometry:
        continue

    geom_type = geometry.get("type")

    coords = geometry.get("coordinates", [])


    def extrair_coords(valor):

        if isinstance(valor, list):

            if (
                len(valor) >= 2
                and isinstance(valor[0], (int, float))
                and isinstance(valor[1], (int, float))
            ):

                coordenadas.append(
                    (
                        float(valor[0]),
                        float(valor[1])
                    )
                )

            else:

                for item in valor:
                    extrair_coords(item)


    extrair_coords(coords)


if not coordenadas:

    print("ERRO: nao foi possivel encontrar coordenadas no SSDMT.")
    sys.exit(1)


minx = min(x for x, y in coordenadas)
maxx = max(x for x, y in coordenadas)

miny = min(y for x, y in coordenadas)
maxy = max(y for x, y in coordenadas)


# ==========================================================
# ADICIONAR MARGEM
# ==========================================================

MARGEM = 0.002


minx -= MARGEM
maxx += MARGEM

miny -= MARGEM
maxy += MARGEM


print("Area utilizada:")
print()
print(f"Min X: {minx}")
print(f"Max X: {maxx}")
print(f"Min Y: {miny}")
print(f"Max Y: {maxy}")
print()


# ==========================================================
# CRIAR ARQUIVO TEMPORARIO
# ==========================================================

temp_pontos = os.path.join(
    os.path.dirname(saida),
    "_PONNOT_AREA_TEMP.geojson"
)


if os.path.exists(temp_pontos):

    os.remove(temp_pontos)


# ==========================================================
# EXTRAIR PONNOT SOMENTE DA AREA
# ==========================================================

print("==========================================================")
print("EXTRAINDO PONNOT DA AREA DO ALIMENTADOR")
print("==========================================================")
print()

print("Isso evita consultar os 2,4 milhoes de pontos.")
print()


comando = [

    OGR2OGR,

    "-f",
    "GeoJSON",

    temp_pontos,

    gdb,

    "PONNOT",

    "-spat",
    str(minx),
    str(miny),
    str(maxx),
    str(maxy),

    "-t_srs",
    "EPSG:4326",

    "-lco",
    "RFC7946=YES"
]


print("Executando GDAL...")
print()


resultado = subprocess.run(
    comando,
    capture_output=True,
    text=True,
    encoding="utf-8",
    errors="replace"
)


if resultado.stdout:
    print(resultado.stdout)


if resultado.stderr:
    print(resultado.stderr)


if resultado.returncode != 0:

    print()
    print("ERRO ao extrair PONNOT.")
    print()

    sys.exit(1)


if not os.path.exists(temp_pontos):

    print()
    print("ERRO: arquivo temporario PONNOT nao foi criado.")
    print()

    sys.exit(1)


# ==========================================================
# CARREGAR PONNOT TEMPORARIO
# ==========================================================

print()
print("Carregando PONNOT da area...")
print()


with open(
    temp_pontos,
    "r",
    encoding="utf-8"
) as f:

    ponnot = json.load(f)


pontos_area = ponnot.get("features", [])


print(
    f"Pontos encontrados na area: {len(pontos_area)}"
)


# ==========================================================
# FILTRAR COD_ID
# ==========================================================

print()
print("Filtrando COD_ID...")
print()


pontos_filtrados = []


for feature in pontos_area:

    props = feature.get("properties", {})

    codigo = props.get("COD_ID")

    if codigo is None:
        continue

    codigo = str(codigo).strip()


    if codigo in codigos:

        pontos_filtrados.append(feature)


print(
    f"Pontos correspondentes: {len(pontos_filtrados)}"
)


# ==========================================================
# CRIAR GEOJSON FINAL
# ==========================================================

geojson_final = {

    "type": "FeatureCollection",

    "features": pontos_filtrados
}


# ==========================================================
# SALVAR
# ==========================================================

print()
print("Gerando arquivo final...")
print()


with open(
    saida,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        geojson_final,
        f,
        ensure_ascii=False
    )


# ==========================================================
# REMOVER TEMPORARIO
# ==========================================================

if os.path.exists(temp_pontos):

    os.remove(temp_pontos)


# ==========================================================
# RESULTADO
# ==========================================================

print()
print("==========================================================")
print("PONTOS PONNOT EXTRAIDOS COM SUCESSO")
print("==========================================================")
print()

print(f"Trechos: {len(features)}")

print(f"COD_ID necessarios: {len(codigos)}")

print(f"Pontos na area: {len(pontos_area)}")

print(f"Pontos correspondentes: {len(pontos_filtrados)}")

print()

print("Arquivo final:")

print(saida)

print()