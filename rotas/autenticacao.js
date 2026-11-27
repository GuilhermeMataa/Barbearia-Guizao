
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

// POST /api/auth/login
router.post("/login", limitarLogin, async (req, res, next) => {
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
            await autenticacaoService.fazerLogin(email, senha);

        if (!resultado) {
            return res.status(401).json({
                erro: "Email ou senha incorretos."
            });
        }

        return res.status(200).json(resultado);

    } catch (erro) {
        next(erro);
    }
});

// GET /api/auth/me
router.get("/me", exigirAutenticacao, (req, res) => {
    res.status(200).json(req.usuario);
});

module.exports = router;
