
/**
 * Guizao do Corte - Inicializacao do banco.
 * Camada: infraestrutura de dados.
 * Executa o schema.sql e verifica as tabelas criadas.
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const db = require("./dados/conexao");

const caminhoSchema = path.join(
    __dirname,
    "dados",
    "schema.sql"
);

try {
    // O SQL vem de um arquivo local controlado
    // pelo projeto, nunca da entrada do usuario.
    const sql = fs.readFileSync(
        caminhoSchema,
        "utf8"
    );

    db.exec(sql);

    const tabelas = db.prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name
    `).all();

    console.log("Banco inicializado com sucesso!");

    console.log("Tabelas encontradas:");

    tabelas.forEach((tabela) => {
        console.log("- " + tabela.name);
    });

} catch (erro) {
    console.error(
        "Erro ao inicializar o banco:",
        erro.message
    );

    process.exitCode = 1;

} finally {
    db.close();
}
