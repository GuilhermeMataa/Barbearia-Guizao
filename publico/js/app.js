
/**
 * Guizao do Corte - Interações do frontend.
 * Configura os links dos serviços para solicitar
 * agendamentos personalizados pelo WhatsApp.
 */

"use strict";

// Número da barbearia com o código do Brasil.
const telefoneBarbearia = "5588981315016";

/**
 * Configura o link do WhatsApp para cada serviço.
 * O nome é obtido do próprio cartão, evitando
 * repetir os nomes em vários lugares do código.
 */
function configurarAgendamentos() {
    const botoes = document.querySelectorAll(".botao-servico");

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

        const mensagemCodificada = encodeURIComponent(mensagem);

        botao.href =
            `https://wa.me/${telefoneBarbearia}?text=${mensagemCodificada}`;

        botao.target = "_blank";
        botao.rel = "noopener noreferrer";

        botao.setAttribute(
            "aria-label",
            `Consultar agendamento de ${nomeServico} pelo WhatsApp`
        );
    });
}

// Executa quando a estrutura HTML estiver pronta.
document.addEventListener("DOMContentLoaded", configurarAgendamentos);
