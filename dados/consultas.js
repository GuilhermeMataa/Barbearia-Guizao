
/**
 * Guizao do Corte - Consultas do banco de dados.
 * Camada: dados.
 *
 * Contem consultas com JOIN e agregacao.
 */

"use strict";

const db = require("./conexao");

/**
 * Relaciona usuários, serviços e reservas com JOIN.
 *
 * @returns {object[]} Registros relacionados
 * @throws {Error} Falha SQLite
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
 * Agrega reservas por serviço usando COUNT e GROUP BY.
 *
 * @returns {object[]} Contagens de reservas
 * @throws {Error} Falha SQLite
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
    