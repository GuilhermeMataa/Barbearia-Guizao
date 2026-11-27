
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
    listarAgendamentos,
    cancelarAgendamento
} = require("../servicos/agendamentosService");

// O router precisa ser criado antes das rotas.
const router = express.Router();

// ==========================================
// GET /api/agendamentos
// Lista os agendamentos permitidos ao usuario.
// ==========================================
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

// ==========================================
// POST /api/agendamentos
// Cria um novo agendamento.
// ==========================================
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
            if (
                [400, 401, 404, 409].includes(
                    erro.status
                )
            ) {
                return res.status(erro.status).json({
                    erro: erro.message
                });
            }

            return next(erro);
        }
    }
);

// ==========================================
// DELETE /api/agendamentos/:id
// Cancela um agendamento com seguranca.
// ==========================================
router.delete(
    "/:id",
    exigirAutenticacao,
    (req, res, next) => {
        try {
            const idTexto = req.params.id;

            if (!/^[1-9]\d*$/.test(idTexto)) {
                return res.status(400).json({
                    erro: "ID do agendamento invalido."
                });
            }

            const id = Number(idTexto);

            if (!Number.isSafeInteger(id)) {
                return res.status(400).json({
                    erro: "ID do agendamento invalido."
                });
            }

            const cancelado = cancelarAgendamento(
                id,
                req.usuario
            );

            if (!cancelado) {
                return res.status(404).json({
                    erro: "Agendamento nao encontrado ou indisponivel para cancelamento."
                });
            }

            return res.status(204).send();

        } catch (erro) {
            return next(erro);
        }
    }
);

module.exports = router;
