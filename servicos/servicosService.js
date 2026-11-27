
/**
 * Guizao do Corte - Regras de negocio dos servicos.
 * Camada de servicos.
 */

"use strict";

const repositorio = require(
    "../dados/repositorioServicos"
);

/**
 * Cria erro de negócio com status HTTP.
 *
 * @param {number} status - Código HTTP
 * @param {string} mensagem - Motivo
 * @returns {Error} Erro contextualizado
 */
function erroHttp(status, mensagem) {
    const erro = new Error(mensagem);
    erro.status = status;
    return erro;
}

/**
 * Lista serviços ativos consultando o repositório.
 *
 * @returns {object[]} Serviços disponíveis
 * @throws {Error} Falha de leitura SQLite
 */
function listarServicos() {
    return repositorio.listarAtivos();
}

/**
 * Consulta serviço por ID validado.
 *
 * @param {number} id - ID do serviço
 * @returns {object|undefined} Serviço ativo ou ausente
 * @throws {Error} Falha de leitura SQLite
 */
function buscarServico(id) {
    return repositorio.buscarAtivoPorId(id);
}

/**
 * Valida formato e limites do serviço no servidor.
 *
 * @param {object} dados - Nome, descrição, duração e preço
 * @returns {object} Valores normalizados
 * @throws {Error} Status 400 para dados inválidos
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
 * Cadastra serviço com restrição de nome único.
 *
 * @param {object} dados - Dados do serviço
 * @returns {object} Serviço persistido
 * @throws {Error} Status 400 ou 409
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

/**
 * Desativa serviço sem excluir histórico.
 *
 * @param {number} id - ID do serviço
 * @returns {boolean} Indica se foi desativado
 * @throws {Error} Falha SQLite
 */
function desativarServico(id) {
    return repositorio.desativar(id);
}


/**
 * Atualiza serviço após validar todas as entradas.
 *
 * @param {number} id - ID do serviço
 * @param {object} dados - Novos valores
 * @returns {object|undefined} Registro alterado ou ausente
 * @throws {Error} Status 400 ou 409
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
