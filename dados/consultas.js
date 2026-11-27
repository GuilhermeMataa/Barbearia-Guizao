
/**
 * resumoServicos: Documenta a operação da camada e as garantias aplicadas.
 *
 * @returns {object[]} Quantidade de reservas não canceladas por serviço.
 * @throws {Error} Falha de consulta SQLite.
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
    