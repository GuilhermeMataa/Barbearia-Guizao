
/**
 * Guizao do Corte - Regras de agendamento.
 * Horarios representados na hora local da barbearia:
 * America/Fortaleza.
 */

"use strict";

const servicos = require(
    "../dados/repositorioServicos"
);

const agendamentos = require(
    "../dados/repositorioAgendamentos"
);

const FUSO_BARBEARIA = "America/Fortaleza";

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
 * Retorna a data e a hora atuais em Fortaleza,
 * no formato YYYY-MM-DD HH:mm:ss.
 *
 * @returns {string}
 */
function agoraNaBarbearia() {
    const formatador = new Intl.DateTimeFormat(
        "en-GB",
        {
            timeZone: FUSO_BARBEARIA,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hourCycle: "h23"
        }
    );

    const partes = Object.fromEntries(
        formatador.formatToParts(new Date())
            .map(parte => [parte.type, parte.value])
    );

    return (
        `${partes.year}-${partes.month}-${partes.day} ` +
        `${partes.hour}:${partes.minute}:${partes.second}`
    );
}

/**
 * Valida uma data real no formato YYYY-MM-DD.
 *
 * @param {string} data
 * @returns {boolean}
 */
function dataValida(data) {
    if (
        typeof data !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(data)
    ) {
        return false;
    }

    const [ano, mes, dia] = data
        .split("-")
        .map(Number);

    if (ano < 2020 || ano > 2100) {
        return false;
    }

    const dataCalculada = new Date(
        Date.UTC(ano, mes - 1, dia)
    );

    return dataCalculada
        .toISOString()
        .slice(0, 10) === data;
}

/**
 * Converte data e horario para um intervalo.
 *
 * A aritmetica usa UTC somente para somar minutos.
 * Os textos salvos representam a hora local de
 * Fortaleza, sem conversao de fuso.
 *
 * @param {string} data
 * @param {string} horario
 * @param {number} duracao
 * @returns {{inicio:string, fim:string}}
 */
function gerarIntervalo(data, horario, duracao) {
    const [ano, mes, dia] = data
        .split("-")
        .map(Number);

    const [hora, minuto] = horario
        .split(":")
        .map(Number);

    const inicioEmMilissegundos = Date.UTC(
        ano,
        mes - 1,
        dia,
        hora,
        minuto
    );

    const fimEmMilissegundos =
        inicioEmMilissegundos + duracao * 60000;

    const fim = new Date(fimEmMilissegundos)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");

    return {
        inicio: `${data} ${horario}:00`,
        fim
    };
}

/**
 * Valida e cria uma reserva para o usuario logado.
 *
 * @param {number} usuarioId
 * @param {object} dados
 * @returns {object}
 */
function criarAgendamento(usuarioId, dados) {
    if (
        !Number.isSafeInteger(usuarioId) ||
        usuarioId <= 0
    ) {
        throw erroHttp(401, "Usuario invalido.");
    }

    if (
        !dados ||
        typeof dados !== "object" ||
        Array.isArray(dados)
    ) {
        throw erroHttp(
            400,
            "Informe os dados do agendamento."
        );
    }

    const camposPermitidos = [
        "servico_id",
        "data",
        "horario"
    ];

    for (const campo of Object.keys(dados)) {
        if (!camposPermitidos.includes(campo)) {
            throw erroHttp(
                400,
                "Campo nao permitido: " + campo
            );
        }
    }

    if (
        !Number.isSafeInteger(dados.servico_id) ||
        dados.servico_id <= 0
    ) {
        throw erroHttp(400, "Servico invalido.");
    }

    if (!dataValida(dados.data)) {
        throw erroHttp(400, "Data invalida.");
    }

    if (
        typeof dados.horario !== "string" ||
        !/^([01]\d|2[0-3]):([0-5]\d)$/.test(
            dados.horario
        )
    ) {
        throw erroHttp(400, "Horario invalido.");
    }

    const [hora, minuto] = dados.horario
        .split(":")
        .map(Number);

    // Horarios iniciais: 09:00 ate 17:30,
    // em intervalos de 30 minutos.
    if (
        hora < 9 ||
        hora >= 18 ||
        minuto % 30 !== 0
    ) {
        throw erroHttp(
            400,
            "Escolha um horario entre 09:00 e 17:30."
        );
    }

    const servico = servicos.buscarAtivoPorId(
        dados.servico_id
    );

    if (!servico) {
        throw erroHttp(
            404,
            "Servico nao encontrado ou inativo."
        );
    }

    const intervalo = gerarIntervalo(
        dados.data,
        dados.horario,
        servico.duracao_minutos
    );

    // O atendimento precisa terminar ate 18:00
    // do mesmo dia.
    if (intervalo.fim > `${dados.data} 18:00:00`) {
        throw erroHttp(
            400,
            "O servico ultrapassa o horario de fechamento."
        );
    }

    // Regra de negocio: proibir reservas no passado.
    if (intervalo.inicio <= agoraNaBarbearia()) {
        throw erroHttp(
            400,
            "Nao e permitido agendar no passado."
        );
    }

    return agendamentos.criar({
        usuarioId,
        servicoId: dados.servico_id,
        inicio: intervalo.inicio,
        fim: intervalo.fim
    });
}


/**
 * Lista as reservas que o usuario pode visualizar.
 *
 * @param {object} usuario
 * @returns {object[]}
 */
function listarAgendamentos(usuario) {
    if (
        !usuario ||
        !Number.isSafeInteger(usuario.id) ||
        !["cliente", "admin"].includes(usuario.papel)
    ) {
        throw erroHttp(
            401,
            "Usuario nao autenticado."
        );
    }

    return agendamentos.listarVisiveis(
        usuario.id,
        usuario.papel
    );
}


module.exports = {
    criarAgendamento
    ,
    listarAgendamentos
};
