import json
import subprocess
import sys
import os


# ==========================================================
# ARGUMENTOS
# ==========================================================

if len(sys.argv) != 4:
    print()
    print("Uso:")
    print(
        "py extrair_ponnot_cmg01c4.py "
        "arquivo.gdb trechos.geojson saida.geojson"
    )
    print()
    sys.exit(1)


gdb = sys.argv[1]
arquivo_ssdmt = sys.argv[2]
arquivo_saida = sys.argv[3]


# ==========================================================
# GDAL
# ==========================================================

GDAL = r"C:\Users\vitor\AppData\Local\Programs\OSGeo4W\bin\ogr2ogr.exe"


if not os.path.exists(GDAL):
    print()
    print("ERRO: ogr2ogr.exe nao encontrado.")
    print(GDAL)
    print()
    sys.exit(1)


# ==========================================================
# CARREGAR SSDMT
# ==========================================================

print("Carregando SSDMT...")

try:

    with open(
        arquivo_ssdmt,
        "r",
        encoding="utf-8"
    ) as f:

        ssdmt = json.load(f)

except Exception as erro:

    print()
    print("ERRO ao abrir SSDMT:")
    print(erro)
    print()

    sys.exit(1)


features = ssdmt.get("features", [])


print(f"Trechos encontrados: {len(features)}")


# ==========================================================
# EXTRAIR PN_CON
# ==========================================================

codigos = set()


for feature in features:

    props = feature.get("properties", {})

    pn1 = props.get("PN_CON_1")
    pn2 = props.get("PN_CON_2")

    if pn1:
        codigos.add(str(pn1).strip())

    if pn2:
        codigos.add(str(pn2).strip())


print(
    f"Pontos/conexoes necessarios: {len(codigos)}"
)


# ==========================================================
# MOSTRAR ALGUNS EXEMPLOS
# ==========================================================

print()
print("Exemplos de COD_ID:")

for codigo in sorted(codigos)[:10]:

    print(
        f"- {codigo}"
    )


# ==========================================================
# CRIAR WHERE
# ==========================================================

condicoes = []

for codigo in codigos:

    codigo = codigo.replace(
        "'",
        "''"
    )

    condicoes.append(
        f"COD_ID = '{codigo}'"
    )


where = " OR ".join(condicoes)


# ==========================================================
# EXECUTAR OGR2OGR
# ==========================================================

print()
print("Extraindo PONNOT...")
print()

comando = [
    GDAL,

    "-f",
    "GeoJSON",

    arquivo_saida,

    gdb,

    "PONNOT",

    "-where",
    where,

    "-t_srs",
    "EPSG:4326",

    "-lco",
    "RFC7946=YES"
]


print("Executando ogr2ogr...")
print()


resultado = subprocess.run(
    comando,
    capture_output=True,
    text=True
)


# ==========================================================
# MOSTRAR SAIDA GDAL
# ==========================================================

if resultado.stdout:

    print(resultado.stdout)


if resultado.stderr:

    print(resultado.stderr)


# ==========================================================
# VERIFICAR ERRO
# ==========================================================

if resultado.returncode != 0:

    print()
    print("==========================================================")
    print("ERRO NO OGR2OGR")
    print("==========================================================")
    print()

    print(
        f"Codigo de retorno: {resultado.returncode}"
    )

    print()

    sys.exit(
        resultado.returncode
    )


# ==========================================================
# VERIFICAR ARQUIVO
# ==========================================================

if not os.path.exists(arquivo_saida):

    print()
    print("ERRO:")
    print("Arquivo PONNOT nao foi criado.")
    print()

    sys.exit(1)


# ==========================================================
# LER RESULTADO
# ==========================================================

print()
print("PONNOT criado com sucesso!")
print()

try:

    with open(
        arquivo_saida,
        "r",
        encoding="utf-8"
    ) as f:

        resultado_geojson = json.load(f)

except Exception as erro:

    print("ERRO ao ler GeoJSON criado:")
    print(erro)

    sys.exit(1)


pontos = resultado_geojson.get(
    "features",
    []
)


print(
    f"Pontos encontrados: {len(pontos)}"
)


# ==========================================================
# COMPARAR IDS
# ==========================================================

ids_encontrados = set()


for feature in pontos:

    props = feature.get(
        "properties",
        {}
    )

    codigo = props.get(
        "COD_ID"
    )

    if codigo:

        ids_encontrados.add(
            str(codigo).strip()
        )


faltantes = codigos - ids_encontrados


print(
    f"COD_ID correspondentes: "
    f"{len(ids_encontrados)}"
)


print(
    f"COD_ID sem ponto: "
    f"{len(faltantes)}"
)


# ==========================================================
# MOSTRAR FALTANTES
# ==========================================================

if faltantes:

    print()
    print(
        "Alguns COD_ID nao foram encontrados:"
    )

    for codigo in sorted(
        faltantes
    )[:30]:

        print(
            f"- {codigo}"
        )


# ==========================================================
# FINAL
# ==========================================================

print()
print("==========================================================")
print("EXTRACAO PONNOT CONCLUIDA")
print("==========================================================")
print()

print(
    f"Arquivo criado:\n{arquivo_saida}"
)

print()