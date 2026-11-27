
/**
 * Guizao do Corte - Painel do proprietario.
 * Acesso aos dados protegido pela API e pelo JWT.
 */

"use strict";

const secaoLogin = document.querySelector("#secao-login");
const secaoPainel = document.querySelector("#secao-painel");

const formularioLogin = document.querySelector("#form-login-admin");
const email = document.querySelector("#email-admin");
const senha = document.querySelector("#senha-admin");

const botaoEntrar = document.querySelector("#botao-entrar");
const botaoSair = document.querySelector("#botao-sair");
const botaoAtualizar = document.querySelector("#botao-atualizar");

const mensagemLogin = document.querySelector("#mensagem-login");
const mensagemAgendas = document.querySelector("#mensagem-agendas");

const nomeAdmin = document.querySelector("#nome-admin");
const resumo = document.querySelector("#resumo-agendamentos");
const corpoTabela = document.querySelector("#corpo-agendamentos");

const CHAVE_TOKEN = "guizao_token";

/**
 * Faz uma requisicao autenticada.
 * @param {string} caminho
 * @param {object} opcoes
 * @returns {Promise<any>}
 */
async function chamarApi(caminho, opcoes = {}) {
    const token = sessionStorage.getItem(CHAVE_TOKEN);

    const resposta = await fetch(caminho, {
        ...opcoes,
        headers: {
            ...opcoes.headers,
            Authorization: `Bearer ${token}`
        }
    });

    let dados = null;

    if (resposta.status !== 204) {
        try {
            dados = await resposta.json();
        } catch {
            // Algumas respostas nao possuem JSON.
        }
    }

    if (!resposta.ok) {
        const erro = new Error(
            dados?.erro || "Erro ao acessar o servidor."
        );

        erro.status = resposta.status;
        throw erro;
    }

    return dados;
}

/**
 * Exibe a tela de login.
 */
function exibirLogin(texto = "") {
    secaoPainel.hidden = true;
    secaoLogin.hidden = false;

    corpoTabela.replaceChildren();
    mensagemLogin.textContent = texto;
}

/**
 * Exibe o painel com os dados do administrador.
 */
function exibirPainel(usuario) {
    nomeAdmin.textContent = usuario.nome;

    secaoLogin.hidden = true;
    secaoPainel.hidden = false;

    senha.value = "";
}

/**
 * Formata a data retornada pelo SQLite.
 * Exemplo: 2026-12-01 15:00:00 -> 01/12/2026 15:00
 */
function formatarData(dataTexto) {
    if (
        typeof dataTexto !== "string" ||
        !dataTexto.includes(" ")
    ) {
        return String(dataTexto ?? "");
    }

    const [data, hora] = dataTexto.split(" ");
    const [ano, mes, dia] = data.split("-");

    return `${dia}/${mes}/${ano} ${hora.slice(0, 5)}`;
}

/**
 * Cria uma celula sem inserir HTML vindo do banco.
 */
function criarCelula(valor) {
    const celula = document.createElement("td");
    celula.textContent = String(valor ?? "");
    return celula;
}

/**
 * Encerra a sessao local.
 */
function sair(mensagem = "Você saiu da sua conta.") {
    sessionStorage.removeItem(CHAVE_TOKEN);
    exibirLogin(mensagem);
}

function tratarErroAcesso(erro) {
    if (erro.status === 401) {
        sair("Sessão expirada. Faça login novamente.");
        return;
    }

    mensagemAgendas.textContent = erro.message;
}

/**
 * Desenha a lista de reservas do SQLite.
 */
function desenharAgendamentos(agendamentos) {
    corpoTabela.replaceChildren();

    const ativos = agendamentos.filter(
        (item) => item.status === "agendado"
    );

    resumo.textContent =
        `${agendamentos.length} reserva(s) no total. ` +
        `${ativos.length} agendada(s).`;

    if (agendamentos.length === 0) {
        const linha = document.createElement("tr");
        const celula = document.createElement("td");

        celula.colSpan = 7;
        celula.textContent =
            "Nenhum agendamento encontrado.";

        linha.appendChild(celula);
        corpoTabela.appendChild(linha);
        return;
    }

    for (const agendamento of agendamentos) {
        const linha = document.createElement("tr");

        linha.appendChild(criarCelula(agendamento.id));
        linha.appendChild(criarCelula(agendamento.cliente));
        linha.appendChild(criarCelula(agendamento.servico));
        linha.appendChild(
            criarCelula(formatarData(agendamento.inicio))
        );
        linha.appendChild(
            criarCelula(formatarData(agendamento.fim))
        );

        const status = criarCelula(agendamento.status);
        status.className = "status-agendamento";
        linha.appendChild(status);

        const colunaAcoes = document.createElement("td");

        if (agendamento.status === "agendado") {
            const botao = document.createElement("button");

            botao.type = "button";
            botao.className = "botao-cancelar";
            botao.textContent = "Cancelar";

            botao.addEventListener("click", () => {
                cancelarReserva(agendamento.id);
            });

            colunaAcoes.appendChild(botao);
        } else {
            colunaAcoes.textContent = "—";
        }

        linha.appendChild(colunaAcoes);
        corpoTabela.appendChild(linha);
    }
}

/**
 * Busca os agendamentos reais na API.
 */
async function carregarAgendamentos(mensagemSucesso = "") {
    mensagemAgendas.textContent = "Carregando agendamentos...";
    botaoAtualizar.disabled = true;

    try {
        const agendamentos = await chamarApi(
            "/api/agendamentos"
        );

        if (!Array.isArray(agendamentos)) {
            throw new Error(
                "Resposta inesperada do servidor."
            );
        }

        desenharAgendamentos(agendamentos);

        mensagemAgendas.textContent =
            mensagemSucesso || "Lista carregada com sucesso.";

    } catch (erro) {
        tratarErroAcesso(erro);

    } finally {
        botaoAtualizar.disabled = false;
    }
}

/**
 * Cancela uma reserva pelo ID.
 */
async function cancelarReserva(id) {
    const confirmou = window.confirm(
        `Deseja cancelar o agendamento número ${id}?`
    );

    if (!confirmou) {
        return;
    }

    mensagemAgendas.textContent = "Cancelando agendamento...";

    try {
        await chamarApi(`/api/agendamentos/${id}`, {
            method: "DELETE"
        });

        await carregarAgendamentos(
            `Agendamento número ${id} cancelado com sucesso!`
        );

    } catch (erro) {
        tratarErroAcesso(erro);
    }
}

/**
 * Login do proprietario.
 */
formularioLogin.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    mensagemLogin.textContent = "Verificando login...";
    botaoEntrar.disabled = true;

    try {
        const resposta = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email.value.trim(),
                senha: senha.value
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.erro || "Não foi possível fazer login."
            );
        }

        if (
            dados.usuario?.papel !== "admin" ||
            typeof dados.token !== "string"
        ) {
            throw new Error(
                "Esta área é exclusiva do proprietário."
            );
        }

        sessionStorage.setItem(
            CHAVE_TOKEN,
            dados.token
        );

        exibirPainel(dados.usuario);
        await carregarAgendamentos();

    } catch (erro) {
        mensagemLogin.textContent = erro.message;

    } finally {
        botaoEntrar.disabled = false;
    }
});

botaoSair.addEventListener("click", () => sair());

botaoAtualizar.addEventListener(
    "click",
    () => carregarAgendamentos("Lista atualizada!")
);

/**
 * Verifica se ja existe uma sessao valida.
 */
async function verificarSessao() {
    if (!sessionStorage.getItem(CHAVE_TOKEN)) {
        return;
    }

    try {
        const usuario = await chamarApi("/api/auth/me");

        if (usuario.papel !== "admin") {
            sair("Entre com uma conta de administrador.");
            return;
        }

        exibirPainel(usuario);
        await carregarAgendamentos();

    } catch (erro) {
        if (erro.status === 401) {
            sair("Faça login novamente.");
        } else {
            mensagemLogin.textContent = erro.message;
        }
    }
}

verificarSessao();
