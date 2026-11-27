
/**
 * Guizao do Corte - Regras de negocio dos servicos.
 * Camada de servicos.
 */

"use strict";

const repositorio = require(
    "../dados/repositorioServicos"
);

/**
 * Cria um erro com status HTTP.
 * @param {number} status
 * @param {string} mensagem
 * @returns {Error}
 */
function erroHttp(status, mensagem) {
    const erro = new Error(mensagem);
    erro.status = status;
    return erro;
}

/**
 * Lista servicos ativos.
 * @returns {Array<object>}
 */
function listarServicos() {
    return repositorio.listarAtivos();
}

/**
 * Busca um servico ativo pelo ID.
 * @param {number} id
 * @returns {object|undefined}
 */
function buscarServico(id) {
    return repositorio.buscarAtivoPorId(id);
}

/**
 * Valida os dados de um novo servico.
 *
 * @param {object} dados
 * @returns {object} Dados validados.
 */
function validarNovoServico(dados) {
    if (
        !dados ||
        typeof dados !== "object" ||
        Array.isArray(dados)
    ) {
        throw erroHttp(
            400,
            "Informe os dados do servico."
        );
    }

    const camposPermitidos = [
        "nome",
        "descricao",
        "duracao_minutos",
        "preco_centavos"
    ];

    const possuiCampoDesconhecido = Object.keys(
        dados
    ).some(campo => !camposPermitidos.includes(campo));

    if (possuiCampoDesconhecido) {
        throw erroHttp(
            400,
            "O cadastro contem campos nao permitidos."
        );
    }

    if (typeof dados.nome !== "string") {
        throw erroHttp(400, "Nome invalido.");
    }

    const nome = dados.nome.trim();

    if (nome.length < 2 || nome.length > 80) {
        throw erroHttp(
            400,
            "O nome deve ter entre 2 e 80 caracteres."
        );
    }

    const descricao = dados.descricao === undefined
        ? ""
        : dados.descricao;

    if (
        typeof descricao !== "string" ||
        descricao.length > 500
    ) {
        throw erroHttp(
            400,
            "A descricao deve ter ate 500 caracteres."
        );
    }

    if (
        !Number.isSafeInteger(dados.duracao_minutos) ||
        dados.duracao_minutos < 5 ||
        dados.duracao_minutos > 240
    ) {
        throw erroHttp(
            400,
            "A duracao deve estar entre 5 e 240 minutos."
        );
    }

    if (
        !Number.isSafeInteger(dados.preco_centavos) ||
        dados.preco_centavos < 0 ||
        dados.preco_centavos > 10000000
    ) {
        throw erroHttp(
            400,
            "Informe um preco valido em centavos."
        );
    }

    return {
        nome,
        descricao: descricao.trim(),
        duracao_minutos: dados.duracao_minutos,
        preco_centavos: dados.preco_centavos
    };
}

/**
 * Cadastra um novo servico.
 *
 * @param {object} dados
 * @returns {object}
 */
function cadastrarServico(dados) {
    const dadosValidados = validarNovoServico(dados);

    try {
        return repositorio.cadastrar(dadosValidados);

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
    cadastrarServico
};
