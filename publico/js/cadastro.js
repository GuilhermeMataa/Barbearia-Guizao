
/**
 * Guizao do Corte - Cadastro de clientes.
 */

"use strict";

const formulario = document.querySelector("#form-cadastro");
const nome = document.querySelector("#cadastro-nome");
const email = document.querySelector("#cadastro-email");
const senha = document.querySelector("#cadastro-senha");
const confirmar = document.querySelector("#cadastro-confirmar");

const mensagem = document.querySelector("#mensagem-cadastro");
const botao = document.querySelector("#botao-cadastrar");
const linkEntrar = document.querySelector("#link-entrar-depois");

// Mantem serviço, data e horario quando o cliente
// vem da pagina inicial para criar sua conta.
const destinoLogin =
    "/painel-cliente.html" + window.location.search;

document.querySelector("#link-login").href = destinoLogin;
document.querySelector("#link-login-inferior").href =
    destinoLogin;

linkEntrar.href = destinoLogin;

/**
 * Envia os dados para a API de cadastro.
 */
formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    mensagem.textContent = "";
    linkEntrar.hidden = true;

    if (!formulario.reportValidity()) {
        return;
    }

    if (senha.value !== confirmar.value) {
        mensagem.textContent =
            "As senhas não são iguais.";
        return;
    }

    if (
        senha.value.length < 12 ||
        new TextEncoder().encode(senha.value).length > 72
    ) {
        mensagem.textContent =
            "A senha deve ter pelo menos 12 caracteres " +
            "e no máximo 72 bytes.";
        return;
    }

    botao.disabled = true;
    botao.textContent = "Criando conta...";
    mensagem.textContent = "Salvando seu cadastro...";

    try {
        const resposta = await fetch("/api/auth/cadastro", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nome: nome.value.trim(),
                email: email.value.trim(),
                senha: senha.value
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.erro || "Não foi possível criar a conta."
            );
        }

        // Limpa os campos de senha.
        senha.value = "";
        confirmar.value = "";

        formulario.hidden = true;

        mensagem.textContent =
            "Conta criada com sucesso! " +
            "Agora entre com seu e-mail e senha.";

        linkEntrar.hidden = false;

    } catch (erro) {
        mensagem.textContent =
            erro.message || "Erro de conexão.";

    } finally {
        botao.disabled = false;
        botao.textContent = "Criar conta";
    }
});
