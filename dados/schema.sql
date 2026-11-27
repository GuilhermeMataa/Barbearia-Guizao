
-- Guizao do Corte - Estrutura do banco de dados.
-- Camada: dados.
-- Define usuarios, servicos e agendamentos.

-- Ativa a verificacao das chaves estrangeiras.
PRAGMA foreign_keys = ON;

-- ==========================================
-- 1. TABELA DE USUARIOS
-- ==========================================

CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    nome TEXT NOT NULL
        CHECK (length(trim(nome)) BETWEEN 2 AND 80),

    email TEXT NOT NULL COLLATE NOCASE UNIQUE,

    senha_hash TEXT NOT NULL,

    papel TEXT NOT NULL DEFAULT 'cliente'
        CHECK (papel IN ('cliente', 'admin')),

    criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. TABELA DE SERVICOS
-- ==========================================

CREATE TABLE IF NOT EXISTS servicos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    nome TEXT NOT NULL UNIQUE,

    descricao TEXT,

    duracao_minutos INTEGER NOT NULL
        CHECK (duracao_minutos > 0),

    preco_centavos INTEGER NOT NULL
        CHECK (preco_centavos >= 0),

    ativo INTEGER NOT NULL DEFAULT 1
        CHECK (ativo IN (0, 1))
);

-- ==========================================
-- 3. TABELA DE AGENDAMENTOS
-- ==========================================

CREATE TABLE IF NOT EXISTS agendamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    usuario_id INTEGER NOT NULL,

    servico_id INTEGER NOT NULL,

    inicio TEXT NOT NULL
        CHECK (datetime(inicio) IS NOT NULL),

    fim TEXT NOT NULL
        CHECK (datetime(fim) IS NOT NULL),

    status TEXT NOT NULL DEFAULT 'agendado'
        CHECK (
            status IN (
                'agendado',
                'cancelado',
                'concluido'
            )
        ),

    criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Um atendimento precisa terminar depois de comecar.
    CHECK (julianday(fim) > julianday(inicio)),

    FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE RESTRICT,

    FOREIGN KEY (servico_id)
        REFERENCES servicos(id)
        ON DELETE RESTRICT
);

-- ==========================================
-- 4. INDICE PARA CONSULTAR AGENDAMENTOS
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_agendamentos_periodo
ON agendamentos(inicio, fim, status);
