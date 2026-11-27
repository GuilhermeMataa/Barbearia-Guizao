
/**
 * Guizao do Corte - Funcionalidades do frontend.
 * Controla o menu mobile, as datas e os horários.
 * Envia solicitações de agendamento pelo WhatsApp.
 */

"use strict";

const telefoneBarbearia = "5588981315016";

/**
 * Configura a abertura e o fechamento do menu mobile.
 */
function configurarMenuMobile() {
    const botao = document.querySelector(".botao-menu");
    const cabecalho = document.querySelector("header");
    const menu = document.querySelector("#menu-principal");

    if (!botao || !cabecalho || !menu) {
        return;
    }

    document.documentElement.classList.add("js");

    function definirMenu(aberto) {
        cabecalho.classList.toggle("menu-aberto", aberto);

        botao.setAttribute("aria-expanded", String(aberto));
        botao.setAttribute(
            "aria-label",
            aberto ? "Fechar menu" : "Abrir menu"
        );
    }

    botao.addEventListener("click", () => {
        const aberto = cabecalho.classList.contains("menu-aberto");
        definirMenu(!aberto);
    });

    menu.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => definirMenu(false));
    });

    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape") {
            definirMenu(false);
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 768) {
            definirMenu(false);
        }
    });
}

/**
 * Formata uma data local para AAAA-MM-DD.
 * Evita diferenças de fuso horário causadas por UTC.
 * @param {Date} data
 * @returns {string}
 */
function formatarDataISO(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

/**
 * Cria um quadradinho acessível para data ou horário.
 * Usa textContent para inserir os textos com segurança.
 * @param {string[]} linhas
 * @returns {HTMLButtonElement}
 */
function criarQuadradinho(linhas) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "opcao-grade";
    botao.setAttribute("aria-pressed", "false");

    const classes = [
        "linha-superior",
        "linha-principal",
        "linha-inferior"
    ];

    linhas.forEach((texto, indice) => {
        const span = document.createElement("span");
        span.className = classes[indice];
        span.textContent = texto;
        botao.appendChild(span);
    });

    return botao;
}

/**
 * Marca apenas uma opção como selecionada.
 * @param {HTMLElement} grade
 * @param {HTMLButtonElement} selecionado
 */
function selecionarQuadradinho(grade, selecionado) {
    grade.querySelectorAll(".opcao-grade").forEach((botao) => {
        const ativo = botao === selecionado;
        botao.classList.toggle("ativa", ativo);
        botao.setAttribute("aria-pressed", String(ativo));
    });
}

/**
 * Apresenta um aviso dentro de uma grade.
 * @param {HTMLElement} grade
 * @param {string} texto
 */
function mostrarAviso(grade, texto) {
    const aviso = document.createElement("p");
    aviso.className = "mensagem-vazia-grade";
    aviso.textContent = texto;

    grade.replaceChildren(aviso);
}

/**
 * Configura a seleção de datas e horários.
 *
 * Os horários são sugestões, não vagas confirmadas.
 * A disponibilidade real será verificada pela API.
 */
function configurarFormularioAgendamento() {
    const form = document.querySelector("#form-agendamento");
    const nome = document.querySelector("#nome-cliente");
    const servico = document.querySelector("#servico-agendamento");
    const data = document.querySelector("#data-agendamento");
    const horario = document.querySelector("#horario-agendamento");

    const listaDatas = document.querySelector("#lista-datas");
    const listaHorarios = document.querySelector("#lista-horarios");
    const mensagem = document.querySelector("#mensagem-agendamento");

    if (
        !form || !nome || !servico || !data || !horario ||
        !listaDatas || !listaHorarios || !mensagem
    ) {
        console.error("Elementos do formulário não encontrados.");
        return;
    }

    const diasSemana = [
        "Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"
    ];

    const meses = [
        "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
        "Jul", "Ago", "Set", "Out", "Nov", "Dez"
    ];

    /**
     * Gera horários de exemplo das 09h às 17h30.
     * Considera o horário local ao esconder horários passados.
     * @param {string} dataSelecionada
     */
    function gerarHorarios(dataSelecionada) {
        listaHorarios.replaceChildren();
        horario.value = "";

        const agora = new Date();
        const hojeISO = formatarDataISO(agora);
        let quantidade = 0;

        for (let minutos = 540; minutos < 1080; minutos += 30) {
            const horas = Math.floor(minutos / 60);
            const mins = minutos % 60;

            const textoHorario =
                `${String(horas).padStart(2, "0")}:` +
                `${String(mins).padStart(2, "0")}`;

            // Não oferece horários já passados no dia atual.
            if (dataSelecionada === hojeISO) {
                const minutosAtuais =
                    agora.getHours() * 60 + agora.getMinutes();

                if (minutos <= minutosAtuais) {
                    continue;
                }
            }

            const botao = criarQuadradinho([
                "Horário",
                textoHorario,
                "Selecionar"
            ]);

            botao.addEventListener("click", () => {
                selecionarQuadradinho(listaHorarios, botao);
                horario.value = textoHorario;
                mensagem.textContent = "";
            });

            listaHorarios.appendChild(botao);
            quantidade++;
        }

        if (quantidade === 0) {
            mostrarAviso(
                listaHorarios,
                "Não há mais horários sugeridos para hoje."
            );
        }
    }

    /**
     * Gera os próximos sete dias em formato de quadradinhos.
     */
    function gerarDatas() {
        listaDatas.replaceChildren();

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        for (let i = 0; i < 7; i++) {
            const diaAtual = new Date(hoje);
            diaAtual.setDate(hoje.getDate() + i);

            const valorISO = formatarDataISO(diaAtual);

            const botao = criarQuadradinho([
                i === 0 ? "Hoje" : diasSemana[diaAtual.getDay()],
                String(diaAtual.getDate()).padStart(2, "0"),
                meses[diaAtual.getMonth()]
            ]);

            botao.addEventListener("click", () => {
                selecionarQuadradinho(listaDatas, botao);

                data.value = valorISO;
                mensagem.textContent = "";

                gerarHorarios(valorISO);
            });

            listaDatas.appendChild(botao);
        }
    }

    // Ao clicar em um card, seleciona seu serviço.
    document.querySelectorAll(".botao-servico").forEach((botao) => {
        botao.href = "#agendamento";
        botao.removeAttribute("target");
        botao.removeAttribute("rel");

        botao.addEventListener("click", () => {
            const cartao = botao.closest(".card-servico");
            const titulo = cartao?.querySelector("h3");

            if (titulo) {
                servico.value = titulo.textContent.trim();
            }
        });
    });

    // Valida a seleção antes de abrir o WhatsApp.
    form.addEventListener("submit", (evento) => {
        evento.preventDefault();
        mensagem.textContent = "";

        if (!form.reportValidity()) {
            return;
        }

        if (!nome.value.trim()) {
            mensagem.textContent = "Informe seu nome.";
            return;
        }

        if (!data.value) {
            mensagem.textContent = "Selecione uma data.";
            return;
        }

        if (!horario.value) {
            mensagem.textContent = "Selecione um horário.";
            return;
        }

        const [ano, mes, dia] = data.value.split("-").map(Number);
        const [hora, minuto] = horario.value.split(":").map(Number);

        const dataEscolhida = new Date(
            ano, mes - 1, dia, hora, minuto
        );

        if (dataEscolhida <= new Date()) {
            mensagem.textContent =
                "Esse horário já passou. Escolha outro.";
            gerarHorarios(data.value);
            return;
        }

        const dataFormatada =
            `${String(dia).padStart(2, "0")}/` +
            `${String(mes).padStart(2, "0")}/${ano}`;

        const texto =
            `Olá! Meu nome é ${nome.value.trim()}.\n` +
            `Gostaria de solicitar um agendamento na Guizao do Corte.\n\n` +
            `Serviço: ${servico.value}\n` +
            `Data: ${dataFormatada}\n` +
            `Horário: ${horario.value}\n\n` +
            `Esse horário está disponível?`;

        const url =
            `https://wa.me/${telefoneBarbearia}?text=` +
            encodeURIComponent(texto);

        window.location.assign(url);
    });

    // Inicializa o calendário assim que a página carrega.
    gerarDatas();

    mostrarAviso(
        listaHorarios,
        "Escolha uma data para visualizar os horários."
    );
}

/**
 * Inicializa as funcionalidades após carregar o HTML.
 */
document.addEventListener("DOMContentLoaded", () => {
    configurarMenuMobile();
    configurarFormularioAgendamento();
});
