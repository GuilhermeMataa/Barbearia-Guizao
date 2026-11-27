
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

module.exports = { criar };
