/**
 * Guizao do Corte - Repositorio de agendamentos (SQLite).
 */
"use strict";

const db = require("./conexao");

/**
 * Insere reserva na mesma transação que procura sobreposição; isso evita dupla reserva.
 *
 * @param {object} dados - IDs e intervalo calculados pelo serviço
 * @returns {object} Reserva gravada
 * @throws {Error} Status 409 se horário conflita ou falha SQLite
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
 * Retorna somente intervalos ocupados para não expor identidade de clientes.
 *
 * @param {string} data - Dia AAAA-MM-DD
 * @returns {object[]} Intervalos indisponíveis
 * @throws {Error} Falha de consulta SQLite
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
 * Filtra pelo identificador autenticado no próprio SQL para evitar IDOR.
 *
 * @param {number} usuarioId - ID do JWT
 * @param {string} papel - Papel conferido pelo middleware
 * @returns {object[]} Reservas autorizadas
 * @throws {Error} Falha de consulta SQLite
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
 * Verifica titularidade e status na mesma instrução UPDATE, impedindo cancelar reserva alheia.
 *
 * @param {number} id - ID da reserva
 * @param {number} usuarioId - ID do JWT
 * @param {string} papel - Papel conferido pelo middleware
 * @returns {boolean} Verdadeiro se uma linha foi alterada
 * @throws {Error} Falha de escrita SQLite
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
