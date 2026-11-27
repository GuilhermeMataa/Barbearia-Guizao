/**
 * Guizao do Corte - Testes de integracao da API.
 * Executar com: node --test testes/api.test.js
 *
 * Utiliza banco SQLite temporario. Nunca modifica dados/barbearia.sqlite.
 */
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { randomBytes } = require("node:crypto");
const Database = require("better-sqlite3");
const bcrypt = require("bcrypt");

const RAIZ = path.resolve(__dirname, "..");
const SENHA_TESTE = "SenhaDeTeste#2026";

function dataFutura(dias) {
    const partes = Object.fromEntries(
        new Intl.DateTimeFormat("en-GB", {
            timeZone: "America/Fortaleza",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).formatToParts(new Date()).map((parte) => [parte.type, parte.value])
    );

    const hojeUtc = Date.UTC(
        Number(partes.year), Number(partes.month) - 1, Number(partes.day)
    );
    return new Date(hojeUtc + dias * 86400000).toISOString().slice(0, 10);
}

async function portaLivre() {
    const servidor = net.createServer();
    servidor.listen(0, "127.0.0.1");
    await once(servidor, "listening");
    const porta = servidor.address().port;
    servidor.close();
    await once(servidor, "close");
    return porta;
}

async function aguardarServidor(url, processo, stderr) {
    for (let tentativa = 0; tentativa < 80; tentativa++) {
        if (processo.exitCode !== null) {
            throw new Error(`Servidor encerrou antes dos testes: ${stderr()}`);
        }
        try {
            const resposta = await fetch(`${url}/api/saude`, {
                signal: AbortSignal.timeout(1000)
            });
            if (resposta.ok) return;
        } catch {
            // Servidor ainda iniciando.
        }
        await new Promise((resolver) => setTimeout(resolver, 100));
    }
    throw new Error(`Servidor nao iniciou a tempo. ${stderr()}`);
}

test("API Guizao do Corte: integracao e seguranca", { timeout: 60000 }, async (t) => {
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), "guizao-api-test-"));
    const caminhoBanco = path.join(pasta, "teste.sqlite");
    const db = new Database(caminhoBanco);
    let processo = null;
    let stderr = "";

    try {
        // A massa de teste fica isolada do banco usado pelo site.
        db.exec(fs.readFileSync(path.join(RAIZ, "dados", "schema.sql"), "utf8"));
        const hash = bcrypt.hashSync(SENHA_TESTE, 10);
        const inserirUsuario = db.prepare(`
            INSERT INTO usuarios (nome, email, senha_hash, papel)
            VALUES (?, ?, ?, ?)
        `);
        inserirUsuario.run("Administrador Teste", "admin@teste.local", hash, "admin");
        inserirUsuario.run("Cliente Um", "cliente1@teste.local", hash, "cliente");
        inserirUsuario.run("Cliente Dois", "cliente2@teste.local", hash, "cliente");
        db.prepare(`
            INSERT INTO servicos (nome, descricao, duracao_minutos, preco_centavos)
            VALUES (?, ?, ?, ?)
        `).run("Corte de teste", "Servico de teste", 40, 3500);
        db.close();

        const porta = await portaLivre();
        const url = `http://127.0.0.1:${porta}`;
        processo = spawn(process.execPath, [path.join(RAIZ, "servidor.js")], {
            cwd: RAIZ,
            env: {
                ...process.env,
                PORT: String(porta),
                DB_PATH: caminhoBanco,
                JWT_SECRET: randomBytes(48).toString("hex")
            },
            stdio: ["ignore", "ignore", "pipe"]
        });
        processo.stderr.on("data", (trecho) => {
            stderr += trecho.toString();
        });
        await aguardarServidor(url, processo, () => stderr);

        async function api(rota, { metodo = "GET", token, corpo } = {}) {
            const headers = {};
            if (token) headers.Authorization = `Bearer ${token}`;
            if (corpo !== undefined) headers["Content-Type"] = "application/json";

            const resposta = await fetch(`${url}${rota}`, {
                method: metodo,
                headers,
                body: corpo === undefined ? undefined : JSON.stringify(corpo),
                signal: AbortSignal.timeout(4000)
            });
            const texto = await resposta.text();
            return {
                status: resposta.status,
                dados: texto ? JSON.parse(texto) : null
            };
        }

        const login = async (email, senha = SENHA_TESTE) => {
            const resposta = await api("/api/auth/login", {
                metodo: "POST", corpo: { email, senha }
            });
            assert.equal(resposta.status, 200);
            assert.equal(typeof resposta.dados.token, "string");
            return resposta.dados.token;
        };

        let admin;
        let cliente1;
        let cliente2;

        await t.test("Autenticacao, cadastro e permissoes", async () => {
            assert.equal((await api("/api/saude")).status, 200);
            assert.equal((await api("/api/agendamentos")).status, 401);
            assert.equal((await api("/api/auth/me", { token: "invalido" })).status, 401);

            assert.equal((await api("/api/auth/login", {
                metodo: "POST", corpo: { email: "cliente1@teste.local", senha: "errada" }
            })).status, 401);

            admin = await login("admin@teste.local");
            cliente1 = await login("cliente1@teste.local");
            cliente2 = await login("cliente2@teste.local");

            const meuPerfil = await api("/api/auth/me", { token: cliente1 });
            assert.equal(meuPerfil.status, 200);
            assert.equal(meuPerfil.dados.papel, "cliente");
            assert.equal(meuPerfil.dados.senha_hash, undefined);

            const novo = await api("/api/auth/cadastro", {
                metodo: "POST",
                corpo: {
                    nome: "Cliente Novo",
                    email: "novo@teste.local",
                    senha: SENHA_TESTE
                }
            });
            assert.equal(novo.status, 201);
            assert.equal(novo.dados.usuario.papel, "cliente");
            assert.equal(novo.dados.usuario.senha_hash, undefined);
            await login("novo@teste.local");

            assert.equal((await api("/api/auth/cadastro", {
                metodo: "POST", corpo: {
                    nome: "Outro Cliente", email: "novo@teste.local", senha: SENHA_TESTE
                }
            })).status, 409);

            // Cadastro publico nao permite escolher papel=admin.
            assert.equal((await api("/api/auth/cadastro", {
                metodo: "POST", corpo: {
                    nome: "Usuario Indevido", email: "indevido@teste.local",
                    senha: SENHA_TESTE, papel: "admin"
                }
            })).status, 400);
        });

        await t.test("CRUD de servicos restrito ao administrador", async () => {
            const lista = await api("/api/servicos");
            assert.equal(lista.status, 200);
            assert.equal(lista.dados.some((servico) => servico.nome === "Corte de teste"), true);

            const corpo = {
                nome: "Barba de teste", descricao: "Barba", duracao_minutos: 30,
                preco_centavos: 2000
            };
            assert.equal((await api("/api/servicos", {
                metodo: "POST", token: cliente1, corpo
            })).status, 403);

            const criado = await api("/api/servicos", {
                metodo: "POST", token: admin, corpo
            });
            assert.equal(criado.status, 201);
            const id = criado.dados.id;
            assert.equal((await api(`/api/servicos/${id}`)).status, 200);

            const atualizado = await api(`/api/servicos/${id}`, {
                metodo: "PUT", token: admin,
                corpo: { ...corpo, preco_centavos: 2500 }
            });
            assert.equal(atualizado.status, 200);
            assert.equal(atualizado.dados.preco_centavos, 2500);
            assert.equal((await api(`/api/servicos/${id}`, {
                metodo: "DELETE", token: cliente1
            })).status, 403);
            assert.equal((await api(`/api/servicos/${id}`, {
                metodo: "DELETE", token: admin
            })).status, 204);
            assert.equal((await api(`/api/servicos/${id}`)).status, 404);
        });

        await t.test("Disponibilidade, conflitos, privacidade e cancelamento", async () => {
            const data = dataFutura(7);
            const disponibilidade = (horario) =>
                `/api/agendamentos/disponibilidade?data=${data}&servico_id=1`;
            const reserva = (horario) => ({
                servico_id: 1, data, horario
            });

            const antes = await api(disponibilidade("11:00"));
            assert.equal(antes.status, 200);
            assert.equal(antes.dados.horarios.find((h) => h.horario === "11:00").disponivel, true);

            const criada = await api("/api/agendamentos", {
                metodo: "POST", token: cliente1, corpo: reserva("11:00")
            });
            assert.equal(criada.status, 201);
            const id = criada.dados.id;
            assert.equal(criada.dados.status, "agendado");
            assert.equal(criada.dados.fim.slice(11, 16), "11:40");

            const depois = await api(disponibilidade("11:00"));
            assert.equal(depois.status, 200);
            for (const horario of ["10:30", "11:00", "11:30"]) {
                const slot = depois.dados.horarios.find((h) => h.horario === horario);
                assert.equal(slot.disponivel, false);
                assert.equal(slot.motivo, "ocupado");
            }
            assert.equal(depois.dados.horarios.find((h) => h.horario === "12:00").disponivel, true);
            assert.equal(JSON.stringify(depois.dados).includes("Cliente Um"), false);

            assert.equal((await api("/api/agendamentos", {
                metodo: "POST", token: cliente2, corpo: reserva("11:30")
            })).status, 409);
            assert.equal((await api("/api/agendamentos", {
                metodo: "POST", token: cliente2, corpo: reserva("11:00")
            })).status, 409);
            assert.equal((await api("/api/agendamentos", {
                metodo: "POST", token: cliente1,
                corpo: { ...reserva("11:00"), data: "2020-01-01" }
            })).status, 400);

            const reservasCliente1 = await api("/api/agendamentos", { token: cliente1 });
            const reservasCliente2 = await api("/api/agendamentos", { token: cliente2 });
            const reservasAdmin = await api("/api/agendamentos", { token: admin });
            assert.equal(reservasCliente1.dados.some((a) => a.id === id), true);
            assert.equal(reservasCliente2.dados.some((a) => a.id === id), false);
            assert.equal(reservasAdmin.dados.some((a) => a.id === id), true);

            // IDOR: outro cliente nao consegue cancelar a reserva.
            assert.equal((await api(`/api/agendamentos/${id}`, {
                metodo: "DELETE", token: cliente2
            })).status, 404);
            assert.equal((await api("/api/agendamentos", { token: admin }))
                .dados.find((a) => a.id === id).status, "agendado");
            assert.equal((await api("/api/agendamentos/abc", {
                metodo: "DELETE", token: cliente1
            })).status, 400);

            assert.equal((await api(`/api/agendamentos/${id}`, {
                metodo: "DELETE", token: cliente1
            })).status, 204);
            assert.equal((await api(`/api/agendamentos/${id}`, {
                metodo: "DELETE", token: cliente1
            })).status, 404);

            const liberado = await api(disponibilidade("11:00"));
            assert.equal(liberado.status, 200);
            assert.equal(liberado.dados.horarios.find((h) => h.horario === "11:00").disponivel, true);
            assert.equal((await api("/api/agendamentos", { token: admin }))
                .dados.find((a) => a.id === id).status, "cancelado");
        });
    } finally {
        if (db.open) db.close();
        if (processo && processo.exitCode === null) {
            const encerramento = once(processo, "exit");
            processo.kill();
            await encerramento;
        }
        fs.rmSync(pasta, { recursive: true, force: true });
    }
});
