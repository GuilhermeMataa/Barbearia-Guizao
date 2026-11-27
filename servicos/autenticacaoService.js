
/**
 * Guizao do Corte - Autenticacao e cadastro.
 */

"use strict";

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const usuarios = require("../dados/repositorioUsuarios");

function erroHttp(status, mensagem) {
    const erro = new Error(mensagem);
    erro.status = status;
    return erro;
}

/**
 * Valida e cadastra um novo cliente.
 *
 * @param {object} dados
 * @returns {Promise<object>}
 */
async function cadastrarCliente(dados) {
    if (
        !dados ||
        typeof dados !== "object" ||
        Array.isArray(dados)
    ) {
        throw erroHttp(400, "Dados de cadastro inválidos.");
    }

    const permitidos = ["nome", "email", "senha"];

    for (const campo of Object.keys(dados)) {
        if (!permitidos.includes(campo)) {
            throw erroHttp(
                400,
                `Campo não permitido: ${campo}`
            );
        }
    }

    if (typeof dados.nome !== "string") {
        throw erroHttp(400, "Informe seu nome.");
    }

    const nome = dados.nome.trim();

    if (nome.length < 2 || nome.length > 80) {
        throw erroHttp(
            400,
            "O nome deve ter de 2 a 80 caracteres."
        );
    }

    if (typeof dados.email !== "string") {
        throw erroHttp(400, "Informe seu e-mail.");
    }

    const email = dados.email.trim().toLowerCase();

    if (
        email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
        throw erroHttp(400, "E-mail inválido.");
    }

    const senha = dados.senha;

    if (
        typeof senha !== "string" ||
        senha.length < 12 ||
        Buffer.byteLength(senha, "utf8") > 72
    ) {
        throw erroHttp(
            400,
            "A senha deve ter pelo menos 12 caracteres " +
            "e no máximo 72 bytes."
        );
    }

    // Nunca guarda a senha original no SQLite.
    const senhaHash = await bcrypt.hash(senha, 12);

    try {
        return usuarios.cadastrarCliente({
            nome,
            email,
            senhaHash
        });

    } catch (erro) {
        if (erro.code === "SQLITE_CONSTRAINT_UNIQUE") {
            throw erroHttp(
                409,
                "Este e-mail já está cadastrado."
            );
        }

        throw erro;
    }
}

/**
 * Autentica usuario e gera token JWT.
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

module.exports = {
    fazerLogin,
    cadastrarCliente
};
