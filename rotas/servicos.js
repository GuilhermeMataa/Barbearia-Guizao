
/**
 * Guizao do Corte - Rotas de servicos.
 * Camada: rotas.
 */

"use strict";

const express = require("express");

const servicosService = require(
    "../servicos/servicosService"
);

const router = express.Router();

// GET /api/servicos
router.get("/", (req, res, next) => {
    try {
        const servicos =
            servicosService.listarServicos();

        return res.status(200).json(servicos);

    } catch (erro) {
        next(erro);
    }
});

// GET /api/servicos/:id
router.get("/:id", (req, res, next) => {
    try {
        const idTexto = req.params.id;

        if (!/^[1-9]\d*$/.test(idTexto)) {
            return res.status(400).json({
                erro: "ID do servico invalido."
            });
        }

        const id = Number(idTexto);

        if (!Number.isSafeInteger(id)) {
            return res.status(400).json({
                erro: "ID do servico invalido."
            });
        }

        const servico =
            servicosService.buscarServico(id);

        if (!servico) {
            return res.status(404).json({
                erro: "Servico nao encontrado."
            });
        }

        return res.status(200).json(servico);

    } catch (erro) {
        next(erro);
    }
});

module.exports = router;
