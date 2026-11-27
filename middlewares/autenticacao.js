/**
 * Guizao do Corte - Autenticacao e autorizacao.
 * Camada: middlewares HTTP.
 * Valida tokens JWT e restringe rotas conforme o papel do usuario.
 */

"use strict";

const jwt = require("jsonwebtoken");
const usuarios = require("../dados/repositorioUsuarios");

/**
 * Verifica o JWT e identifica o usuario no banco de dados.
 *
 * O ID vem do token validado, nunca do corpo da requisicao.
 * A consulta ao banco impede o acesso de usuarios inexistentes.
 *
 * @param {object} req - Requisicao HTTP.
 * @param {object} res - Resposta HTTP.
 * @param {Function} next - Proximo middleware.
 * @returns {void}
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
 * Restringe o acesso a usuarios administradores.
 *
 * Deve ser utilizado depois de exigirAutenticacao.
 * A permissao e conferida no servidor, nao no frontend.
 *
 * @param {object} req - Requisicao com usuario autenticado.
 * @param {object} res - Resposta HTTP.
 * @param {Function} next - Proximo middleware.
 * @returns {void}
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