
/**
 * atualizar: Documenta a operação da camada e as garantias aplicadas.
 *
 * @param {number} id - Identificador do serviço.
 * @param {object} dados - Valores já validados.
 * @returns {object|undefined} Serviço atualizado ou undefined.
 * @throws {Error} Restrições SQLite, inclusive nome UNIQUE.
 */
function atualizar(id, dados) {
    const resultado = db.prepare(`
        UPDATE servicos
        SET nome = ?,
            descricao = ?,
            duracao_minutos = ?,
            preco_centavos = ?
        WHERE id = ?
          AND ativo = 1
    `).run(
        dados.nome,
        dados.descricao,
        dados.duracao_minutos,
        dados.preco_centavos,
        id
    );

    if (resultado.changes === 0) {
        return undefined;
    }

    return buscarAtivoPorId(id);
}


module.exports = {
    listarAtivos,
    buscarAtivoPorId,
    cadastrar,
    atualizar,
    desativar
};