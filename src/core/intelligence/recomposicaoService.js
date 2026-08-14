import { executarMotorCOI } from "./motorCOI.js";

export function sugerirRecomposicao(ocorrencia) {

    if (!ocorrencia) {
        return null;
    }

    return executarMotorCOI(ocorrencia);

}