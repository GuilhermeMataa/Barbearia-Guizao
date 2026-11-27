
"use strict";

const jwt = require("jsonwebtoken");
const usuarios = require("../dados/repositorioUsuarios");

/**
 * Verifica se o usuario enviou um JWT valido.
 */
function exigirAutenticacao(req, res, next) {
    const autorizacao = req.headers.authorization || "";
    const partes = /^Bearer ([^\s]+)$/.exec(autorizacao);

    if (!partes) {
        return res.status(401).json({
            erro: "Autenticacao obrigatoria."
        });
    }

    try {
        const dados = jwt.verify(
            partes[1],
            process.env.JWT_SECRET,
            {
                algorithms: ["HS256"],
                issuer: "guizao-do-corte",
                audience: "guizao-api"
            }
        );

        const id = Number(dados.sub);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(401).json({
                erro: "Token invalido."
            });
        }

        const usuario = usuarios.buscarPorId(id);

        if (!usuario) {
            return res.status(401).json({
                erro: "Usuario nao encontrado."
            });
        }

        req.usuario = usuario;
        return next();

    } catch (erro) {
        if (
            erro.name === "JsonWebTokenError" ||
            erro.name === "TokenExpiredError" ||
            erro.name === "NotBeforeError"
        ) {
            return res.status(401).json({
                erro: "Token invalido ou expirado."
            });
        }

        return next(erro);
    }
}

/**
 * Permite acesso somente a administradores.
 * Usar depois de exigirAutenticacao.
 */
function exigirAdmin(req, res, next) {
    if (!req.usuario) {
        return res.status(401).json({
            erro: "Autenticacao obrigatoria."
        });
    }

    if (req.usuario.papel !== "admin") {
        return res.status(403).json({
            erro: "Acesso exclusivo de administradores."
        });
    }

    return next();
}

module.exports = {
    exigirAutenticacao,
    exigirAdmin
};
