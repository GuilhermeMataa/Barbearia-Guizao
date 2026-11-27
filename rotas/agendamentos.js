
/**
 * Guizao do Corte - Rotas de agendamentos.
 */

"use strict";

const express = require("express");

const {
    exigirAutenticacao
} = require("../middlewares/autenticacao");

const {
    criarAgendamento, 
    listarAgendamentos
} = require("../servicos/agendamentosService");

const router = express.Router();


// GET /api/agendamentos
// Cliente ve somente as proprias reservas.
// Administrador ve todas as reservas.
router.get(
    "/",
    exigirAutenticacao,
    (req, res, next) => {
        try {
            const reservas = listarAgendamentos(
                req.usuario
            );

            return res.status(200).json(reservas);

        } catch (erro) {
            return next(erro);
        }
    }
);


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
