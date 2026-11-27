
/**
 * Guizao do Corte - Dados iniciais de teste.
 * Camada: dados.
 * Insere servicos e usuarios sem duplicar registros.
 */

"use strict";

const bcrypt = require("bcrypt");
const db = require("./conexao");

// Valores demonstrativos. Poderao ser alterados
// futuramente pelo administrador da barbearia.
const servicos = [
    {
        nome: "Corte masculino",
        descricao: "Corte de cabelo masculino.",
        duracao: 30,
        preco: 3000
    },
    {
        nome: "Barba",
        descricao: "Modelagem e acabamento da barba.",
        duracao: 30,
        preco: 2000
    },
    {
        nome: "Corte + Barba",
        descricao: "Corte masculino e barba.",
        duracao: 60,
        preco: 4500
    }
];

/**
 * Valida as credenciais de um usuario de teste.
 * As senhas sao lidas do .env, nunca do codigo.
 *
 * @param {string} nome
 * @param {string} email
 * @param {string} senha
 * @param {"admin"|"cliente"} papel
 * @returns {object}
 */
function prepararUsuario(nome, email, senha, papel) {
    const emailLimpo = String(email || "")
        .trim()
        .toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
        throw new Error(
            `Configure um email valido para ${papel} no .env.`
        );
    }

    if (
        typeof senha !== "string" ||
        senha.length < 12 ||
        Buffer.byteLength(senha, "utf8") > 72
    ) {
        throw new Error(
            `A senha de ${papel} deve ter pelo menos ` +
            "12 caracteres e no maximo 72 bytes."
        );
    }

    return {
        nome,
        email: emailLimpo,
        senha,
        papel
    };
}

try {
    // Usuarios de teste configurados localmente.
    const usuarios = [
        prepararUsuario(
            "Administrador de Teste",
            process.env.SEED_ADMIN_EMAIL,
            process.env.SEED_ADMIN_PASSWORD,
            "admin"
        ),
        prepararUsuario(
            "Cliente de Teste",
            process.env.SEED_CLIENT_EMAIL,
            process.env.SEED_CLIENT_PASSWORD,
            "cliente"
        )
    ];

    if (usuarios[0].email === usuarios[1].email) {
        throw new Error(
            "Administrador e cliente devem ter emails diferentes."
        );
    }

    // SQL parametrizado: valores nunca sao
    // concatenados diretamente na consulta.
    const inserirServico = db.prepare(`
        INSERT INTO servicos (
            nome,
            descricao,
            duracao_minutos,
            preco_centavos
        )
        VALUES (?, ?, ?, ?)
        ON CONFLICT(nome) DO NOTHING
    `);

    const inserirUsuario = db.prepare(`
        INSERT INTO usuarios (
            nome,
            email,
            senha_hash,
            papel
        )
        VALUES (?, ?, ?, ?)
        ON CONFLICT(email) DO NOTHING
    `);

    const buscarUsuario = db.prepare(`
        SELECT id
        FROM usuarios
        WHERE email = ?
    `);

    // Uma transacao garante que o conjunto
    // de insercoes seja concluido corretamente.
    const executarSeed = db.transaction(() => {
        let servicosCriados = 0;
        let usuariosCriados = 0;

        for (const servico of servicos) {
            const resultado = inserirServico.run(
                servico.nome,
                servico.descricao,
                servico.duracao,
                servico.preco
            );

            servicosCriados += resultado.changes;
        }

        for (const usuario of usuarios) {
            // Nao altera usuarios que ja existem.
            if (buscarUsuario.get(usuario.email)) {
                continue;
            }

            // Nunca salvamos a senha original.
            const hash = bcrypt.hashSync(
                usuario.senha,
                12
            );

            const resultado = inserirUsuario.run(
                usuario.nome,
                usuario.email,
                hash,
                usuario.papel
            );

            usuariosCriados += resultado.changes;
        }

        return {
            servicosCriados,
            usuariosCriados
        };
    });

    const resultado = executarSeed();

    console.log("Seed executado com sucesso!");
    console.log(
        "Servicos criados:",
        resultado.servicosCriados
    );
    console.log(
        "Usuarios criados:",
        resultado.usuariosCriados
    );

} catch (erro) {
    console.error("Erro no seed:", erro.message);
    process.exitCode = 1;

} finally {
    db.close();
}
