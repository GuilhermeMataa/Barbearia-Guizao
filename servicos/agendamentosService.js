/**
 * cancelarAgendamento: Documenta a operação da camada e as garantias aplicadas.
 *
 * @param {number} id - Identificador do agendamento.
 * @param {{id:number,papel:string}} usuario - Usuário autenticado.
 * @returns {boolean} Verdadeiro se uma reserva autorizada foi cancelada.
 * @throws {Error} HTTP 400 para identificador inválido e 401 sem autenticação.
 */
function cancelarAgendamento(id, usuario) {
    if (
        !usuario ||
        !Number.isSafeInteger(usuario.id) ||
        !["cliente", "admin"].includes(usuario.papel)
    ) {
        throw erroHttp(401, "Usuario nao autenticado.");
    }
    if (!Number.isSafeInteger(id) || id <= 0) {
        throw erroHttp(400, "ID do agendamento invalido.");
    }

    return agendamentos.cancelarVisivel(id, usuario.id, usuario.papel);
}

module.exports = {
    criarAgendamento,
    consultarDisponibilidade,
    listarAgendamentos,
    cancelarAgendamento
};
