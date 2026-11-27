/**
 * Guizao do Corte - Regras de agendamento e disponibilidade.
 * As datas e horas representam o fuso America/Fortaleza.
 */
"use strict";

const servicos = require("../dados/repositorioServicos");
const agendamentos = require("../dados/repositorioAgendamentos");

const FUSO_BARBEARIA = "America/Fortaleza";

/**
 * Código HTTP e mensagem de regra.
 *
 * @param {number} status - Código HTTP
 * @param {string} mensagem - Descrição do erro
 * @returns {Error} com status definido
 */
function erroHttp(status, mensagem) {
    const erro = new Error(mensagem);
    erro.status = status;
    return erro;
}

/**
 * Obtém data/hora no fuso do estabelecimento.
 *
 * @returns {string} AAAA-MM-DD HH:mm:ss
 */
function agoraNaBarbearia() {
    const formatador = new Intl.DateTimeFormat("en-GB", {
        timeZone: FUSO_BARBEARIA,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
    });

    const partes = Object.fromEntries(
        formatador.formatToParts(new Date())
            .map((parte) => [parte.type, parte.value])
    );

    return (
        `${partes.year}-${partes.month}-${partes.day} ` +
        `${partes.hour}:${partes.minute}:${partes.second}`
    );
}

/**
 * Valida uma data de calendário sem aceitar dias inexistentes.
 *
 * @param {unknown} data - Valor recebido
 * @returns {boolean} Validade da data
 */
function dataValida(data) {
    if (typeof data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return false;
    }

    const [ano, mes, dia] = data.split("-").map(Number);
    if (ano < 2020 || ano > 2100) return false;

    const calculada = new Date(Date.UTC(ano, mes - 1, dia));
    return calculada.toISOString().slice(0, 10) === data;
}

/**
 * Calcula o fim de um atendimento a partir da duração.
 *
 * @param {string} data - Dia validado
 * @param {string} horario - Início HH:mm
 * @param {number} duracao - Minutos do serviço
 * @returns {{inicio:string,fim:string}} Intervalo local
 */
function gerarIntervalo(data, horario, duracao) {
    const [ano, mes, dia] = data.split("-").map(Number);
    const [hora, minuto] = horario.split(":").map(Number);
    const inicioMs = Date.UTC(ano, mes - 1, dia, hora, minuto);
    const fimMs = inicioMs + duracao * 60000;

    return {
        inicio: `${data} ${horario}:00`,
        fim: new Date(fimMs).toISOString().slice(0, 19).replace("T", " ")
    };
}

/**
 * Verifica horários sem divulgar informações pessoais.
 *
 * @param {string} data - Dia a consultar
 * @param {number} servicoId - Serviço ativo
 * @returns {object} Horários e motivos da indisponibilidade
 * @throws {Error} Status 400/404 para entrada ou serviço inválidos
 */
function consultarDisponibilidade(data, servicoId) {
    if (!dataValida(data)) {
        throw erroHttp(400, "Data invalida.");
    }
    if (!Number.isSafeInteger(servicoId) || servicoId <= 0) {
        throw erroHttp(400, "Servico invalido.");
    }

    const servico = servicos.buscarAtivoPorId(servicoId);
    if (!servico) {
        throw erroHttp(404, "Servico nao encontrado ou inativo.");
    }

    const ocupados = agendamentos.listarOcupadosNoDia(data);
    const agora = agoraNaBarbearia();
    const horarios = [];

    // Comecos aceitos: de 09:00 a 17:30, a cada 30 minutos.
    for (let minutos = 9 * 60; minutos < 18 * 60; minutos += 30) {
        const horas = String(Math.floor(minutos / 60)).padStart(2, "0");
        const mins = String(minutos % 60).padStart(2, "0");
        const horario = `${horas}:${mins}`;
        const intervalo = gerarIntervalo(data, horario, servico.duracao_minutos);

        const foraDoExpediente = intervalo.fim > `${data} 18:00:00`;
        const passou = intervalo.inicio <= agora;

        // A e B se sobrepoem se A.inicio < B.fim e A.fim > B.inicio.
        const ocupado = ocupados.some(
            (reserva) => intervalo.inicio < reserva.fim &&
                         intervalo.fim > reserva.inicio
        );

        const disponivel = !foraDoExpediente && !passou && !ocupado;
        const motivo = passou ? "passado"
            : foraDoExpediente ? "fechado"
            : ocupado ? "ocupado"
            : null;

        horarios.push({ horario, disponivel, motivo });
    }

    return {
        data,
        servico_id: servicoId,
        duracao_minutos: servico.duracao_minutos,
        horarios
    };
}

/**
 * Verifica expediente e conflito, delegando a gravação atômica.
 *
 * @param {number} usuarioId - ID retirado do JWT
 * @param {object} dados - Serviço, dia e horário recebidos
 * @returns {object} Agendamento persistido
 * @throws {Error} Status 400/401/404/409 conforme validação
 */
function criarAgendamento(usuarioId, dados) {
    if (!Number.isSafeInteger(usuarioId) || usuarioId <= 0) {
        throw erroHttp(401, "Usuario invalido.");
    }
    if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
        throw erroHttp(400, "Informe os dados do agendamento.");
    }

    for (const campo of Object.keys(dados)) {
        if (!["servico_id", "data", "horario"].includes(campo)) {
            throw erroHttp(400, "Campo nao permitido: " + campo);
        }
    }

    if (!Number.isSafeInteger(dados.servico_id) || dados.servico_id <= 0) {
        throw erroHttp(400, "Servico invalido.");
    }
    if (!dataValida(dados.data)) {
        throw erroHttp(400, "Data invalida.");
    }
    if (
        typeof dados.horario !== "string" ||
        !/^([01]\d|2[0-3]):([0-5]\d)$/.test(dados.horario)
    ) {
        throw erroHttp(400, "Horario invalido.");
    }

    const [hora, minuto] = dados.horario.split(":").map(Number);
    if (hora < 9 || hora >= 18 || minuto % 30 !== 0) {
        throw erroHttp(400, "Escolha um horario entre 09:00 e 17:30.");
    }

    const servico = servicos.buscarAtivoPorId(dados.servico_id);
    if (!servico) {
        throw erroHttp(404, "Servico nao encontrado ou inativo.");
    }

    const intervalo = gerarIntervalo(
        dados.data,
        dados.horario,
        servico.duracao_minutos
    );

    if (intervalo.fim > `${dados.data} 18:00:00`) {
        throw erroHttp(400, "O servico ultrapassa o horario de fechamento.");
    }
    if (intervalo.inicio <= agoraNaBarbearia()) {
        throw erroHttp(400, "Nao e permitido agendar no passado.");
    }

    // A verificacao de conflito no SQLite continua obrigatoria:
    // ela impede dupla reserva mesmo com duas abas simultaneas.
    return agendamentos.criar({
        usuarioId,
        servicoId: dados.servico_id,
        inicio: intervalo.inicio,
        fim: intervalo.fim
    });
}

/**
 * Lista somente dados autorizados ao papel.
 *
 * @param {object} usuario - ID e papel autenticados
 * @returns {object[]} Reservas permitidas
 * @throws {Error} Status 401 sem autenticação
 */
function listarAgendamentos(usuario) {
    if (
        !usuario ||
        !Number.isSafeInteger(usuario.id) ||
        !["cliente", "admin"].includes(usuario.papel)
    ) {
        throw erroHttp(401, "Usuario nao autenticado.");
    }

    return agendamentos.listarVisiveis(usuario.id, usuario.papel);
}

/**
 * Cancela com verificação de titularidade no repositório.
 *
 * @param {number} id - ID da reserva
 * @param {object} usuario - ID e papel autenticados
 * @returns {boolean} Indica sucesso
 * @throws {Error} Status 400/401 para entrada ou sessão inválidas
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
