import { executarMotorCOI } from "./motorCOIService";

export function sugerirRecomposicao(ocorrencia) {

    if (!ocorrencia) {
        return null;
    }

    return executarMotorCOI(ocorrencia);

}