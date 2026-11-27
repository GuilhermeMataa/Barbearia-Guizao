
/**
 * Guizao do Corte - Repositorio de usuarios.
 */

"use strict";

const db = require("./conexao");

/**
 * Busca usuario pelo email para autenticar.
 */
function buscarPorEmail(email) {
    return db.prepare(`
        SELECT id, nome, email, senha_hash, papel
        FROM usuarios
        WHERE email = ?
    `).get(email);
}

/**
 * Busca usuario pelo ID, sem expor a senha.
 */
function buscarPorId(id) {
    return db.prepare(`
        SELECT id, nome, email, papel
        FROM usuarios
        WHERE id = ?
    `).get(id);
}

/**
 * Cadastra uma conta com papel de cliente.
 * O navegador nunca pode definir o papel.
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
