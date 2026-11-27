
/**
 * atualizarServico: Documenta a operação da camada e as garantias aplicadas.
 *
 * @param {number} id - Identificador do serviço.
 * @param {object} dados - Novos dados validados do serviço.
 * @returns {object|undefined} Serviço alterado ou undefined se não encontrado.
 * @throws {Error} HTTP 400 para dados inválidos e 409 para nome duplicado.
 */
function atualizarServico(id, dados) {
    const dadosValidados = validarNovoServico(dados);

    try {
        return repositorio.atualizar(
            id,
            dadosValidados
        );

    } catch (erro) {
        if (erro.code === "SQLITE_CONSTRAINT_UNIQUE") {
            throw erroHttp(
                409,
                "Ja existe um servico com esse nome."
            );
        }

        throw erro;
    }
}


module.exports = {
    listarServicos,
    buscarServico,
    cadastrarServico,
    atualizarServico,
    desativarServico
};
