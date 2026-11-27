
/**
 * cadastrarCliente: Documenta a operação da camada e as garantias aplicadas.
 *
 * @param {{nome:string,email:string,senhaHash:string}} dados - Cliente já validado e senha em hash.
 * @returns {object} Usuário persistido sem hash de senha.
 * @throws {Error} Restrição UNIQUE do e-mail ou falha SQLite.
 */
function cadastrarCliente(dados) {
    const resultado = db.prepare(`
        INSERT INTO usuarios (
            nome,
            email,
            senha_hash,
            papel
        )
        VALUES (?, ?, ?, 'cliente')
    `).run(
        dados.nome,
        dados.email,
        dados.senhaHash
    );

    return buscarPorId(Number(resultado.lastInsertRowid));
}

module.exports = {
    buscarPorEmail,
    buscarPorId,
    cadastrarCliente
};
