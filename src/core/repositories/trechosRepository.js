import { trechos } from "../database/trechos";

class TrechosRepository {

    listar() {
        return trechos;
    }

    buscarPorId(id) {
        return trechos.find(
            trecho => trecho.id === id
        );
    }

    buscarPorAlimentador(alimentador) {
        return trechos.filter(
            trecho =>
                trecho.alimentador === alimentador
        );
    }

    buscarInterligacoes() {
        return trechos.filter(
            trecho =>
                trecho.interligacao === true
        );
    }

}

export default new TrechosRepository();