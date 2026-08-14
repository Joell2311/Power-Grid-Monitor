// ======================================================
// REPOSITÓRIO DE ALIMENTADORES
// ======================================================

import { alimentadores } from "../database/alimentadores";


class AlimentadoresRepository {

    listar() {

        return alimentadores;

    }


    buscarPorId(id) {

        return alimentadores.find(
            item => item.id === id
        );

    }


    buscarPorCodigo(codigo) {

        return alimentadores.find(
            item => item.codigo === codigo
        );

    }


    buscarPorSubestacao(subestacao) {

        return alimentadores.filter(
            item => item.subestacao === subestacao
        );

    }

}


export default new AlimentadoresRepository();