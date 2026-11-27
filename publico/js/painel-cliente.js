
/**
 * Guizao do Corte - Area do cliente.
 * Login, cadastro, listagem e cancelamento de reservas.
 */

"use strict";

const CHAVE_TOKEN = "guizao_token";
const $ = (seletor) => document.querySelector(seletor);

const telaLogin = $("#secao-login-cliente");
const telaCliente = $("#secao-area-cliente");

const formLogin = $("#form-login-cliente");
const formReserva = $("#form-reserva-cliente");

const mensagemLogin = $("#mensagem-login-cliente");
const mensagemReserva = $("#mensagem-reserva-cliente");
const mensagemLista = $("#mensagem-lista-cliente");

const servicoCampo = $("#servico-cliente");
const dataCampo = $("#data-cliente");
const horarioCampo = $("#horario-cliente");

const botaoLogin = $("#botao-login-cliente");
const botaoConfirmar = $("#botao-confirmar-cliente");
const botaoAtualizar = $("#botao-atualizar-cliente");

const confirmacao = $("#confirmacao-cliente");
const listaReservas = $("#lista-reservas-cliente");

let servicosDisponiveis = [];

/**
 * Solicita dados da API e trata erros HTTP.
 */
async function chamarApi(caminho, opcoes = {}, exigeLogin = true) {
    const headers = {
        ...(opcoes.headers || {})
    };

    if (exigeLogin) {
        const token = sessionStorage.getItem(CHAVE_TOKEN);

        if (!token) {
            const erro = new Error("Faça login novamente.");
            erro.status = 401;
            throw erro;
        }

        headers.Authorization = `Bearer ${token}`;
    }

    const resposta = await fetch(caminho, {
        ...opcoes,
        headers
    });

    let dados = null;

    if (resposta.status !== 204) {
        try {
            dados = await resposta.json();
        } catch {
            // A resposta pode nao conter JSON.
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

/**
 * Obtem a data e hora atuais na barbearia.
 */
function agoraFortaleza() {
    const formatador = new Intl.DateTimeFormat(
        "en-GB",
        {
            timeZone: "America/Fortaleza",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23"
        }
    );

    const partes = Object.fromEntries(
        formatador.formatToParts(new Date())
            .map((parte) => [parte.type, parte.value])
    );

    return {
        data: `${partes.year}-${partes.month}-${partes.day}`,
        minutos: Number(partes.hour) * 60 +
                 Number(partes.minute)
    };
}

/**
 * Formata a data recebida do SQLite.
 */
function formatarInicio(valor) {
    const [data, hora = ""] = String(valor).split(" ");
    const partes = data.split("-");

    if (partes.length !== 3) {
        return String(valor);
    }

    return (
        `${partes[2]}/${partes[1]}/${partes[0]} ` +
        hora.slice(0, 5)
    );
}

/**
 * Exibe a tela de login.
 */
function mostrarLogin(texto = "") {
    telaLogin.hidden = false;
    telaCliente.hidden = true;
    listaReservas.replaceChildren();
    confirmacao.hidden = true;
    mensagemLogin.textContent = texto;
}

/**
 * Exibe a area da conta autenticada.
 */
function mostrarCliente(usuario) {
    $("#nome-cliente-logado").textContent = usuario.nome;
    telaLogin.hidden = true;
    telaCliente.hidden = false;
    $("#senha-cliente").value = "";
}

function sair(texto = "Você saiu da sua conta.") {
    sessionStorage.removeItem(CHAVE_TOKEN);
    mostrarLogin(texto);
}

function tratarErro(erro, destino) {
    if (erro.status === 401) {
        sair("Sua sessão expirou. Faça login novamente.");
        return;
    }

    destino.textContent = erro.message;
}

/**
 * Atualiza os horarios permitidos de acordo com a
 * duracao do servico e o horario de fechamento.
 */
function atualizarHorarios() {
    horarioCampo.replaceChildren();

    const inicial = new Option("Selecione o horário", "");
    horarioCampo.appendChild(inicial);

    const servico = servicosDisponiveis.find(
        (item) => item.id === Number(servicoCampo.value)
    );

    if (!servico || !dataCampo.value) {
        return;
    }

    const agora = agoraFortaleza();

    for (let minutos = 540; minutos < 1080; minutos += 30) {
        if (minutos + servico.duracao_minutos > 1080) {
            continue;
        }

        if (
            dataCampo.value === agora.data &&
            minutos <= agora.minutos
        ) {
            continue;
        }

        const horas = String(
            Math.floor(minutos / 60)
        ).padStart(2, "0");

        const mins = String(
            minutos % 60
        ).padStart(2, "0");

        const horario = `${horas}:${mins}`;

        horarioCampo.appendChild(
            new Option(horario, horario)
        );
    }
}

/**
 * Carrega os servicos ativos cadastrados no banco.
 */
async function carregarServicos() {
    mensagemReserva.textContent = "Carregando serviços...";

    try {
        const resultado = await chamarApi(
            "/api/servicos", {}, false
        );

        if (!Array.isArray(resultado)) {
            throw new Error("Resposta inválida dos serviços.");
        }

        servicosDisponiveis = resultado;
        servicoCampo.replaceChildren();

        servicoCampo.appendChild(
            new Option("Selecione o serviço", "")
        );

        for (const servico of resultado) {
            const preco = (
                servico.preco_centavos / 100
            ).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL"
            });

            servicoCampo.appendChild(
                new Option(
                    `${servico.nome} — ${preco}`,
                    String(servico.id)
                )
            );
        }

        // Recupera escolhas feitas na pagina inicial.
        const parametros = new URLSearchParams(
            window.location.search
        );

        const nomeEscolhido = parametros.get("servico");
        const selecionado = resultado.find(
            (item) => item.nome === nomeEscolhido
        );

        if (selecionado) {
            servicoCampo.value = String(selecionado.id);
        }

        const dataEscolhida = parametros.get("data");

        if (
            dataEscolhida &&
            /^\d{4}-\d{2}-\d{2}$/.test(dataEscolhida) &&
            dataEscolhida >= agoraFortaleza().data
        ) {
            dataCampo.value = dataEscolhida;
        }

        atualizarHorarios();

        const horarioEscolhido = parametros.get("horario");

        if (
            horarioEscolhido &&
            [...horarioCampo.options].some(
                (opcao) => opcao.value === horarioEscolhido
            )
        ) {
            horarioCampo.value = horarioEscolhido;
        }

        mensagemReserva.textContent = resultado.length
            ? "Escolha um horário para confirmar sua reserva."
            : "Nenhum serviço disponível no momento.";

    } catch (erro) {
        mensagemReserva.textContent = erro.message;
    }
}

/**
 * Cria uma linha de texto segura.
 */
function criarTexto(rotulo, valor) {
    const paragrafo = document.createElement("p");
    paragrafo.textContent = `${rotulo}: ${valor}`;
    return paragrafo;
}

/**
 * Mostra somente os agendamentos do cliente logado.
 * A API realiza a filtragem pelo usuario do JWT.
 */
async function carregarReservas() {
    mensagemLista.textContent = "Carregando reservas...";
    botaoAtualizar.disabled = true;

    try {
        const reservas = await chamarApi("/api/agendamentos");

        if (!Array.isArray(reservas)) {
            throw new Error("Resposta inválida das reservas.");
        }

        listaReservas.replaceChildren();

        if (reservas.length === 0) {
            mensagemLista.textContent =
                "Você ainda não possui agendamentos.";
            return;
        }

        for (const reserva of reservas) {
            const item = document.createElement("li");
            item.className = "item-reserva-cliente";

            const titulo = document.createElement("h4");
            titulo.textContent = reserva.servico;

            item.appendChild(titulo);
            item.appendChild(
                criarTexto("Número", reserva.id)
            );
            item.appendChild(
                criarTexto(
                    "Início",
                    formatarInicio(reserva.inicio)
                )
            );
            item.appendChild(
                criarTexto("Status", reserva.status)
            );

            if (reserva.status === "agendado") {
                const botao = document.createElement("button");
                botao.type = "button";
                botao.className = "botao-cancelar";
                botao.textContent = "Cancelar reserva";

                botao.addEventListener("click", async () => {
                    if (!window.confirm(
                        `Cancelar a reserva nº ${reserva.id}?`
                    )) {
                        return;
                    }

                    botao.disabled = true;
                    mensagemLista.textContent =
                        "Cancelando reserva...";

                    try {
                        await chamarApi(
                            `/api/agendamentos/${reserva.id}`,
                            { method: "DELETE" }
                        );

                        await carregarReservas();
                        mensagemLista.textContent =
                            `Reserva nº ${reserva.id} cancelada.`;

                    } catch (erro) {
                        tratarErro(erro, mensagemLista);
                        botao.disabled = false;
                    }
                });

                item.appendChild(botao);
            }

            listaReservas.appendChild(item);
        }

        mensagemLista.textContent =
            `${reservas.length} agendamento(s) encontrado(s).`;

    } catch (erro) {
        tratarErro(erro, mensagemLista);

    } finally {
        botaoAtualizar.disabled = false;
    }
}

/**
 * Faz login como cliente.
 */
formLogin.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    mensagemLogin.textContent = "Verificando credenciais...";
    botaoLogin.disabled = true;

    try {
        const dados = await chamarApi(
            "/api/auth/login",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: $("#email-cliente").value.trim(),
                    senha: $("#senha-cliente").value
                })
            },
            false
        );

        if (
            dados.usuario?.papel !== "cliente" ||
            typeof dados.token !== "string"
        ) {
            throw new Error(
                "Esta área é exclusiva para clientes."
            );
        }

        sessionStorage.setItem(CHAVE_TOKEN, dados.token);

        mostrarCliente(dados.usuario);
        await carregarServicos();
        await carregarReservas();

    } catch (erro) {
        mensagemLogin.textContent = erro.message;

    } finally {
        botaoLogin.disabled = false;
    }
});

/**
 * Confirma o agendamento somente apos o servidor
 * salvar a reserva no SQLite.
 */
formReserva.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    confirmacao.hidden = true;

    if (!formReserva.reportValidity()) {
        return;
    }

    const agora = agoraFortaleza();

    if (dataCampo.value < agora.data) {
        mensagemReserva.textContent =
            "Escolha uma data futura.";
        return;
    }

    botaoConfirmar.disabled = true;
    mensagemReserva.textContent =
        "Confirmando seu agendamento...";

    try {
        const reserva = await chamarApi(
            "/api/agendamentos",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    servico_id: Number(servicoCampo.value),
                    data: dataCampo.value,
                    horario: horarioCampo.value
                })
            }
        );

        if (!Number.isSafeInteger(reserva?.id)) {
            throw new Error(
                "O servidor não retornou a confirmação."
            );
        }

        $("#detalhes-confirmacao").textContent =
            `Reserva nº ${reserva.id} — ${reserva.servico}, ` +
            `${formatarInicio(reserva.inicio)}.`;

        confirmacao.hidden = false;
        mensagemReserva.textContent =
            "Sua reserva foi salva com sucesso!";

        await carregarReservas();

    } catch (erro) {
        if (erro.status === 409) {
            mensagemReserva.textContent =
                "Esse horário já está ocupado. Escolha outro.";
        } else {
            tratarErro(erro, mensagemReserva);
        }

    } finally {
        botaoConfirmar.disabled = false;
    }
});

servicoCampo.addEventListener("change", atualizarHorarios);
dataCampo.addEventListener("change", atualizarHorarios);

$("#botao-sair-cliente").addEventListener("click", () => sair());

botaoAtualizar.addEventListener(
    "click",
    () => carregarReservas()
);

/**
 * Restaura uma sessao valida apos atualizar a pagina.
 */
async function iniciar() {
    dataCampo.min = agoraFortaleza().data;

    if (!sessionStorage.getItem(CHAVE_TOKEN)) {
        return;
    }

    try {
        const usuario = await chamarApi("/api/auth/me");

        if (usuario.papel !== "cliente") {
            sair("Entre com uma conta de cliente.");
            return;
        }

        mostrarCliente(usuario);
        await carregarServicos();
        await carregarReservas();

    } catch (erro) {
        if (erro.status === 401) {
            sair("Sua sessão expirou. Faça login novamente.");
        } else {
            mensagemLogin.textContent = erro.message;
        }
    }
}

iniciar();
