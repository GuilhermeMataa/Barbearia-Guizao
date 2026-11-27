
/**
 * Guizao do Corte - Funcionalidades do frontend.
 *
 * Controla o menu mobile, o calendario e os horarios.
 * Encaminha o cliente para confirmar a reserva no sistema.
 *
 * Nao utiliza WhatsApp para agendamentos.
 */

"use strict";

/**
 * Configura o menu mobile.
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

        botao.setAttribute(
            "aria-expanded",
            String(aberto)
        );

        botao.setAttribute(
            "aria-label",
            aberto ? "Fechar menu" : "Abrir menu"
        );
    }

    botao.addEventListener("click", () => {
        const aberto = cabecalho.classList.contains(
            "menu-aberto"
        );

        definirMenu(!aberto);
    });

    menu.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
            definirMenu(false);
        });
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
 * Retorna a data e a hora atuais de Fortaleza.
 *
 * @returns {{data: string, minutos: number}}
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
            .map((parte) => [
                parte.type,
                parte.value
            ])
    );

    return {
        data:
            `${partes.year}-${partes.month}-${partes.day}`,

        minutos:
            Number(partes.hour) * 60 +
            Number(partes.minute)
    };
}

/**
 * Cria um quadradinho para data ou horario.
 * Usa textContent para evitar inserir HTML externo.
 *
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
 * Marca uma opcao como selecionada.
 */
function selecionarQuadradinho(grade, selecionado) {
    grade.querySelectorAll(".opcao-grade")
        .forEach((botao) => {
            const ativo = botao === selecionado;

            botao.classList.toggle("ativa", ativo);

            botao.setAttribute(
                "aria-pressed",
                String(ativo)
            );
        });
}

/**
 * Mostra uma mensagem dentro da grade.
 */
function mostrarAviso(grade, texto) {
    const aviso = document.createElement("p");

    aviso.className = "mensagem-vazia-grade";
    aviso.textContent = texto;

    grade.replaceChildren(aviso);
}

/**
 * Configura o formulario da pagina inicial.
 *
 * O formulario NAO cadastra reservas diretamente.
 * Ele encaminha as escolhas para o painel do cliente.
 */
function configurarFormularioAgendamento() {
    const form = document.querySelector(
        "#form-agendamento"
    );

    const servico = document.querySelector(
        "#servico-agendamento"
    );

    const data = document.querySelector(
        "#data-agendamento"
    );

    const horario = document.querySelector(
        "#horario-agendamento"
    );

    const listaDatas = document.querySelector(
        "#lista-datas"
    );

    const listaHorarios = document.querySelector(
        "#lista-horarios"
    );

    const mensagem = document.querySelector(
        "#mensagem-agendamento"
    );

    if (
        !form ||
        !servico ||
        !data ||
        !horario ||
        !listaDatas ||
        !listaHorarios ||
        !mensagem
    ) {
        console.error(
            "Elementos do formulario nao encontrados."
        );

        return;
    }

    const diasSemana = [
        "Dom", "Seg", "Ter", "Qua",
        "Qui", "Sex", "Sáb"
    ];

    const meses = [
        "Jan", "Fev", "Mar", "Abr",
        "Mai", "Jun", "Jul", "Ago",
        "Set", "Out", "Nov", "Dez"
    ];

    /**
     * Gera horarios entre 09:00 e 17:30.
     *
     * A disponibilidade definitiva sera verificada
     * no backend durante a confirmacao.
     */
    function gerarHorarios(dataSelecionada) {
        listaHorarios.replaceChildren();

        horario.value = "";

        const agora = agoraFortaleza();

        let quantidade = 0;

        for (
            let minutos = 540;
            minutos < 1080;
            minutos += 30
        ) {
            const horas = Math.floor(minutos / 60);
            const mins = minutos % 60;

            const textoHorario =
                `${String(horas).padStart(2, "0")}:` +
                `${String(mins).padStart(2, "0")}`;

            // Nao permite selecionar horarios passados.
            if (
                dataSelecionada === agora.data &&
                minutos <= agora.minutos
            ) {
                continue;
            }

            const botao = criarQuadradinho([
                "Horário",
                textoHorario,
                "Selecionar"
            ]);

            botao.addEventListener("click", () => {
                selecionarQuadradinho(
                    listaHorarios,
                    botao
                );

                horario.value = textoHorario;
                mensagem.textContent = "";
            });

            listaHorarios.appendChild(botao);

            quantidade++;
        }

        if (quantidade === 0) {
            mostrarAviso(
                listaHorarios,
                "Não existem mais horários futuros para hoje."
            );
        }
    }

    /**
     * Gera os proximos sete dias em quadradinhos.
     */
    function gerarDatas() {
        listaDatas.replaceChildren();

        const hojeISO = agoraFortaleza().data;

        // Usamos UTC apenas para calcular os dias.
        const hoje = new Date(`${hojeISO}T00:00:00Z`);

        for (let i = 0; i < 7; i++) {
            const diaAtual = new Date(
                hoje.getTime() + i * 86400000
            );

            const valorISO = diaAtual
                .toISOString()
                .slice(0, 10);

            const botao = criarQuadradinho([
                i === 0
                    ? "Hoje"
                    : diasSemana[diaAtual.getUTCDay()],

                String(
                    diaAtual.getUTCDate()
                ).padStart(2, "0"),

                meses[diaAtual.getUTCMonth()]
            ]);

            botao.addEventListener("click", () => {
                selecionarQuadradinho(
                    listaDatas,
                    botao
                );

                data.value = valorISO;
                horario.value = "";

                mensagem.textContent = "";

                gerarHorarios(valorISO);
            });

            listaDatas.appendChild(botao);
        }
    }

    /**
     * Seleciona um servico ao clicar no card.
     */
    document.querySelectorAll(".botao-servico")
        .forEach((botao) => {
            botao.href = "#agendamento";

            botao.removeAttribute("target");
            botao.removeAttribute("rel");

            botao.addEventListener("click", () => {
                const cartao = botao.closest(
                    ".card-servico"
                );

                const titulo = cartao?.querySelector("h3");

                if (titulo) {
                    servico.value =
                        titulo.textContent.trim();
                }

                mensagem.textContent = "";
            });
        });

    /**
     * Continua para a area do cliente.
     *
     * Nenhuma reserva e confirmada nesta pagina.
     * A confirmacao acontece apos login no painel.
     */
    form.addEventListener("submit", (evento) => {
        evento.preventDefault();

        mensagem.textContent = "";

        if (!form.reportValidity()) {
            return;
        }

        if (!servico.value) {
            mensagem.textContent =
                "Selecione um serviço.";

            return;
        }

        if (!data.value) {
            mensagem.textContent =
                "Selecione uma data.";

            return;
        }

        if (!horario.value) {
            mensagem.textContent =
                "Selecione um horário.";

            return;
        }

        const agora = agoraFortaleza();

        if (data.value < agora.data) {
            mensagem.textContent =
                "Essa data já passou. Escolha outra.";

            gerarDatas();
            return;
        }

        if (data.value === agora.data) {
            const [hora, minuto] = horario.value
                .split(":")
                .map(Number);

            const minutosEscolhidos =
                hora * 60 + minuto;

            if (minutosEscolhidos <= agora.minutos) {
                mensagem.textContent =
                    "Esse horário já passou. Escolha outro.";

                gerarHorarios(data.value);
                return;
            }
        }

        // Envia somente as escolhas para o painel.
        // Nenhuma senha ou token vai na URL.
        const parametros = new URLSearchParams({
            servico: servico.value,
            data: data.value,
            horario: horario.value
        });

        window.location.assign(
            `/painel-cliente.html?${parametros.toString()}`
        );
    });

    // Inicializa o calendario.
    gerarDatas();

    mostrarAviso(
        listaHorarios,
        "Escolha uma data para visualizar os horários."
    );
}

/**
 * Inicializa o frontend.
 */
document.addEventListener("DOMContentLoaded", () => {
    configurarMenuMobile();
    configurarFormularioAgendamento();
});
