import  EquipamentosRepository  from "../core/repositories/equipamentosRepository";



export function buscarInterligacoes(alimentador){



return equipamentos.filter(


equipamento =>


equipamento.interligacao === true &&

equipamento.alimentador === alimentador


)

.map(equipamento => ({


id: equipamento.id,


plaqueta: equipamento.plaqueta,


pt: equipamento.pt,


tipo: equipamento.tipo,


nome: equipamento.nome,


alimentadorOrigem: equipamento.alimentador,


alimentadorDestino: equipamento.alimentadorDestino,



telecomandado: equipamento.telecomandado,



status: equipamento.status,


estadoOperacional: equipamento.estadoOperacional,



comando: equipamento.comando,



bloqueado: equipamento.bloqueado,



disponivelManobra: equipamento.disponivelManobra,



capacidade: equipamento.capacidade,



corrente: equipamento.corrente,



coordenadas: equipamento.coordenadas


}));



}