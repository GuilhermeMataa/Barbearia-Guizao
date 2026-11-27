
/**
 * Guizao do Corte - Repositorio de usuarios.
 */

"use strict";

const db = require("./conexao");

/**
 * Busca hash somente para comparar senha no servidor.
 *
 * @param {string} email - E-mail normalizado
 * @returns {object|undefined} Dados internos de autenticação
 * @throws {Error} Falha de leitura SQLite
 */
function buscarPorEmail(email) {
    return db.prepare(`
        SELECT id, nome, email, senha_hash, papel
        FROM usuarios
        WHERE email = ?
    `).get(email);
}

/**
 * Obtém perfil público sem expor hash ao navegador.
 *
 * @param {number} id - ID autenticado
 * @returns {object|undefined} Perfil sem hash
 * @throws {Error} Falha de leitura SQLite
 */
function buscarPorId(id) {
    return db.prepare(`
        SELECT id, nome, email, papel
        FROM usuarios
        WHERE id = ?
    `).get(id);
}

/**
 * Grava exclusivamente papel cliente mesmo que o navegador tente indicar outro.
 *
 * @param {object} dados - Nome, e-mail e hash já calculado
 * @returns {object} Perfil salvo sem hash
 * @throws {Error} Violação de e-mail UNIQUE ou falha SQLite
 */
function cadastrarCliente(dados) {
    const resultado = db.prepare(`
        INSERT INTO usuarios (
            nome,
            email,
            senha_hash,
            papel
        )
        VALUES (?, ?, ?, 'cliente')
    `).run(
        dados.nome,
        dados.email,
        dados.senhaHash
    );

    return buscarPorId(Number(resultado.lastInsertRowid));
}

module.exports = {
    buscarPorEmail,
    buscarPorId,
    cadastrarCliente
};
