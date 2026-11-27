/**
 * cancelarVisivel: Documenta a operação da camada e as garantias aplicadas.
 *
 * @param {number} id - ID da reserva a cancelar.
 * @param {number} usuarioId - ID do usuário autenticado.
 * @param {'admin'|'cliente'} papel - Papel conferido no servidor.
 * @returns {boolean} True somente quando reserva ativa e autorizada foi alterada.
 * @throws {Error} Falha de atualização SQLite.
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
