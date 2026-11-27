
/**
 * Guizao do Corte - Repositorio de usuarios.
 * Camada: dados.
 */

"use strict";

const db = require("./conexao");

/**
 * Busca usuario pelo email para autenticar.
 * @param {string} email
 * @returns {object|undefined}
 */
function buscarPorEmail(email) {
    return db.prepare(`
        SELECT id, nome, email, senha_hash, papel
        FROM usuarios
        WHERE email = ?
    `).get(email);
}

/**
 * Busca usuario pelo ID sem retornar a senha.
 * @param {number} id
 * @returns {object|undefined}
 */
function buscarPorId(id) {
    return db.prepare(`
        SELECT id, nome, email, papel
        FROM usuarios
        WHERE id = ?
    `).get(id);
}

module.exports = {
    buscarPorEmail,
    buscarPorId
};
