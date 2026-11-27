
/**
 * Guizao do Corte - Consultas do banco de dados.
 * Camada: dados.
 *
 * Contem consultas com JOIN e agregacao.
 */

"use strict";

const db = require("./conexao");

/**
 * Lista os agendamentos com o nome do cliente
 * e o nome do servico contratado.
 *
 * @returns {Array<object>} Lista de agendamentos.
 */
function listarAgendamentos() {
    const sql = `
        SELECT
            a.id,
            u.nome AS cliente,
            s.nome AS servico,
            a.inicio,
            a.fim,
            a.status
        FROM agendamentos AS a
        INNER JOIN usuarios AS u
            ON u.id = a.usuario_id
        INNER JOIN servicos AS s
            ON s.id = a.servico_id
        ORDER BY a.inicio ASC
    `;

    return db.prepare(sql).all();
}

/**
 * Conta os agendamentos nao cancelados
 * de cada servico, incluindo servicos sem reservas.
 *
 * @returns {Array<object>} Resumo por servico.
 */
function resumoServicos() {
    const sql = `
        SELECT
            s.id,
            s.nome AS servico,
            COUNT(a.id) AS total_agendamentos
        FROM servicos AS s
        LEFT JOIN agendamentos AS a
            ON a.servico_id = s.id
            AND a.status != 'cancelado'
        GROUP BY
            s.id,
            s.nome
        ORDER BY
            s.nome ASC
    `;

    return db.prepare(sql).all();
}

module.exports = {
    listarAgendamentos,
    resumoServicos
};
    