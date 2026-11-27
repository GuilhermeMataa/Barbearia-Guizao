
/**
 * Guizao do Corte - Repositorio de servicos.
 * Camada de acesso ao banco SQLite.
 */

"use strict";

const db = require("./conexao");

/**
 * Retorna apenas catálogo ativo.
 *
 * @returns {object[]} Serviços visíveis
 * @throws {Error} Falha de leitura SQLite
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
 * Obtém serviço ativo por ID parametrizado.
 *
 * @param {number} id - ID do serviço
 * @returns {object|undefined} Serviço ou ausência
 * @throws {Error} Falha de leitura SQLite
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
 * Persiste serviço validado sem SQL concatenado.
 *
 * @param {object} dados - Serviço normalizado pelo serviço de negócio
 * @returns {object} Serviço criado
 * @throws {Error} Restrição UNIQUE ou falha SQLite
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


/**
 * Marca serviço como inativo sem apagar histórico.
 *
 * @param {number} id - ID do serviço
 * @returns {boolean} Confirmação da alteração
 * @throws {Error} Falha de atualização SQLite
 */
function desativar(id) {
    const resultado = db.prepare(`
        UPDATE servicos
        SET ativo = 0
        WHERE id = ?
          AND ativo = 1
    `).run(id);

    return resultado.changes === 1;
}


/**
 * Atualiza serviço ativo com parâmetros SQL.
 *
 * @param {number} id - ID do serviço
 * @param {object} dados - Novos valores validados
 * @returns {object|undefined} Serviço atualizado
 * @throws {Error} Restrição UNIQUE ou falha SQLite
 */
function atualizar(id, dados) {
    const resultado = db.prepare(`
        UPDATE servicos
        SET nome = ?,
            descricao = ?,
            duracao_minutos = ?,
            preco_centavos = ?
        WHERE id = ?
          AND ativo = 1
    `).run(
        dados.nome,
        dados.descricao,
        dados.duracao_minutos,
        dados.preco_centavos,
        id
    );

    if (resultado.changes === 0) {
        return undefined;
    }

    return buscarAtivoPorId(id);
}


module.exports = {
    listarAtivos,
    buscarAtivoPorId,
    cadastrar,
    atualizar,
    desativar
};