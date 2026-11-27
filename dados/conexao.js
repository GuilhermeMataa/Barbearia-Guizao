
/**
 * Guizao do Corte - Conexao com o banco SQLite.
 * Camada: dados.
 * Centraliza a abertura e a configuracao do banco.
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");
const dotenv = require("dotenv");

// Carrega configuracoes sem colocar segredos no codigo.
dotenv.config({
    path: path.join(__dirname, "..", ".env")
});

// Usa o caminho configurado ou o banco padrao.
const arquivoBanco =
    process.env.DB_PATH || "dados/barbearia.sqlite";

const caminhoBanco = path.resolve(
    __dirname,
    "..",
    arquivoBanco
);

// Garante que a pasta do banco exista.
fs.mkdirSync(path.dirname(caminhoBanco), {
    recursive: true
});

// Abre o arquivo SQLite.
const db = new Database(caminhoBanco);

// No SQLite, as chaves estrangeiras precisam
// ser habilitadas em cada conexao.
db.pragma("foreign_keys = ON");

// Compartilha a conexao com os outros arquivos.
module.exports = db;
