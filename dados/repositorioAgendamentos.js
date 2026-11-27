
/**
 * Guizao do Corte - Repositorio de agendamentos.
 * Camada de acesso ao SQLite.
 */

"use strict";

const db = require("./conexao");

/**
 * Salva uma reserva de forma atomica.
 * Uma transacao IMMEDIATE impede que duas reservas
 * concorrentes ocupem o mesmo intervalo.
 *
 * @param {object} dados
 * @returns {object}
 */
function criar(dados) {
    const transacao = db.transaction(() => {
        // Dois intervalos se sobrepoem quando:
        // inicioExistente < fimNovo
        // e fimExistente > inicioNovo.
        const conflito = db.prepare(`
            SELECT id
            FROM agendamentos
            WHERE status = 'agendado'
              AND inicio < ?
              AND fim > ?
            LIMIT 1
        `).get(dados.fim, dados.inicio);

        if (conflito) {
            const erro = new Error(
                "Esse horario ja esta ocupado."
            );
            erro.status = 409;
            throw erro;
        }

        const resultado = db.prepare(`
            INSERT INTO agendamentos (
                usuario_id,
                servico_id,
                inicio,
                fim,
                status
            )
            VALUES (?, ?, ?, ?, 'agendado')
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
            INNER JOIN servicos AS s
                ON s.id = a.servico_id
            WHERE a.id = ?
        `).get(Number(resultado.lastInsertRowid));
    });

    return transacao.immediate();

}


/**
 * Lista os agendamentos permitidos ao usuario.
 * O admin visualiza todos; o cliente, somente os seus.
 *
 * @param {number} usuarioId
 * @param {string} papel
 * @returns {object[]}
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
        INNER JOIN usuarios AS u
            ON u.id = a.usuario_id
        INNER JOIN servicos AS s
            ON s.id = a.servico_id
        WHERE a.usuario_id = ? OR ? = 1
        ORDER BY a.inicio ASC, a.id ASC
    `).all(usuarioId, ehAdmin);
}


/**
 * Cancela uma reserva com verificacao de permissao.
 * Cliente cancela somente a propria reserva.
 * Administrador pode cancelar qualquer reserva.
 *
 * @param {number} id
 * @param {number} usuarioId
 * @param {string} papel
 * @returns {boolean}
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


module.exports = { criar,
    listarVisiveis,
    cancelarVisivel
 };
