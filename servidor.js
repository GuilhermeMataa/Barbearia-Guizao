
/**
 * Guizao do Corte - Servidor HTTP.
 * Ponto de entrada da API e do frontend.
 */

"use strict";

const path = require("node:path");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();
const PORTA = Number(process.env.PORT) || 3000;

// Protecoes basicas.
app.use(helmet());

app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-8",
    legacyHeaders: false
}));

// Permite receber requisicoes JSON.
app.use(express.json({ limit: "10kb" }));

// Rota para verificar se a API funciona.
app.get("/api/saude", (req, res) => {
    res.status(200).json({
        sucesso: true,
        mensagem: "API Guizao do Corte funcionando!"
    });
});

// Disponibiliza o frontend existente.
app.use(express.static(
    path.join(__dirname, "publico")
));

// Resposta para rotas desconhecidas.
app.use((req, res) => {
    res.status(404).json({
        erro: "Rota nao encontrada."
    });
});

// Tratamento centralizado de erros.
app.use((erro, req, res, next) => {
    console.error(erro);

    const status = erro.status === 400 ? 400 : 500;

    res.status(status).json({
        erro: status === 400
            ? "Requisicao invalida."
            : "Erro interno do servidor."
    });
});

// Inicia o servidor.
app.listen(PORTA, () => {
    console.log(
        `Guizao do Corte: http://localhost:${PORTA}`
    );
});
