
/**
 * Guizao do Corte - Interações do frontend.
 * Controla o menu mobile e configura os links
 * de agendamento dos serviços pelo WhatsApp.
 */

"use strict";

const telefoneBarbearia = "5588981315016";

/**
 * Configura os links personalizados do WhatsApp.
 * O nome de cada serviço vem do título do cartão.
 */
function configurarAgendamentos() {

    const botoes = document.querySelectorAll(
        ".botao-servico"
    );

    botoes.forEach((botao) => {

        const cartao = botao.closest(".card-servico");

        if (!cartao) {
            return;
        }

        const titulo = cartao.querySelector("h3");

        if (!titulo) {
            return;
        }

        const nomeServico = titulo.textContent.trim();

        const mensagem =
            `Olá! Gostaria de agendar o serviço: ${nomeServico}. ` +
            "Qual é a disponibilidade?";

        botao.href =
            `https://wa.me/${telefoneBarbearia}?text=` +
            encodeURIComponent(mensagem);

        botao.target = "_blank";
        botao.rel = "noopener noreferrer";

        botao.setAttribute(
            "aria-label",
            `Consultar ${nomeServico} pelo WhatsApp`
        );
    });
}

/**
 * Configura o menu para dispositivos móveis.
 * Mantém o atributo aria-expanded atualizado
 * para indicar se a navegação está aberta.
 */
function configurarMenuMobile() {

    const botao = document.querySelector(".botao-menu");
    const cabecalho = document.querySelector("header");
    const menu = document.querySelector("#menu-principal");

    if (!botao || !cabecalho || !menu) {
        return;
    }

    // Só ativa a navegação recolhível quando
    // os controles JavaScript estão preparados.
    document.documentElement.classList.add("js");

    /**
     * Atualiza o estado visual e acessível do menu.
     * @param {boolean} aberto
     */
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

    // Abre ou fecha ao clicar no botão.
    botao.addEventListener("click", () => {

        const aberto = cabecalho.classList.contains(
            "menu-aberto"
        );

        definirMenu(!aberto);
    });

    // Fecha ao escolher uma seção da página.
    menu.querySelectorAll("a").forEach((link) => {

        link.addEventListener("click", () => {
            definirMenu(false);
        });
    });

    // Fecha com a tecla Escape.
    document.addEventListener("keydown", (evento) => {

        if (evento.key === "Escape") {
            definirMenu(false);
        }
    });

    // Reinicia o menu ao retornar para o desktop.
    window.addEventListener("resize", () => {

        if (window.innerWidth > 768) {
            definirMenu(false);
        }
    });
}

/**
 * Inicializa as funcionalidades após o HTML
 * estar disponível no navegador.
 */
document.addEventListener("DOMContentLoaded", () => {

    configurarAgendamentos();
    configurarMenuMobile();

});
