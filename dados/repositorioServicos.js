
/**
 * Guizao do Corte - Repositorio de servicos.
 * Camada: dados.
 *
 * Responsavel pelas consultas SQL dos servicos.
 */

"use strict";

const db = require("./conexao");

/**
 * Lista todos os servicos ativos.
 *
 * @returns {Array<object>} Servicos cadastrados.
 */
function listarAtivos() {
    const sql = `
        SELECT
            id,
            nome,
            descricao,
            duracao_minutos,
            preco_centavos
        FROM servicos
        WHERE ativo = 1
        ORDER BY nome ASC
    `;

    return db.prepare(sql).all();
}

/**
 * Busca um servico ativo pelo identificador.
 *
 * @param {number} id - ID do servico.
 * @returns {object|undefined} Servico encontrado.
 */
function buscarAtivoPorId(id) {
    const sql = `
        SELECT
            id,
            nome,
            descricao,
            duracao_minutos,
            preco_centavos
        FROM servicos
        WHERE id = ?
          AND ativo = 1
    `;

    return db.prepare(sql).get(id);
}

module.exports = {
    listarAtivos,
    buscarAtivoPorId
};
