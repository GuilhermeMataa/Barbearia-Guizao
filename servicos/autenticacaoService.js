
/**
 * Guizao do Corte - Autenticacao de usuarios.
 * Camada de regras de negocio.
 */

"use strict";

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const usuarios = require("../dados/repositorioUsuarios");

/**
 * Verifica as credenciais e gera um token JWT.
 *
 * @param {string} email
 * @param {string} senha
 * @returns {Promise<object|null>}
 */
async function fazerLogin(email, senha) {
    const usuario = usuarios.buscarPorEmail(
        email.trim().toLowerCase()
    );

    if (!usuario) {
        return null;
    }

    const senhaCorreta = await bcrypt.compare(
        senha,
        usuario.senha_hash
    );

    if (!senhaCorreta) {
        return null;
    }

    const token = jwt.sign(
        {},
        process.env.JWT_SECRET,
        {
            subject: String(usuario.id),
            algorithm: "HS256",
            expiresIn: "2h",
            issuer: "guizao-do-corte",
            audience: "guizao-api"
        }
    );

    return {
        token,
        tipo: "Bearer",
        expira_em: "2h",
        usuario: {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            papel: usuario.papel
        }
    };
}

module.exports = { fazerLogin };
