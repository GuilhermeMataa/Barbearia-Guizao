/** Guizao do Corte - Rotas de agendamentos. */
"use strict";

const express = require("express");
const { exigirAutenticacao } = require("../middlewares/autenticacao");
const {
    criarAgendamento,
    consultarDisponibilidade,
    listarAgendamentos,
    cancelarAgendamento
} = require("../servicos/agendamentosService");

const router = express.Router();

// GET /api/agendamentos/disponibilidade?data=2026-12-03&servico_id=1
// Consulta publica: somente estados dos horarios; nao divulga dados pessoais.
router.get("/disponibilidade", (req, res, next) => {
    try {
        const idTexto = req.query.servico_id;
        const id = (typeof idTexto === "string" && /^[1-9]\d*$/.test(idTexto))
            ? Number(idTexto)
            : NaN;

        if (!Number.isSafeInteger(id)) {
            return res.status(400).json({ erro: "Servico invalido." });
        }

        const resultado = consultarDisponibilidade(req.query.data, id);
        return res.set("Cache-Control", "no-store").status(200).json(resultado);
    } catch (erro) {
        if (erro.status === 400 || erro.status === 404) {
            return res.status(erro.status).json({ erro: erro.message });
        }
        return next(erro);
    }
});

// GET /api/agendamentos
router.get("/", exigirAutenticacao, (req, res, next) => {
    try {
        return res.status(200).json(listarAgendamentos(req.usuario));
    } catch (erro) {
        return next(erro);
    }
});

// POST /api/agendamentos
router.post("/", exigirAutenticacao, (req, res, next) => {
    try {
        const reserva = criarAgendamento(req.usuario.id, req.body);
        return res.status(201).json(reserva);
    } catch (erro) {
        if ([400, 401, 404, 409].includes(erro.status)) {
            return res.status(erro.status).json({ erro: erro.message });
        }
        return next(erro);
    }
});

// DELETE /api/agendamentos/:id
router.delete("/:id", exigirAutenticacao, (req, res, next) => {
    try {
        const texto = req.params.id;
        if (!/^[1-9]\d*$/.test(texto) || !Number.isSafeInteger(Number(texto))) {
            return res.status(400).json({ erro: "ID do agendamento invalido." });
        }

        const cancelado = cancelarAgendamento(Number(texto), req.usuario);
        if (!cancelado) {
            return res.status(404).json({
                erro: "Agendamento nao encontrado ou indisponivel para cancelamento."
            });
        }
        return res.status(204).send();
    } catch (erro) {
        return next(erro);
    }
});

module.exports = router;
