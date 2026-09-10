// ======================================================
// REPOSITÓRIO DE EQUIPAMENTOS
// COI Monitor
// ======================================================

import { equipamentos } from "../database/equipamentos";


class EquipamentosRepository {


    listar() {

        return equipamentos;

    }


    buscarPorId(id) {

        return equipamentos.find(
            equipamento => equipamento.id === id
        );

    }


    buscarPorCodigo(codigo) {

        return equipamentos.find(
            equipamento => equipamento.codigo === codigo
        );

    }


    buscarPorTipo(tipo) {

        return equipamentos.filter(
            equipamento => equipamento.tipo === tipo
        );

    }


    buscarPorAlimentador(alimentador) {

        return equipamentos.filter(
            equipamento => equipamento.alimentador === alimentador
        );

    }


}


export default new EquipamentosRepository();