
/**
 * Guizao do Corte - Teste das consultas SQL.
 */

"use strict";

const db = require("../dados/conexao");

const {
    listarAgendamentos,
    resumoServicos
} = require("../dados/consultas");

try {
    console.log("\n=== AGENDAMENTOS ===");

    const agendamentos = listarAgendamentos();

    if (agendamentos.length === 0) {
        console.log("Nenhum agendamento cadastrado.");
    } else {
        console.table(agendamentos);
    }

    console.log("\n=== RESUMO DOS SERVICOS ===");

    const resumo = resumoServicos();

    console.table(resumo);

    console.log("\nConsultas executadas com sucesso!");

} catch (erro) {
    console.error("Erro nas consultas:", erro.message);
    process.exitCode = 1;

} finally {
    db.close();
}

