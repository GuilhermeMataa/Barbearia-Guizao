
/**
 * Guizao do Corte - Repositorio de servicos.
 * Camada de acesso ao banco SQLite.
 */

"use strict";

const db = require("./conexao");

/**
 * Lista os servicos ativos.
 * @returns {Array<object>}
 */
function listarAtivos() {
    return db.prepare(`
        SELECT
            id,
            nome,
            descricao,
            duracao_minutos,
            preco_centavos
        FROM servicos
        WHERE ativo = 1
        ORDER BY nome ASC
    `).all();
}

/**
 * Busca um servico ativo pelo ID.
 * @param {number} id
 * @returns {object|undefined}
 */
function buscarAtivoPorId(id) {
    return db.prepare(`
        SELECT
            id,
            nome,
            descricao,
            duracao_minutos,
            preco_centavos
        FROM servicos
        WHERE id = ?
          AND ativo = 1
    `).get(id);
}

/**
 * Insere um servico no banco e retorna o registro.
 * Utiliza SQL parametrizado para evitar injecao SQL.
 *
 * @param {object} dados
 * @returns {object}
 */
function cadastrar(dados) {
    const sql = `
        INSERT INTO servicos (
            nome,
            descricao,
            duracao_minutos,
            preco_centavos
        )
        VALUES (?, ?, ?, ?)
    `;

    const resultado = db.prepare(sql).run(
        dados.nome,
        dados.descricao,
        dados.duracao_minutos,
        dados.preco_centavos
    );

    const id = Number(resultado.lastInsertRowid);

    return buscarAtivoPorId(id);
}

module.exports = {
    listarAtivos,
    buscarAtivoPorId,
    cadastrar
};
