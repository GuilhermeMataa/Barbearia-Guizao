/**
 * Guizao do Corte - Painel do cliente com agenda visual.
 * Os horarios ocupados sao consultados na API (SQLite).
 * A verificacao final de conflito continua no POST (HTTP 409).
 */
"use strict";

const CHAVE_TOKEN = "guizao_token";
const $ = (seletor) => document.querySelector(seletor);

const secaoLogin = $("#secao-login-cliente");
const secaoCliente = $("#secao-area-cliente");
const formLogin = $("#form-login-cliente");
const formReserva = $("#form-reserva-cliente");
const servicoCampo = $("#servico-cliente");
const dataCampo = $("#data-cliente");
const horarioCampo = $("#horario-cliente");
const diasGrade = $("#dias-cliente");
const horariosGrade = $("#horarios-cliente");
const mensagemLogin = $("#mensagem-login-cliente");
const mensagemReserva = $("#mensagem-reserva-cliente");
const mensagemLista = $("#mensagem-lista-cliente");
const botaoLogin = $("#botao-login-cliente");
const botaoConfirmar = $("#botao-confirmar-cliente");
const botaoAtualizar = $("#botao-atualizar-cliente");
const confirmacao = $("#confirmacao-cliente");
const listaReservas = $("#lista-reservas-cliente");

const parametrosIniciais = new URLSearchParams(window.location.search);
const nomeServicoInicial = parametrosIniciais.get("servico");
const dataInicial = parametrosIniciais.get("data");
const horarioInicial = parametrosIniciais.get("horario");
$("#link-criar-conta").href = "/cadastro.html" + window.location.search;

let servicosDisponiveis = [];
let ultimaListaHorarios = [];
let sequenciaConsulta = 0;

/** Chama a API e transforma erros em mensagens amigaveis. */
async function chamarApi(caminho, opcoes = {}, autenticado = true) {
    const headers = { ...(opcoes.headers || {}) };

    if (autenticado) {
        const token = sessionStorage.getItem(CHAVE_TOKEN);
        if (!token) {
            const erro = new Error("Faça login novamente.");
            erro.status = 401;
            throw erro;
        }
        headers.Authorization = `Bearer ${token}`;
    }

    const resposta = await fetch(caminho, { ...opcoes, headers });
    let dados = null;

    if (resposta.status !== 204) {
        try {
            dados = await resposta.json();
        } catch {
            // A resposta pode nao ter corpo JSON.
        }
    }

    if (!resposta.ok) {
        const erro = new Error(
            dados?.erro || "Não foi possível concluir a operação."
        );
        erro.status = resposta.status;
        throw erro;
    }
    return dados;
}

/** Retorna data e hora atual na barbearia. */
function agoraFortaleza() {
    const fmt = new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Fortaleza",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
    });
    const partes = Object.fromEntries(
        fmt.formatToParts(new Date()).map((p) => [p.type, p.value])
    );
    return {
        data: `${partes.year}-${partes.month}-${partes.day}`,
        minutos: Number(partes.hour) * 60 + Number(partes.minute)
    };
}

/** Formata AAAA-MM-DD HH:mm:ss para DD/MM/AAAA HH:mm. */
function formatarInicio(valor) {
    if (typeof valor !== "string") return "";
    const [data, hora = ""] = valor.split(" ");
    const partes = data.split("-");
    if (partes.length !== 3) return valor;
    return `${partes[2]}/${partes[1]}/${partes[0]} ${hora.slice(0, 5)}`;
}

/** Renderiza um aviso, sempre via textContent. */
function avisoNaGrade(grade, texto) {
    const p = document.createElement("p");
    p.className = "mensagem-vazia-grade";
    p.textContent = texto;
    grade.replaceChildren(p);
}

function mostrarLogin(texto = "") {
    secaoLogin.hidden = false;
    secaoCliente.hidden = true;
    listaReservas.replaceChildren();
    confirmacao.hidden = true;
    mensagemLogin.textContent = texto;
}

function mostrarCliente(usuario) {
    $("#nome-cliente-logado").textContent = usuario.nome;
    secaoLogin.hidden = true;
    secaoCliente.hidden = false;
    $("#senha-cliente").value = "";
}

function sair(texto = "Você saiu da sua conta.") {
    sequenciaConsulta++;
    sessionStorage.removeItem(CHAVE_TOKEN);
    mostrarLogin(texto);
}

function tratarErro(erro, destino) {
    if (erro.status === 401) {
        sair("Sessão expirada. Faça login novamente.");
    } else {
        destino.textContent = erro.message;
    }
}

/** Habilita o botao somente apos selecionar horario disponivel. */
function atualizarBotaoConfirmar() {
    botaoConfirmar.disabled = !(
        servicoCampo.value &&
        dataCampo.value &&
        horarioCampo.value &&
        ultimaListaHorarios.some(
            (item) => item.horario === horarioCampo.value && item.disponivel
        )
    );
}

/** Marca visualmente um dos quadradinhos. */
function marcarEscolha(grade, escolhido) {
    grade.querySelectorAll(".opcao-grade").forEach((botao) => {
        const selecionado = botao === escolhido;
        botao.classList.toggle("ativa", selecionado);
        botao.setAttribute("aria-pressed", String(selecionado));
    });
}

/** Gera os proximos 14 dias, com a hora da barbearia. */
async function gerarDias() {
    diasGrade.replaceChildren();
    const hojeISO = agoraFortaleza().data;
    const base = new Date(`${hojeISO}T12:00:00Z`);
    const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    const botoes = [];

    for (let i = 0; i < 14; i++) {
        const dia = new Date(base.getTime() + i * 86400000);
        const dataISO = dia.toISOString().slice(0, 10);

        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "opcao-grade";
        botao.setAttribute("aria-pressed", "false");
        botao.setAttribute("aria-label", `Selecionar ${dataISO}`);

        for (const [classe, valor] of [
            ["linha-superior", i === 0 ? "Hoje" : diasSemana[dia.getUTCDay()]],
            ["linha-principal", String(dia.getUTCDate()).padStart(2, "0")],
            ["linha-inferior", meses[dia.getUTCMonth()]]
        ]) {
            const span = document.createElement("span");
            span.className = classe;
            span.textContent = valor;
            botao.appendChild(span);
        }

        botao.addEventListener("click", () => selecionarDia(dataISO, botao));
        diasGrade.appendChild(botao);
        botoes.push({ dataISO, botao });
    }

    const inicial = botoes.find((b) => b.dataISO === dataInicial) || botoes[0];
    if (inicial) {
        await selecionarDia(inicial.dataISO, inicial.botao, true);
    }
}

/** Seleciona dia e consulta todos os horarios para o servico. */
async function selecionarDia(dataISO, botao, inicial = false) {
    dataCampo.value = dataISO;
    horarioCampo.value = "";
    confirmacao.hidden = true;
    marcarEscolha(diasGrade, botao);
    atualizarBotaoConfirmar();
    await carregarHorarios(inicial ? horarioInicial : "");
}

/**
 * Consulta a ocupacao real no SQLite. A API envia apenas horarios livres/ocupados.
 * Usa numeracao para descartar respostas de uma consulta antiga.
 */
async function carregarHorarios(horarioDesejado = "") {
    const sequencia = ++sequenciaConsulta;
    horarioCampo.value = "";
    ultimaListaHorarios = [];
    atualizarBotaoConfirmar();
    mensagemReserva.textContent = "";

    if (!servicoCampo.value || !dataCampo.value) {
        avisoNaGrade(horariosGrade, "Escolha um serviço e um dia para ver os horários.");
        return;
    }

    avisoNaGrade(horariosGrade, "Consultando horários disponíveis...");

    try {
        const query = new URLSearchParams({
            data: dataCampo.value,
            servico_id: servicoCampo.value
        });
        const resultado = await chamarApi(
            `/api/agendamentos/disponibilidade?${query.toString()}`
        );

        if (sequencia !== sequenciaConsulta) return;
        if (!Array.isArray(resultado?.horarios)) {
            throw new Error("Resposta inesperada do servidor.");
        }

        ultimaListaHorarios = resultado.horarios;
        horariosGrade.replaceChildren();
        let livres = 0;

        for (const item of ultimaListaHorarios) {
            const botao = document.createElement("button");
            botao.type = "button";
            botao.className = "opcao-grade";
            botao.setAttribute("aria-pressed", "false");
            botao.disabled = !item.disponivel;

            const hora = document.createElement("span");
            hora.className = "linha-principal";
            hora.textContent = item.horario;

            const estado = document.createElement("span");
            estado.className = "linha-inferior";
            estado.textContent = item.disponivel ? "Livre"
                : item.motivo === "passado" ? "Passou"
                : item.motivo === "fechado" ? "Fechado"
                : "Ocupado";
            botao.append(hora, estado);

            if (item.disponivel) {
                botao.classList.add("slot-livre");
                livres++;
                botao.addEventListener("click", () => {
                    horarioCampo.value = item.horario;
                    marcarEscolha(horariosGrade, botao);
                    confirmacao.hidden = true;
                    mensagemReserva.textContent = "";
                    atualizarBotaoConfirmar();
                });
            } else {
                botao.classList.add(
                    item.motivo === "ocupado" ? "slot-ocupado" : "slot-indisponivel"
                );
                botao.setAttribute("aria-label", `${item.horario} ${estado.textContent}`);
            }

            horariosGrade.appendChild(botao);
        }

        if (livres === 0) {
            mensagemReserva.textContent = "Não há horários livres nessa data para esse serviço.";
        } else {
            mensagemReserva.textContent = `${livres} horário(s) livre(s). Selecione um para confirmar.`;
        }

        if (horarioDesejado) {
            const pretendido = ultimaListaHorarios.find(
                (item) => item.horario === horarioDesejado && item.disponivel
            );
            if (pretendido) {
                const indice = ultimaListaHorarios.indexOf(pretendido);
                horariosGrade.children[indice].click();
            }
        }
    } catch (erro) {
        if (sequencia !== sequenciaConsulta) return;
        avisoNaGrade(horariosGrade, "Não foi possível consultar os horários.");
        tratarErro(erro, mensagemReserva);
    } finally {
        if (sequencia === sequenciaConsulta) atualizarBotaoConfirmar();
    }
}

/** Carrega servicos do banco e inicia a tabela de dias. */
async function carregarServicos() {
    mensagemReserva.textContent = "Carregando serviços...";
    const dados = await chamarApi("/api/servicos", {}, false);

    if (!Array.isArray(dados)) {
        throw new Error("Resposta inesperada da lista de serviços.");
    }

    servicosDisponiveis = dados;
    servicoCampo.replaceChildren(new Option("Selecione o serviço", ""));

    for (const servico of dados) {
        const preco = (servico.preco_centavos / 100)
            .toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        servicoCampo.appendChild(
            new Option(`${servico.nome} — ${preco}`, String(servico.id))
        );
    }

    const preEscolhido = dados.find((s) => s.nome === nomeServicoInicial);
    // Ao entrar, ja mostra a grade do primeiro servico ativo.
    const inicial = preEscolhido || dados[0];
    if (inicial) servicoCampo.value = String(inicial.id);

    await gerarDias();
    if (!dados.length) mensagemReserva.textContent = "Nenhum serviço disponível no momento.";
}

function texto(rotulo, valor) {
    const p = document.createElement("p");
    p.textContent = `${rotulo}: ${valor}`;
    return p;
}

/** Carrega o historico restrito ao cliente autenticado. */
async function carregarReservas() {
    mensagemLista.textContent = "Carregando agendamentos...";
    botaoAtualizar.disabled = true;

    try {
        const reservas = await chamarApi("/api/agendamentos");
        if (!Array.isArray(reservas)) {
            throw new Error("Resposta inesperada dos agendamentos.");
        }

        listaReservas.replaceChildren();
        if (!reservas.length) {
            mensagemLista.textContent = "Você ainda não possui agendamentos.";
            return;
        }

        for (const reserva of reservas) {
            const item = document.createElement("li");
            item.className = "item-reserva-cliente";
            const titulo = document.createElement("h4");
            titulo.textContent = reserva.servico;
            item.appendChild(titulo);
            item.appendChild(texto("Número", reserva.id));
            item.appendChild(texto("Data", formatarInicio(reserva.inicio)));
            item.appendChild(texto("Status", reserva.status));

            if (reserva.status === "agendado") {
                const botao = document.createElement("button");
                botao.type = "button";
                botao.className = "botao-cancelar";
                botao.textContent = "Cancelar reserva";
                botao.addEventListener("click", async () => {
                    if (!window.confirm(`Cancelar a reserva nº ${reserva.id}?`)) return;
                    botao.disabled = true;
                    mensagemLista.textContent = "Cancelando reserva...";
                    try {
                        await chamarApi(`/api/agendamentos/${reserva.id}`, {
                            method: "DELETE"
                        });
                        await carregarReservas();
                        await carregarHorarios();
                        mensagemLista.textContent = `Reserva nº ${reserva.id} cancelada.`;
                    } catch (erro) {
                        tratarErro(erro, mensagemLista);
                        botao.disabled = false;
                    }
                });
                item.appendChild(botao);
            }

            listaReservas.appendChild(item);
        }
        mensagemLista.textContent = `${reservas.length} agendamento(s) encontrado(s).`;
    } catch (erro) {
        tratarErro(erro, mensagemLista);
    } finally {
        botaoAtualizar.disabled = false;
    }
}

/** Valida JWT e apresenta agenda imediatamente depois do login. */
async function abrirAreaCliente(usuario, rolar = false) {
    mostrarCliente(usuario);
    try {
        await carregarServicos();
        await carregarReservas();
        if (rolar) {
            $("#secao-agendar").scrollIntoView({ behavior: "smooth", block: "start" });
        }
    } catch (erro) {
        tratarErro(erro, mensagemReserva);
    }
}

formLogin.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    botaoLogin.disabled = true;
    mensagemLogin.textContent = "Verificando login...";

    try {
        const dados = await chamarApi("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: $("#email-cliente").value.trim(),
                senha: $("#senha-cliente").value
            })
        }, false);

        if (dados?.usuario?.papel !== "cliente" || typeof dados.token !== "string") {
            throw new Error("Esta área é exclusiva para clientes.");
        }

        sessionStorage.setItem(CHAVE_TOKEN, dados.token);
        await abrirAreaCliente(dados.usuario, true);
    } catch (erro) {
        mensagemLogin.textContent = erro.message;
    } finally {
        botaoLogin.disabled = false;
    }
});

servicoCampo.addEventListener("change", () => {
    confirmacao.hidden = true;
    carregarHorarios();
});

formReserva.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    confirmacao.hidden = true;

    const servicoId = Number(servicoCampo.value);
    const data = dataCampo.value;
    const horario = horarioCampo.value;
    const podeAgendar = ultimaListaHorarios.some(
        (item) => item.horario === horario && item.disponivel
    );

    if (!Number.isSafeInteger(servicoId) || !data || !horario || !podeAgendar) {
        mensagemReserva.textContent = "Escolha um serviço, um dia e um horário livre.";
        return;
    }

    botaoConfirmar.disabled = true;
    mensagemReserva.textContent = "Confirmando agendamento...";

    try {
        const reserva = await chamarApi("/api/agendamentos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                servico_id: servicoId,
                data,
                horario
            })
        });

        if (!Number.isSafeInteger(reserva?.id)) {
            throw new Error("A API não retornou o número da confirmação.");
        }

        $("#detalhes-confirmacao").textContent =
            `Reserva nº ${reserva.id} — ${reserva.servico}, ${formatarInicio(reserva.inicio)}.`;
        confirmacao.hidden = false;

        await carregarReservas();
        await carregarHorarios();
        mensagemReserva.textContent = "Reserva salva no SQLite com sucesso!";
    } catch (erro) {
        if (erro.status === 409) {
            mensagemReserva.textContent =
                "Esse horário acabou de ser reservado. Escolha outro horário livre.";
            await carregarHorarios();
            // Mantem o erro visivel apos atualizar a tabela.
            mensagemReserva.textContent =
                "Horário ocupado! A tabela foi atualizada. Escolha outro.";
        } else {
            tratarErro(erro, mensagemReserva);
        }
    } finally {
        atualizarBotaoConfirmar();
    }
});

$("#botao-sair-cliente").addEventListener("click", () => sair());
botaoAtualizar.addEventListener("click", () => carregarReservas());
$("#botao-atualizar-horarios").addEventListener("click", () => carregarHorarios());

// Ao retornar para uma aba aberta, consulta o estado mais recente do SQLite.
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !secaoCliente.hidden) {
        carregarHorarios();
        carregarReservas();
    }
});

/** Restaura a sessao apos atualizar a pagina. */
async function iniciar() {
    if (!sessionStorage.getItem(CHAVE_TOKEN)) return;

    try {
        const usuario = await chamarApi("/api/auth/me");
        if (usuario.papel !== "cliente") {
            sair("Entre com uma conta de cliente.");
            return;
        }
        await abrirAreaCliente(usuario, true);
    } catch (erro) {
        if (erro.status === 401) {
            sair("Sessão expirada. Faça login novamente.");
        } else {
            mensagemLogin.textContent = erro.message;
        }
    }
}

iniciar();
