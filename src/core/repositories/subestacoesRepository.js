import { subestacoes } from "../database/subestacoes";


class SubestacoesRepository {

    listar() {
        return subestacoes;
    }

    buscarPorId(id) {
        return subestacoes.find(item => item.id === id);
    }

    buscarPorCodigo(codigo) {
        return subestacoes.find(item => item.codigo === codigo);
    }
}

export default new SubestacoesRepository();