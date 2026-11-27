/**
 * Guizao do Corte - Pagina inicial.
 * Exibe disponibilidade real sem divulgar dados pessoais.
 * O cliente confirma a reserva apos login, no painel-cliente.html.
 */
"use strict";

/** Menu responsivo existente. */
function configurarMenuMobile() {
    const botao = document.querySelector(".botao-menu");
    const cabecalho = document.querySelector("header");
    const menu = document.querySelector("#menu-principal");
    if (!botao || !cabecalho || !menu) return;

    document.documentElement.classList.add("js");

    function definirMenu(aberto) {
        cabecalho.classList.toggle("menu-aberto", aberto);
        botao.setAttribute("aria-expanded", String(aberto));
        botao.setAttribute("aria-label", aberto ? "Fechar menu" : "Abrir menu");
    }

    botao.addEventListener("click", () => {
        definirMenu(!cabecalho.classList.contains("menu-aberto"));
    });
    menu.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => definirMenu(false));
    });
    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape") definirMenu(false);
    });
    window.addEventListener("resize", () => {
        if (window.innerWidth > 768) definirMenu(false);
    });
}

/** Data e hora local da barbearia, mesmo que o celular esteja em outro fuso. */
function agoraFortaleza() {
    const formatador = new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Fortaleza",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    });
    const partes = Object.fromEntries(
        formatador.formatToParts(new Date()).map((parte) => [parte.type, parte.value])
    );
    return {
        data: `${partes.year}-${partes.month}-${partes.day}`,
        minutos: Number(partes.hour) * 60 + Number(partes.minute)
    };
}

/** Cria botao acessivel sem interpretar conteudo como HTML. */
function criarQuadradinho(linhas) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "opcao-grade";
    botao.setAttribute("aria-pressed", "false");

    const classes = ["linha-superior", "linha-principal", "linha-inferior"];
    linhas.forEach((texto, indice) => {
        const span = document.createElement("span");
        span.className = classes[indice];
        span.textContent = texto;
        botao.appendChild(span);
    });
    return botao;
}

function selecionarQuadradinho(grade, selecionado) {
    grade.querySelectorAll(".opcao-grade").forEach((botao) => {
        const ativo = botao === selecionado;
        botao.classList.toggle("ativa", ativo);
        botao.setAttribute("aria-pressed", String(ativo));
    });
}

function mostrarAviso(grade, mensagem) {
    const p = document.createElement("p");
    p.className = "mensagem-vazia-grade";
    p.textContent = mensagem;
    grade.replaceChildren(p);
}

/**
 * Carrega servicos e disponibilidades em tempo real.
 * Horarios que se sobrepoem a uma reserva ativa ficam desabilitados.
 */
function configurarFormularioAgendamento() {
    const form = document.querySelector("#form-agendamento");
    const campoServico = document.querySelector("#servico-agendamento");
    const campoData = document.querySelector("#data-agendamento");
    const campoHorario = document.querySelector("#horario-agendamento");
    const gradeDatas = document.querySelector("#lista-datas");
    const gradeHorarios = document.querySelector("#lista-horarios");
    const mensagem = document.querySelector("#mensagem-agendamento");

    if (!form || !campoServico || !campoData || !campoHorario ||
        !gradeDatas || !gradeHorarios || !mensagem) {
        console.error("Formulario de agendamento incompleto.");
        return;
    }

    const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
        "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    let servicos = [];
    let horarios = [];
    let sequenciaConsulta = 0;
    let atualizacaoPendente = false;

    function servicoAtual() {
        return servicos.find((s) => s.id === Number(campoServico.value));
    }

    function limparSelecaoHorario() {
        campoHorario.value = "";
        horarios = [];
    }

    /** Busca somente o estado livre/ocupado, sem obter nomes de clientes. */
    async function atualizarDisponibilidade() {
        const sequencia = ++sequenciaConsulta;
        limparSelecaoHorario();
        const servico = servicoAtual();
        if (!servico || !campoData.value) {
            mostrarAviso(gradeHorarios, "Escolha um serviço e um dia.");
            return;
        }

        atualizacaoPendente = true;
        mostrarAviso(gradeHorarios, "Consultando horários livres e ocupados...");
        mensagem.textContent = "";

        try {
            const parametros = new URLSearchParams({
                data: campoData.value,
                servico_id: String(servico.id)
            });
            const resposta = await fetch(
                `/api/agendamentos/disponibilidade?${parametros.toString()}`,
                { cache: "no-store" }
            );
            const dados = await resposta.json();
            if (!resposta.ok) {
                throw new Error(dados.erro || `Erro HTTP ${resposta.status}`);
            }
            if (!Array.isArray(dados.horarios)) {
                throw new Error("A API retornou uma lista de horários inválida.");
            }
            if (sequencia !== sequenciaConsulta) return;

            horarios = dados.horarios;
            gradeHorarios.replaceChildren();

            for (const item of horarios) {
                const status = item.disponivel ? "Livre" :
                    item.motivo === "ocupado" ? "Ocupado" :
                    item.motivo === "passado" ? "Passou" : "Fechado";

                const botao = criarQuadradinho([
                    "Horário", item.horario, status
                ]);
                botao.classList.add(item.disponivel ? "livre" : "indisponivel");
                if (!item.disponivel && item.motivo === "ocupado") {
                    botao.classList.add("ocupado");
                }
                botao.disabled = !item.disponivel;
                botao.title = `${item.horario} — ${status}`;

                if (item.disponivel) {
                    botao.addEventListener("click", () => {
                        selecionarQuadradinho(gradeHorarios, botao);
                        campoHorario.value = item.horario;
                        mensagem.textContent = "";
                    });
                }
                gradeHorarios.appendChild(botao);
            }
        } catch (erro) {
            if (sequencia !== sequenciaConsulta) return;
            mostrarAviso(gradeHorarios, "Não foi possível consultar a disponibilidade.");
            mensagem.textContent = `${erro.message} Atualize a página e tente novamente.`;
        } finally {
            if (sequencia === sequenciaConsulta) atualizacaoPendente = false;
        }
    }

    function gerarDatas() {
        gradeDatas.replaceChildren();
        const hoje = agoraFortaleza().data;
        const base = new Date(`${hoje}T00:00:00Z`);
        const duracao = servicoAtual()?.duracao_minutos || 30;
        const agora = agoraFortaleza();
        const proximoSlot = Math.ceil((agora.minutos + 1) / 30) * 30;
        const inicioAutomatico = proximoSlot + duracao > 1080 ? 1 : 0;
        let botaoInicial = null;

        for (let i = 0; i < 14; i++) {
            const dia = new Date(base.getTime() + i * 86400000);
            const iso = dia.toISOString().slice(0, 10);
            const botao = criarQuadradinho([
                i === 0 ? "Hoje" : diasSemana[dia.getUTCDay()],
                String(dia.getUTCDate()).padStart(2, "0"),
                meses[dia.getUTCMonth()]
            ]);
            botao.title = iso;
            botao.addEventListener("click", () => {
                selecionarQuadradinho(gradeDatas, botao);
                campoData.value = iso;
                atualizarDisponibilidade();
            });
            gradeDatas.appendChild(botao);
            if (i === inicioAutomatico) botaoInicial = botao;
        }
        botaoInicial?.click();
    }

    async function carregarServicos() {
        try {
            const resposta = await fetch("/api/servicos", { cache: "no-store" });
            const dados = await resposta.json();
            if (!resposta.ok || !Array.isArray(dados)) {
                throw new Error(dados.erro || "Erro ao carregar serviços.");
            }
            servicos = dados;
            campoServico.replaceChildren();
            campoServico.appendChild(new Option("Selecione o serviço", ""));
            for (const servico of servicos) {
                const preco = (servico.preco_centavos / 100)
                    .toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
                campoServico.appendChild(new Option(`${servico.nome} — ${preco}`, String(servico.id)));
            }
            if (!servicos.length) {
                mostrarAviso(gradeHorarios, "Nenhum serviço disponível.");
                mensagem.textContent = "Nenhum serviço cadastrado no momento.";
                return;
            }
            // O primeiro servico ativo e selecionado para a grade ja mostrar estados.
            campoServico.value = String(servicos[0].id);
            gerarDatas();

            document.querySelectorAll(".card-servico").forEach((cartao) => {
                const nome = cartao.querySelector("h3")?.textContent.trim();
                const servico = servicos.find((s) => s.nome === nome);
                if (!servico) return;
                const precoTag = cartao.querySelector(".preco-servico");
                if (precoTag) {
                    precoTag.textContent = (servico.preco_centavos / 100)
                        .toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
                }
            });
        } catch (erro) {
            campoServico.replaceChildren(new Option("Falha ao carregar serviços", ""));
            mostrarAviso(gradeHorarios, "Não foi possível carregar os serviços.");
            mensagem.textContent = erro.message;
        }
    }

    campoServico.addEventListener("change", () => {
        limparSelecaoHorario();
        gerarDatas();
    });

    document.querySelectorAll(".botao-servico").forEach((link) => {
        link.href = "#agendamento";
        link.removeAttribute("target");
        link.removeAttribute("rel");
        link.addEventListener("click", () => {
            const nome = link.closest(".card-servico")?.querySelector("h3")?.textContent.trim();
            const encontrado = servicos.find((servico) => servico.nome === nome);
            if (encontrado) {
                campoServico.value = String(encontrado.id);
                gerarDatas();
            }
        });
    });

    // Um bloqueio local impede duplo clique durante a nova consulta à API.
    // A reserva definitiva continua protegida pelo servidor e pela transação SQLite.
    const botaoEnvio = form.querySelector('[type="submit"]');
    let envioPendente = false;
    form.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        if (envioPendente) return;
        if (!form.reportValidity()) return;

        const escolhido = servicoAtual();
        if (!escolhido || !campoData.value || !campoHorario.value) {
            mensagem.textContent = "Escolha serviço, dia e um horário Livre.";
            return;
        }

        envioPendente = true;
        if (botaoEnvio) botaoEnvio.disabled = true;
        try {
            if (atualizacaoPendente || !horarios.some((h) =>
                h.horario === campoHorario.value && h.disponivel)) {
                mensagem.textContent = "Esse horário não está disponível. Escolha outro.";
                await atualizarDisponibilidade();
                return;
            }

            // Uma segunda consulta evita prosseguir com vaga desatualizada.
            const escolhidoHorario = campoHorario.value;
            await atualizarDisponibilidade();
            const aindaLivre = horarios.some((h) =>
                h.horario === escolhidoHorario && h.disponivel);
            if (!aindaLivre || atualizacaoPendente) {
                mensagem.textContent = "O horário foi ocupado. Escolha outro.";
                return;
            }
            const parametros = new URLSearchParams({
                servico: escolhido.nome,
                data: campoData.value,
                horario: escolhidoHorario
            });
            window.location.assign(`/painel-cliente.html?${parametros.toString()}`);
        } catch (erro) {
            mensagem.textContent = erro.message || "Falha ao confirmar o horário.";
        } finally {
            envioPendente = false;
            if (botaoEnvio) botaoEnvio.disabled = false;
        }
    });

    // Quando a pessoa retorna ao site, mostra disponibilidade atualizada.
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden && servicoAtual()) atualizarDisponibilidade();
    });
    window.addEventListener("focus", () => {
        if (document.visibilityState === "visible" && servicoAtual()) {
            atualizarDisponibilidade();
        }
    });

    mostrarAviso(gradeHorarios, "Carregando disponibilidade...");
    carregarServicos();
}

document.addEventListener("DOMContentLoaded", () => {
    configurarMenuMobile();
    configurarFormularioAgendamento();
});
