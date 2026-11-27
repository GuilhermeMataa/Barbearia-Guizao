
/**
 * Guizao do Corte - Rotas de autenticacao.
 */

"use strict";

const express = require("express");
const { rateLimit } = require("express-rate-limit");

const autenticacaoService = require(
    "../servicos/autenticacaoService"
);

const {
    exigirAutenticacao
} = require("../middlewares/autenticacao");

const router = express.Router();

const limitarLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        erro: "Muitas tentativas de login. Tente depois."
    }
});

const limitarCadastro = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        erro: "Muitas tentativas de cadastro. Tente depois."
    }
});

// POST /api/auth/cadastro
router.post(
    "/cadastro",
    limitarCadastro,
    async (req, res, next) => {
        try {
            const usuario =
                await autenticacaoService.cadastrarCliente(
                    req.body
                );

            return res.status(201).json({
                mensagem: "Conta criada com sucesso!",
                usuario
            });

        } catch (erro) {
            if (
                erro.status === 400 ||
                erro.status === 409
            ) {
                return res.status(erro.status).json({
                    erro: erro.message
                });
            }

            return next(erro);
        }
    }
);

// POST /api/auth/login
router.post(
    "/login",
    limitarLogin,
    async (req, res, next) => {
        try {
            const { email, senha } = req.body || {};

            if (
                typeof email !== "string" ||
                !email.trim() ||
                email.length > 254 ||
                typeof senha !== "string" ||
                !senha ||
                Buffer.byteLength(senha, "utf8") > 72
            ) {
                return res.status(400).json({
                    erro: "Email ou senha invalidos."
                });
            }

            const resultado =
                await autenticacaoService.fazerLogin(
                    email,
                    senha
                );

            if (!resultado) {
                return res.status(401).json({
                    erro: "Email ou senha incorretos."
                });
            }

            return res.status(200).json(resultado);

        } catch (erro) {
            return next(erro);
        }
    }
);

// GET /api/auth/me
router.get(
    "/me",
    exigirAutenticacao,
    (req, res) => {
        return res.status(200).json(req.usuario);
    }
);

module.exports = router;
