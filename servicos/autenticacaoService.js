
/**
 * fazerLogin: Documenta a operação da camada e as garantias aplicadas.
 *
 * @param {string} email - E-mail da conta.
 * @param {string} senha - Senha digitada, verificada por bcrypt.
 * @returns {Promise<object|null>} JWT e usuário público, ou null para credenciais inválidas.
 * @throws {Error} Falha inesperada de banco ou assinatura JWT.
 */
async function fazerLogin(email, senha) {
    const usuario = usuarios.buscarPorEmail(
        email.trim().toLowerCase()
    );

    if (!usuario) {
        return null;
    }

    const senhaCorreta = await bcrypt.compare(
        senha,
        usuario.senha_hash
    );

    if (!senhaCorreta) {
        return null;
    }

    const token = jwt.sign(
        {},
        process.env.JWT_SECRET,
        {
            subject: String(usuario.id),
            algorithm: "HS256",
            expiresIn: "2h",
            issuer: "guizao-do-corte",
            audience: "guizao-api"
        }
    );

    return {
        token,
        tipo: "Bearer",
        expira_em: "2h",
        usuario: {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            papel: usuario.papel
        }
    };
}

module.exports = {
    fazerLogin,
    cadastrarCliente
};
