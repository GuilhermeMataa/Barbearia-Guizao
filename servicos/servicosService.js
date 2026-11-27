
/**
 * Guizao do Corte - Regras de servicos.
 * Camada: servicos.
 */

"use strict";

const repositorio = require(
    "../dados/repositorioServicos"
);

/**
 * Retorna os servicos ativos da barbearia.
 *
 * @returns {Array<object>}
 */
function listarServicos() {
    return repositorio.listarAtivos();
}

/**
 * Consulta um servico ativo pelo ID.
 *
 * @param {number} id
 * @returns {object|undefined}
 */
function buscarServico(id) {
    return repositorio.buscarAtivoPorId(id);
}

module.exports = {
    listarServicos,
    buscarServico
};
