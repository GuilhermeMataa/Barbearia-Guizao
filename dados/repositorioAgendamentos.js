/**
 * Guizao do Corte - Repositorio de agendamentos (SQLite).
 */
"use strict";

const db = require("./conexao");

/**
 * Cria um agendamento atomicamente e rejeita qualquer sobreposicao.
 * @param {{usuarioId:number, servicoId:number, inicio:string, fim:string}} dados
 * @returns {object}
 */
function criar(dados) {
    const transacao = db.transaction(() => {
        const conflito = db.prepare(`
            SELECT id
            FROM agendamentos
            WHERE status = 'agendado'
              AND inicio < ?
              AND fim > ?
            LIMIT 1
        `).get(dados.fim, dados.inicio);

        if (conflito) {
            const erro = new Error("Esse horario ja esta ocupado.");
            erro.status = 409;
            throw erro;
        }

        const resultado = db.prepare(`
            INSERT INTO agendamentos (
                usuario_id, servico_id, inicio, fim, status
            ) VALUES (?, ?, ?, ?, 'agendado')
        `).run(
            dados.usuarioId,
            dados.servicoId,
            dados.inicio,
            dados.fim
        );

        return db.prepare(`
            SELECT
                a.id,
                a.usuario_id,
                a.servico_id,
                s.nome AS servico,
                a.inicio,
                a.fim,
                a.status
            FROM agendamentos AS a
            INNER JOIN servicos AS s ON s.id = a.servico_id
            WHERE a.id = ?
        `).get(Number(resultado.lastInsertRowid));
    });

    return transacao.immediate();
}

/**
 * Retorna apenas intervalos ocupados, sem dados dos clientes.
 * @param {string} data Data no formato AAAA-MM-DD
 * @returns {{inicio:string, fim:string}[]}
 */
function listarOcupadosNoDia(data) {
    return db.prepare(`
        SELECT inicio, fim
        FROM agendamentos
        WHERE status = 'agendado'
          AND inicio < ?
          AND fim > ?
        ORDER BY inicio ASC
    `).all(`${data} 23:59:59`, `${data} 00:00:00`);
}

/**
 * Admin ve todos; cliente ve apenas seus proprios agendamentos.
 */
function listarVisiveis(usuarioId, papel) {
    const ehAdmin = papel === "admin" ? 1 : 0;

    return db.prepare(`
        SELECT
            a.id,
            a.usuario_id,
            u.nome AS cliente,
            a.servico_id,
            s.nome AS servico,
            a.inicio,
            a.fim,
            a.status
        FROM agendamentos AS a
        INNER JOIN usuarios AS u ON u.id = a.usuario_id
        INNER JOIN servicos AS s ON s.id = a.servico_id
        WHERE a.usuario_id = ? OR ? = 1
        ORDER BY a.inicio ASC, a.id ASC
    `).all(usuarioId, ehAdmin);
}

/**
 * Cancela somente agendamentos visiveis ao usuario.
 */
function cancelarVisivel(id, usuarioId, papel) {
    const ehAdmin = papel === "admin" ? 1 : 0;

    const resultado = db.prepare(`
        UPDATE agendamentos
        SET status = 'cancelado'
        WHERE id = ?
          AND status = 'agendado'
          AND (usuario_id = ? OR ? = 1)
    `).run(id, usuarioId, ehAdmin);

    return resultado.changes === 1;
}

module.exports = {
    criar,
    listarOcupadosNoDia,
    listarVisiveis,
    cancelarVisivel
};
