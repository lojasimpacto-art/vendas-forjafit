-- Sistema de Vendas PDV — Schema completo
-- Banco: vendas_db (Neon.tech)

-- Sequence para número de venda (separado do ID da tabela)
CREATE SEQUENCE IF NOT EXISTS seq_numero_venda START 1;

-- Usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id            SERIAL PRIMARY KEY,
    nome          VARCHAR(100) NOT NULL,
    login         VARCHAR(50)  NOT NULL UNIQUE,
    senha_hash    VARCHAR(255) NOT NULL,
    ativo         BOOLEAN      DEFAULT TRUE,
    trocar_senha  BOOLEAN      DEFAULT FALSE,
    created_at    TIMESTAMP    DEFAULT NOW(),
    updated_at    TIMESTAMP    DEFAULT NOW()
);

-- Permissões
CREATE TABLE IF NOT EXISTS permissoes (
    id            SERIAL PRIMARY KEY,
    usuario_id    INTEGER REFERENCES usuarios(id),
    recurso       VARCHAR(50) NOT NULL,
    -- Recursos: 'produtos', 'vendas', 'caixa', 'estoque', 'relatorios',
    --           'usuarios', 'ajuste_estoque', 'formas_pagamento', 'logs'
    pode_ver      BOOLEAN DEFAULT FALSE,
    pode_criar    BOOLEAN DEFAULT FALSE,
    pode_editar   BOOLEAN DEFAULT FALSE,
    pode_excluir  BOOLEAN DEFAULT FALSE,
    pode_reabrir  BOOLEAN DEFAULT FALSE  -- usado apenas para recurso 'caixa'
);

-- Produtos
CREATE TABLE IF NOT EXISTS produtos (
    id                    SERIAL PRIMARY KEY,
    descricao             VARCHAR(200) NOT NULL,
    preco_custo           NUMERIC(10,2) NOT NULL DEFAULT 0,
    preco_venda           NUMERIC(10,2) NOT NULL DEFAULT 0,
    qtde_minima_estoque   INTEGER      NOT NULL DEFAULT 0,
    qtde_estoque          INTEGER      NOT NULL DEFAULT 0,
    foto_url              VARCHAR(500),
    ativo                 BOOLEAN      DEFAULT TRUE,
    created_at            TIMESTAMP    DEFAULT NOW(),
    updated_at            TIMESTAMP    DEFAULT NOW()
);

-- Histórico de preços
CREATE TABLE IF NOT EXISTS historico_precos (
    id              SERIAL PRIMARY KEY,
    produto_id      INTEGER REFERENCES produtos(id),
    tipo_preco      VARCHAR(10) NOT NULL, -- 'CUSTO' ou 'VENDA'
    preco_anterior  NUMERIC(10,2) NOT NULL,
    preco_novo      NUMERIC(10,2) NOT NULL,
    alterado_por    INTEGER REFERENCES usuarios(id),
    alterado_em     TIMESTAMP DEFAULT NOW()
);

-- Formas de pagamento
CREATE TABLE IF NOT EXISTS formas_pagamento (
    id      SERIAL PRIMARY KEY,
    nome    VARCHAR(50) NOT NULL,
    ativo   BOOLEAN DEFAULT TRUE
);

-- Pedidos (cabeçalho da venda)
CREATE TABLE IF NOT EXISTS pedidos (
    id                  SERIAL PRIMARY KEY,
    numero_venda        INTEGER NOT NULL UNIQUE DEFAULT nextval('seq_numero_venda'),
    data_venda          DATE    NOT NULL DEFAULT CURRENT_DATE,
    hora_venda          TIME    NOT NULL DEFAULT CURRENT_TIME,
    valor_total         NUMERIC(10,2) NOT NULL,
    forma_pagamento_id  INTEGER REFERENCES formas_pagamento(id),
    valor_recebido      NUMERIC(10,2),
    troco               NUMERIC(10,2) DEFAULT 0,
    status              VARCHAR(20) DEFAULT 'CONCLUIDA', -- 'CONCLUIDA' | 'CANCELADA'
    usuario_id          INTEGER REFERENCES usuarios(id),
    observacao          TEXT,
    created_at          TIMESTAMP DEFAULT NOW()
);

-- Itens do pedido
CREATE TABLE IF NOT EXISTS itens_pedido (
    id                  SERIAL PRIMARY KEY,
    pedido_id           INTEGER REFERENCES pedidos(id),
    produto_id          INTEGER REFERENCES produtos(id),
    descricao_produto   VARCHAR(200) NOT NULL,
    quantidade          INTEGER      NOT NULL,
    preco_unitario      NUMERIC(10,2) NOT NULL,
    preco_custo         NUMERIC(10,2) NOT NULL,
    subtotal            NUMERIC(10,2) NOT NULL
);

-- Caixa (abertura e fechamento diário)
CREATE TABLE IF NOT EXISTS caixa (
    id                  SERIAL PRIMARY KEY,
    data_caixa          DATE    NOT NULL UNIQUE,
    saldo_abertura      NUMERIC(10,2) DEFAULT 0,
    saldo_fechamento    NUMERIC(10,2),
    total_dinheiro      NUMERIC(10,2) DEFAULT 0,
    total_credito       NUMERIC(10,2) DEFAULT 0,
    total_debito        NUMERIC(10,2) DEFAULT 0,
    total_pix           NUMERIC(10,2) DEFAULT 0,
    total_vendas        NUMERIC(10,2) DEFAULT 0,
    status              VARCHAR(20) DEFAULT 'ABERTO', -- 'ABERTO' | 'FECHADO'
    aberto_por          INTEGER REFERENCES usuarios(id),
    fechado_por         INTEGER REFERENCES usuarios(id),
    reaberto_por        INTEGER REFERENCES usuarios(id),
    autorizado_por      INTEGER REFERENCES usuarios(id), -- supervisor que autorizou reabertura
    aberto_em           TIMESTAMP,
    fechado_em          TIMESTAMP,
    reaberto_em         TIMESTAMP,
    observacao          TEXT
);

-- Movimentação de estoque
CREATE TABLE IF NOT EXISTS movimentacao_estoque (
    id              SERIAL PRIMARY KEY,
    produto_id      INTEGER REFERENCES produtos(id),
    tipo            VARCHAR(20) NOT NULL,
    -- 'ENTRADA_COMPRA' | 'SAIDA_VENDA' | 'AJUSTE_ENTRADA' | 'AJUSTE_SAIDA'
    quantidade      INTEGER     NOT NULL,
    qtde_anterior   INTEGER     NOT NULL,
    qtde_posterior  INTEGER     NOT NULL,
    referencia_id   INTEGER,
    observacao      TEXT,
    usuario_id      INTEGER REFERENCES usuarios(id),
    created_at      TIMESTAMP   DEFAULT NOW()
);

-- Logs do sistema
CREATE TABLE IF NOT EXISTS logs_sistema (
    id          SERIAL PRIMARY KEY,
    usuario_id  INTEGER REFERENCES usuarios(id),
    acao        VARCHAR(100) NOT NULL,
    tabela      VARCHAR(50),
    registro_id INTEGER,
    descricao   TEXT,
    dados_antes JSONB,
    dados_depois JSONB,
    ip          VARCHAR(45),
    created_at  TIMESTAMP DEFAULT NOW()
);

-- =====================
-- SEED INICIAL
-- =====================

-- Admin: login=admin, senha=Admin@123
INSERT INTO usuarios (nome, login, senha_hash, ativo, trocar_senha)
VALUES ('Administrador', 'admin', '$2b$10$rOzJqFqFqFqFqFqFqFqFqO8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8', true, false)
ON CONFLICT (login) DO NOTHING;

-- Permissões totais para o admin
INSERT INTO permissoes (usuario_id, recurso, pode_ver, pode_criar, pode_editar, pode_excluir, pode_reabrir)
SELECT 1, recurso, true, true, true, true,
    CASE WHEN recurso = 'caixa' THEN true ELSE false END
FROM unnest(ARRAY['produtos','vendas','caixa','estoque','relatorios','usuarios','ajuste_estoque','formas_pagamento','logs']) AS recurso
ON CONFLICT DO NOTHING;

-- Formas de pagamento padrão
INSERT INTO formas_pagamento (nome, ativo) VALUES
    ('DINHEIRO', true),
    ('CREDITO', true),
    ('DEBITO', true),
    ('PIX', true)
ON CONFLICT DO NOTHING;
