
/**
 * Guizao do Corte - Rotas de servicos.
 * Camada de rotas HTTP.
 */

"use strict";

const express = require("express");

const servicosService = require(
    "../servicos/servicosService"
);

const {
    exigirAutenticacao,
    exigirAdmin
} = require("../middlewares/autenticacao");

const router = express.Router();

// ==========================================
// GET /api/servicos
// Lista os servicos ativos.
// ==========================================
router.get("/", (req, res, next) => {
    try {
        const servicos =
            servicosService.listarServicos();

        return res.status(200).json(servicos);

    } catch (erro) {
        next(erro);
    }
});

// ==========================================
// POST /api/servicos
// Somente administradores.
// ==========================================
router.post(
    "/",
    exigirAutenticacao,
    exigirAdmin,
    (req, res, next) => {
        try {
            const novoServico =
                servicosService.cadastrarServico(
                    req.body
                );

            res.location(
                `/api/servicos/${novoServico.id}`
            );

            return res.status(201).json(
                novoServico
            );

        } catch (erro) {
            if (
                erro.status === 400 ||
                erro.status === 409
            ) {
                return res.status(erro.status).json({
                    erro: erro.message
                });
            }

            next(erro);
        }
    }
);

// ==========================================
// GET /api/servicos/:id
// Consulta um servico pelo ID.
// ==========================================
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

// ==========================================
// DELETE /api/servicos/:id
// Somente administradores.
// Realiza exclusao logica.
// ==========================================
router.delete(
    "/:id",
    exigirAutenticacao,
    exigirAdmin,
    (req, res, next) => {
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

            const desativado =
                servicosService.desativarServico(id);

            if (!desativado) {
                return res.status(404).json({
                    erro: "Servico nao encontrado."
                });
            }

            // HTTP 204 nao retorna conteudo.
            return res.status(204).send();

        } catch (erro) {
            return next(erro);
        }
    }
);


// PUT /api/servicos/:id
// Somente administradores podem editar.
router.put(
    "/:id",
    exigirAutenticacao,
    exigirAdmin,
    (req, res, next) => {
        try {
            const idTexto = req.params.id;

            if (!/^[1-9]\d*$/.test(idTexto)) {
                return res.status(400).json({
                    erro: "ID invalido."
                });
            }

            const id = Number(idTexto);

            if (!Number.isSafeInteger(id)) {
                return res.status(400).json({
                    erro: "ID invalido."
                });
            }

            const atualizado =
                servicosService.atualizarServico(
                    id,
                    req.body
                );

            if (!atualizado) {
                return res.status(404).json({
                    erro: "Servico nao encontrado."
                });
            }

            return res.status(200).json(atualizado);

        } catch (erro) {
            if (erro.status === 400 || erro.status === 409) {
                return res.status(erro.status).json({
                    erro: erro.message
                });
            }

            return next(erro);
        }
    }
);

module.exports = router;
