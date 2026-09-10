const CAMINHO_CMG01C4 = "/data/bdgd/CMG01C4.geojson";

/**
 * Converte a geometria MultiLineString da BDGD
 * para o formato utilizado pelo Leaflet:
 *
 * [longitude, latitude]
 *        ↓
 * [latitude, longitude]
 */
function converterGeometria(geometry) {

    if (!geometry) {
        return [];
    }

    if (geometry.type === "MultiLineString") {

        return geometry.coordinates.map(
            linha =>
                linha.map(
                    ([longitude, latitude]) => [
                        latitude,
                        longitude
                    ]
                )
        );

    }

    if (geometry.type === "LineString") {

        return [
            geometry.coordinates.map(
                ([longitude, latitude]) => [
                    latitude,
                    longitude
                ]
            )
        ];

    }

    return [];
}


/**
 * Converte um Feature da BDGD
 * para o modelo de trecho utilizado
 * pelo COI Monitor.
 */
function normalizarTrecho(feature) {

    const p = feature.properties || {};

    return {

        id: String(p.COD_ID),

        codId: String(p.COD_ID),

        alimentador: p.CT_COD_OP,

        origem: p.PN_CON_1
            ? String(p.PN_CON_1)
            : null,

        destino: p.PN_CON_2
            ? String(p.PN_CON_2)
            : null,

        circuito: p.CTMT,

        subestacao: p.SUB,

        fases: p.FAS_CON,

        tipoInstalacao: p.TIP_INST,

        tipoCondutor: p.TIP_CND,

        posicao: p.POS,

        comprimento: Number(p.COMP) || 0,

        geometria: converterGeometria(
            feature.geometry
        ),

        estadoRede: "NORMAL",

        correnteAtual: 0,

        interligacao: false

    };

}


/**
 * Carrega o alimentador CMG01C4
 * diretamente do GeoJSON.
 */
export async function carregarTrechosCMG01C4() {

    const resposta = await fetch(
        CAMINHO_CMG01C4
    );

    if (!resposta.ok) {

        throw new Error(
            `Erro ao carregar BDGD: ${resposta.status}`
        );

    }

    const geojson =
        await resposta.json();

    if (
        !geojson.features ||
        !Array.isArray(
            geojson.features
        )
    ) {

        throw new Error(
            "GeoJSON da BDGD não possui features válidas."
        );

    }

    return geojson.features.map(
        normalizarTrecho
    );

}


export {
    normalizarTrecho,
    converterGeometria
};