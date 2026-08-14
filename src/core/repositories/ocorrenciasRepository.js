import ocorrencias from "../database/ocorrencias";

class OcorrenciasRepository {

    listar() {
        return ocorrencias;
    }

    buscarPorId(id) {
        return ocorrencias.find(item => item.id === id);
    }

    buscarPorAlimentador(alimentador) {
        return ocorrencias.filter(
            item => item.alimentador === alimentador
        );
    }

    buscarAbertas() {
        return ocorrencias.filter(
            item => item.status === "ABERTA"
        );
    }
}

export default new OcorrenciasRepository();