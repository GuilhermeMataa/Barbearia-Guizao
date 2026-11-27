
/**
 * Guizao do Corte - Rotas de agendamentos.
 */

"use strict";

const express = require("express");

const {
    exigirAutenticacao
} = require("../middlewares/autenticacao");

const {
    criarAgendamento
} = require("../servicos/agendamentosService");

const router = express.Router();

// POST /api/agendamentos
// O cliente precisa estar autenticado.
router.post(
    "/",
    exigirAutenticacao,
    (req, res, next) => {
        try {
            const agendamento = criarAgendamento(
                req.usuario.id,
                req.body
            );

            return res.status(201).json(agendamento);

        } catch (erro) {
            if ([400, 401, 404, 409].includes(erro.status)) {
                return res.status(erro.status).json({
                    erro: erro.message
                });
            }

            return next(erro);
        }
    }
);

module.exports = router;
