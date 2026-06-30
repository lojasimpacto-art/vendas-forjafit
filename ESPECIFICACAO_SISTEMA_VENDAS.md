# ESPECIFICAÇÃO COMPLETA — SISTEMA DE VENDAS PDV
**Projeto:** Sistema de Vendas com Controle de Estoque e Caixa  
**Stack:** Node.js (Express) + React + PostgreSQL + Railway/Render  
**Padrão de desenvolvimento:** Mesmo do projeto "Controle de Contas" já existente  
**Data:** Junho 2026

---

## 1. VISÃO GERAL

Sistema web de ponto de venda (PDV) para controle de vendas em lojas de varejo. O sistema deve gerenciar produtos, estoque, vendas, formas de pagamento, caixa diário, usuários com permissões e gerar relatórios operacionais. Todo acesso via navegador (desktop/mobile).

**Usuários simultâneos esperados:** 2 a 10  
**Ambiente:** Hospedagem em nuvem (Railway ou Render)

### Banco de dados

Banco PostgreSQL **novo e independente**, hospedado no **[Neon.tech](https://neon.tech)** na mesma conta do sistema de cobrança. Os dois bancos não compartilham nenhuma tabela ou conexão — são completamente separados.

```
Neon.tech (mesma conta)
├── Banco: cobranca_db    ← Sistema de Cobrança (já existente, não mexer)
└── Banco: vendas_db      ← Este sistema (criar novo)
```

> **Importante para o Claude Code:** Criar um banco novo no Neon.tech chamado `vendas_db` (ou nome similar). A `DATABASE_URL` deste projeto é diferente da usada no sistema de cobrança. Não há schemas compartilhados nem referências cruzadas entre os dois bancos.

---

## 2. STACK TECNOLÓGICA

| Camada         | Tecnologia              | Observação                                 |
|----------------|-------------------------|--------------------------------------------|
| Frontend       | React                   | SPA com React Router                       |
| Backend        | Node.js + Express       | API REST com JWT                           |
| Banco de dados | PostgreSQL — Neon.tech (banco próprio: vendas_db) | Banco novo e independente do sistema de cobrança |
| Autenticação   | JWT + bcrypt             | Mesmo padrão do Controle de Contas         |
| Upload fotos   | Multer + armazenamento  | Cloudflare R2 ou pasta local com static    |
| Hospedagem     | Railway ou Render        | Backend + Frontend + PostgreSQL            |

---

## 3. MODELO DE DADOS COMPLETO

### 3.1 USUARIOS
```sql
CREATE TABLE usuarios (
    id            SERIAL PRIMARY KEY,
    nome          VARCHAR(100) NOT NULL,
    login         VARCHAR(50)  NOT NULL UNIQUE,
    senha_hash    VARCHAR(255) NOT NULL,
    ativo         BOOLEAN      DEFAULT TRUE,
    created_at    TIMESTAMP    DEFAULT NOW(),
    updated_at    TIMESTAMP    DEFAULT NOW()
);
```

### 3.2 PERMISSOES
```sql
CREATE TABLE permissoes (
    id          SERIAL PRIMARY KEY,
    usuario_id  INTEGER REFERENCES usuarios(id),
    recurso     VARCHAR(50) NOT NULL,
    -- Recursos: 'produtos', 'vendas', 'caixa', 'estoque', 'relatorios',
    --           'usuarios', 'ajuste_estoque', 'formas_pagamento', 'logs'
    pode_ver    BOOLEAN DEFAULT FALSE,
    pode_criar  BOOLEAN DEFAULT FALSE,
    pode_editar BOOLEAN DEFAULT FALSE,
    pode_excluir BOOLEAN DEFAULT FALSE
);
```

### 3.3 PRODUTOS
```sql
CREATE TABLE produtos (
    id                  SERIAL PRIMARY KEY,
    descricao           VARCHAR(200) NOT NULL,
    preco_custo         NUMERIC(10,2) NOT NULL DEFAULT 0,
    preco_venda         NUMERIC(10,2) NOT NULL DEFAULT 0,
    qtde_minima_estoque INTEGER      NOT NULL DEFAULT 0,
    qtde_estoque        INTEGER      NOT NULL DEFAULT 0,
    foto_url            VARCHAR(500),
    ativo               BOOLEAN      DEFAULT TRUE,
    created_at          TIMESTAMP    DEFAULT NOW(),
    updated_at          TIMESTAMP    DEFAULT NOW()
);
```

### 3.4 HISTORICO_PRECOS
```sql
-- Disparado automaticamente sempre que preco_custo ou preco_venda for alterado
CREATE TABLE historico_precos (
    id              SERIAL PRIMARY KEY,
    produto_id      INTEGER REFERENCES produtos(id),
    tipo_preco      VARCHAR(10) NOT NULL, -- 'CUSTO' ou 'VENDA'
    preco_anterior  NUMERIC(10,2) NOT NULL,
    preco_novo      NUMERIC(10,2) NOT NULL,
    alterado_por    INTEGER REFERENCES usuarios(id),
    alterado_em     TIMESTAMP DEFAULT NOW()
);
```

### 3.5 FORMAS_PAGAMENTO
```sql
CREATE TABLE formas_pagamento (
    id      SERIAL PRIMARY KEY,
    nome    VARCHAR(50) NOT NULL,
    -- Valores possíveis: 'DINHEIRO', 'CREDITO', 'DEBITO', 'PIX'
    ativo   BOOLEAN DEFAULT TRUE
);

-- Inserir valores iniciais:
INSERT INTO formas_pagamento (nome) VALUES
    ('DINHEIRO'), ('CREDITO'), ('DEBITO'), ('PIX');
```

### 3.6 PEDIDOS (cabeçalho da venda)
> **Nota:** Nomeada `pedidos` para manter clareza semântica e evitar ambiguidade com o módulo de vendas.
```sql
CREATE TABLE pedidos (
    id                  SERIAL PRIMARY KEY,
    numero_venda        INTEGER NOT NULL UNIQUE, -- auto-incremento sequencial
    data_venda          DATE    NOT NULL DEFAULT CURRENT_DATE,
    hora_venda          TIME    NOT NULL DEFAULT CURRENT_TIME,
    valor_total         NUMERIC(10,2) NOT NULL,
    forma_pagamento_id  INTEGER REFERENCES formas_pagamento(id),
    valor_recebido      NUMERIC(10,2),   -- pode ser maior que total (troco)
    troco               NUMERIC(10,2) DEFAULT 0,
    status              VARCHAR(20) DEFAULT 'CONCLUIDA', -- 'CONCLUIDA' | 'CANCELADA'
    usuario_id          INTEGER REFERENCES usuarios(id),
    observacao          TEXT,
    created_at          TIMESTAMP DEFAULT NOW()
);
```

### 3.7 ITENS_PEDIDO
```sql
CREATE TABLE itens_pedido (
    id              SERIAL PRIMARY KEY,
    pedido_id       INTEGER REFERENCES pedidos(id),
    produto_id      INTEGER REFERENCES produtos(id),
    descricao_produto VARCHAR(200) NOT NULL, -- snapshot no momento da venda
    quantidade      INTEGER      NOT NULL,
    preco_unitario  NUMERIC(10,2) NOT NULL, -- snapshot no momento da venda
    preco_custo     NUMERIC(10,2) NOT NULL, -- snapshot para margem
    subtotal        NUMERIC(10,2) NOT NULL
);
```

### 3.8 CAIXA (abertura e fechamento diário)
```sql
CREATE TABLE caixa (
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
    aberto_em           TIMESTAMP,
    fechado_em          TIMESTAMP,
    observacao          TEXT
);
```

### 3.9 MOVIMENTACAO_ESTOQUE
```sql
CREATE TABLE movimentacao_estoque (
    id              SERIAL PRIMARY KEY,
    produto_id      INTEGER REFERENCES produtos(id),
    tipo            VARCHAR(20) NOT NULL,
    -- 'ENTRADA_COMPRA' | 'SAIDA_VENDA' | 'AJUSTE_ENTRADA' | 'AJUSTE_SAIDA'
    quantidade      INTEGER     NOT NULL, -- sempre positivo; tipo indica direção
    qtde_anterior   INTEGER     NOT NULL, -- estoque antes da movimentação
    qtde_posterior  INTEGER     NOT NULL, -- estoque depois da movimentação
    referencia_id   INTEGER,              -- pedido_id se for SAIDA_VENDA
    observacao      TEXT,
    usuario_id      INTEGER REFERENCES usuarios(id),
    created_at      TIMESTAMP   DEFAULT NOW()
);
```

### 3.10 LOGS_SISTEMA
```sql
CREATE TABLE logs_sistema (
    id          SERIAL PRIMARY KEY,
    usuario_id  INTEGER REFERENCES usuarios(id),
    acao        VARCHAR(100) NOT NULL,
    -- Ex: 'LOGIN', 'CADASTRO_PRODUTO', 'EDICAO_PRODUTO', 'VENDA_REALIZADA',
    --     'CANCELAMENTO_VENDA', 'AJUSTE_ESTOQUE', 'ABERTURA_CAIXA', etc.
    tabela      VARCHAR(50),
    registro_id INTEGER,
    descricao   TEXT,       -- descrição legível da ação
    dados_antes JSONB,      -- snapshot do registro antes da alteração
    dados_depois JSONB,     -- snapshot do registro após a alteração
    ip          VARCHAR(45),
    created_at  TIMESTAMP DEFAULT NOW()
);
```

---

## 4. MÓDULOS DO SISTEMA

### 4.1 MÓDULO: AUTENTICAÇÃO

**Telas:**
- Login (usuário + senha)
- Logout

**Regras:**
- JWT com expiração de 8 horas
- Senha sempre armazenada com bcrypt (custo 10)
- Log de todos os logins (sucesso e falha)
- Primeiro usuário cadastrado tem permissão total (admin)

---

### 4.2 MÓDULO: CADASTRO DE PRODUTOS

**Tela — Lista de Produtos:**
- Tabela com: Foto (miniatura), Descrição, Preço Custo, Preço Venda, Estoque Atual, Estoque Mínimo, Status (Ativo/Inativo)
- Barra de busca por descrição
- Filtro por estoque abaixo do mínimo
- Botão "Novo Produto"
- Botão "Ver histórico de preços" por produto
- Indicador visual (vermelho) quando `qtde_estoque < qtde_minima_estoque`

**Tela — Formulário de Produto (criar/editar):**
- Campos: Descrição (obrigatório), Preço de Custo, Preço de Venda, Qtde Mínima de Estoque, Foto (upload de imagem)
- A Qtde em Estoque NÃO é editada aqui — só por movimentação de estoque
- Upload de foto: aceitar JPG/PNG até 5MB; armazenar no servidor; mostrar preview
- Botão Salvar / Cancelar

**Regras de negócio:**
- Ao salvar, se `preco_custo` ou `preco_venda` for diferente do valor anterior, registrar automaticamente na `historico_precos` com o preço anterior, o novo preço, o usuário e o timestamp
- Esta verificação deve ocorrer no backend, nunca no frontend
- Exclusão é lógica (`ativo = false`)

**Tela — Histórico de Preços:**
- Modal ou página com filtro por tipo (Custo / Venda)
- Tabela: Data/Hora | Tipo | Preço Anterior | Preço Novo | Alterado Por

---

### 4.3 MÓDULO: FORMAS DE PAGAMENTO

**Tela — Lista:**
- As 4 formas já vêm pré-cadastradas (Dinheiro, Cartão de Crédito, Débito, Pix)
- Possibilidade de ativar/inativar
- Administrador pode adicionar novas formas se necessário

**Regra:** Não permite excluir formas de pagamento que já foram usadas em vendas.

---

### 4.4 MÓDULO: TELA DE VENDAS (PDV)

Esta é a tela principal de operação. Deve ser rápida e intuitiva.

**Layout sugerido:**
```
┌─────────────────────────────────────────────────┐
│  VENDA #00123  |  12/06/2026  |  Operador: João │
├───────────────────────┬─────────────────────────┤
│  BUSCA DE PRODUTO     │   RESUMO DA VENDA       │
│  [campo de busca ↓]   │                         │
│                       │  Item 1  Qtde x R$      │
│  Lista de produtos    │  Item 2  Qtde x R$      │
│  com foto e preço     │  Item 3  Qtde x R$      │
│                       │  ...                    │
│                       │  ─────────────────────  │
│                       │  TOTAL: R$ 00,00        │
│                       │                         │
│                       │  [FORMA DE PAGAMENTO ↓] │
│                       │  Valor recebido: R$___  │
│                       │  Troco: R$ 0,00         │
│                       │                         │
│                       │  [FINALIZAR VENDA]      │
└───────────────────────┴─────────────────────────┘
```

**Funcionalidades:**
- Busca de produto por nome ou código (busca em tempo real ao digitar)
- Ao clicar no produto: abre modal para informar quantidade
- Produto adicionado entra na lista do lado direito com subtotal
- Pode remover item da lista ou alterar quantidade
- Seleção de forma de pagamento (dropdown com ícones)
- Para DINHEIRO: campo "Valor Recebido" — calcula troco automaticamente
- Para demais: valor recebido = valor total (preenchimento automático)
- Botão FINALIZAR VENDA:
  1. Valida que há ao menos 1 item
  2. Valida que a forma de pagamento foi selecionada
  3. Confirma a venda (modal de confirmação com resumo)
  4. Grava `vendas` + `itens_venda`
  5. Baixa estoque de cada produto (`movimentacao_estoque` tipo `SAIDA_VENDA`)
  6. Atualiza `caixa` do dia com os valores
  7. Log da venda
  8. Imprime/mostra recibo (opcional — modal com opção de imprimir)
- Botão CANCELAR VENDA: limpa o carrinho atual (sem gravar nada)

**Regras:**
- Se o caixa do dia não estiver aberto, bloquear a tela de vendas e avisar
- Não permitir vender produto com estoque zero (mostrar alerta)
- Se estoque for insuficiente para a quantidade desejada, alertar mas NÃO bloquear (decisão do operador)

---

### 4.5 MÓDULO: CONTROLE DE CAIXA

**Tela — Abertura de Caixa:**
- Campo: Saldo de abertura (dinheiro em caixa no início do dia)
- Botão Abrir Caixa
- Registra `aberto_por` e `aberto_em`

**Tela — Caixa do Dia (visão operacional):**
- Data atual
- Totais por forma de pagamento com base nas vendas do dia
- Total geral de vendas
- Número de vendas realizadas
- Lista de vendas do dia (hora, número, valor, forma de pagamento, operador)
- Botão "Fechar Caixa"

**Tela — Fechamento de Caixa:**
- Mostra: Total esperado por forma de pagamento (calculado pelo sistema)
- Campo: Valor contado fisicamente em dinheiro
- Diferença: sistema calcula `valor_contado - total_dinheiro_sistema`
- Mostra diferença em verde (sobra) ou vermelho (falta)
- Botão Confirmar Fechamento
- Campo de observação

**Tela — Histórico de Caixas:**
- Lista de caixas passados com filtro por período
- Colunas: Data, Total Vendas, Dinheiro, Crédito, Débito, Pix, Status, Diferença
- Botão "Ver detalhes" — abre todas as vendas daquele dia

**Regras:**
- Só pode haver um caixa aberto por dia
- Não pode abrir caixa novo se o anterior não foi fechado
- Caixa fechado não pode ser reaberto (somente admin)

---

### 4.6 MÓDULO: CONTROLE DE ESTOQUE

**Tela — Estoque Atual:**
- Lista todos os produtos com estoque atual e mínimo
- Indicador visual para produtos abaixo do mínimo (vermelho)
- Filtro: "Apenas produtos com estoque baixo"

**Tela — Entrada de Produtos (Compra):**
- **Permissão necessária:** `ajuste_estoque.pode_criar`
- Buscar produto (campo de busca igual à tela de vendas)
- Ao selecionar produto: mostra estoque atual
- Campo: Quantidade recebida
- Campo: Preço de custo da compra (opcional — se informado, atualiza preco_custo e registra histórico)
- Campo: Observação (ex: "NF 1234 - Fornecedor ABC")
- Botão Registrar Entrada:
  - Soma quantidade ao estoque atual
  - Grava `movimentacao_estoque` tipo `ENTRADA_COMPRA`
  - Log da operação

**Tela — Ajuste de Estoque:**
- **Permissão necessária:** `ajuste_estoque.pode_editar`
- Buscar produto
- Tipo de ajuste: ENTRADA ou SAÍDA
- Quantidade
- Motivo (campo obrigatório: "Avaria", "Contagem", "Devolução", etc.)
- Grava `movimentacao_estoque` tipo `AJUSTE_ENTRADA` ou `AJUSTE_SAIDA`
- Log da operação

**Tela — Histórico de Movimentações:**
- Filtro por: Produto, Tipo de movimentação, Período
- Tabela: Data | Produto | Tipo | Qtde Anterior | Qtde Movida | Qtde Posterior | Observação | Usuário

---

### 4.7 MÓDULO: RELATÓRIOS

**Relatório 1 — Produtos Vendidos (por período):**
- Filtros: Data inicial, Data final, Produto específico (opcional)
- Agrupamento: por produto
- Colunas: Produto | Qtde Vendida | Preço Médio de Venda | Total Vendido | Custo Total | Margem (%)
- Total geral no rodapé
- Exportar para Excel/CSV

**Relatório 2 — Vendas por Período:**
- Filtros: Data inicial, Data final, Forma de pagamento (opcional)
- Lista de vendas: Número | Data/Hora | Operador | Itens | Valor | Forma de Pagamento | Status
- Subtotais por forma de pagamento
- Total geral
- Exportar para Excel/CSV

**Relatório 3 — Estoque Atual:**
- Todos os produtos ativos
- Colunas: Produto | Estoque Atual | Estoque Mínimo | Preço Custo | Preço Venda | Valor em Estoque (custo)
- Destaque visual para produtos abaixo do mínimo
- Total: Valor total em estoque
- Exportar para Excel/CSV

**Relatório 4 — Movimentação de Estoque:**
- Filtros: Produto, Tipo, Período
- Histórico completo de entradas e saídas
- Exportar para Excel/CSV

**Relatório 5 — Resumo de Caixa:**
- Filtro por período
- Tabela por dia: Data | Vendas | Dinheiro | Crédito | Débito | Pix | Diferença | Status

---

### 4.8 MÓDULO: CADASTRO DE USUÁRIOS

**Tela — Lista de Usuários:**
- Tabela: Nome | Login | Status | Ações
- Botão Novo Usuário
- Apenas administradores podem acessar este módulo

**Tela — Formulário de Usuário:**
- Campos: Nome, Login, Senha (criar) / Nova Senha (opcional ao editar), Ativo
- Seção de Permissões:
  - Grade com todos os módulos nas linhas e colunas: Ver | Criar | Editar | Excluir
  - Módulos: Produtos, Vendas, Caixa, Estoque/Ajuste, Relatórios, Usuários, Logs

**Regras:**
- Não pode excluir o próprio usuário
- Não pode desativar o próprio usuário
- Log de toda criação/edição de usuário

---

### 4.9 MÓDULO: LOGS DO SISTEMA

**Tela — Visualização de Logs:**
- **Permissão necessária:** `logs.pode_ver`
- Filtros: Usuário, Ação, Tabela, Período (data inicial / data final)
- Tabela: Data/Hora | Usuário | Ação | Descrição | Dados Antes | Dados Depois
- Clique em uma linha expande detalhes completos (JSON before/after)
- Não é possível excluir logs (imutável)
- Exportar para Excel/CSV

---

## 5. REGRAS DE LOG AUTOMÁTICO

O sistema deve registrar automaticamente na tabela `logs_sistema` nas seguintes situações:

| Evento                   | Ação no Log                  | Dados Before/After |
|--------------------------|------------------------------|--------------------|
| Login (sucesso)          | LOGIN_SUCESSO                | -                  |
| Login (falha)            | LOGIN_FALHA                  | -                  |
| Criar produto            | CADASTRO_PRODUTO             | null / novo        |
| Editar produto           | EDICAO_PRODUTO               | anterior / novo    |
| Inativar produto         | INATIVACAO_PRODUTO           | anterior / novo    |
| Criar venda              | VENDA_REALIZADA              | null / venda       |
| Cancelar venda           | CANCELAMENTO_VENDA           | anterior / novo    |
| Entrada de estoque       | ENTRADA_ESTOQUE              | qtdes              |
| Ajuste de estoque        | AJUSTE_ESTOQUE               | qtdes              |
| Abrir caixa              | ABERTURA_CAIXA               | -                  |
| Fechar caixa             | FECHAMENTO_CAIXA             | totais             |
| Criar usuário            | CADASTRO_USUARIO             | null / novo        |
| Editar usuário           | EDICAO_USUARIO               | anterior / novo    |
| Alterar permissão        | ALTERACAO_PERMISSAO          | anterior / novo    |
| Alterar preço produto    | ALTERACAO_PRECO              | anterior / novo    |

---

## 6. ESTRUTURA DE PASTAS DO PROJETO

```
sistema-vendas/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js          # Conexão PostgreSQL (pg)
│   │   │   └── multer.js            # Config upload de fotos
│   │   ├── middleware/
│   │   │   ├── auth.js              # Verificação JWT
│   │   │   ├── permissions.js       # Verificação de permissões
│   │   │   └── logger.js            # Log automático de ações
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── produtos.js
│   │   │   ├── formasPagamento.js
│   │   │   ├── vendas.js
│   │   │   ├── caixa.js
│   │   │   ├── estoque.js
│   │   │   ├── relatorios.js
│   │   │   ├── usuarios.js
│   │   │   └── logs.js
│   │   └── server.js
│   ├── uploads/                     # Fotos de produtos (se local)
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx           # Menu lateral + header
│   │   │   ├── ProtectedRoute.jsx   # Rota com verificação de permissão
│   │   │   └── common/              # Tabelas, modais, botões reutilizáveis
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx        # Resumo do dia
│   │   │   ├── Produtos.jsx
│   │   │   ├── Vendas.jsx           # Tela PDV
│   │   │   ├── Caixa.jsx
│   │   │   ├── Estoque.jsx
│   │   │   ├── Relatorios.jsx
│   │   │   ├── Usuarios.jsx
│   │   │   └── Logs.jsx
│   │   ├── services/
│   │   │   └── api.js               # Axios com interceptor JWT
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx      # Contexto de autenticação
│   │   └── App.jsx
│   └── package.json
│
├── database/
│   └── schema.sql                   # Script completo de criação do banco
│
└── README.md
```

---

## 7. ENDPOINTS DA API (referência)

### Auth
```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
```

### Produtos
```
GET    /api/produtos              # Lista (com filtro)
GET    /api/produtos/:id
POST   /api/produtos              # Criar
PUT    /api/produtos/:id          # Editar (verifica mudança de preço)
DELETE /api/produtos/:id          # Inativa (soft delete)
GET    /api/produtos/:id/historico-precos
POST   /api/produtos/:id/foto     # Upload foto
```

### Formas de Pagamento
```
GET    /api/formas-pagamento
POST   /api/formas-pagamento
PUT    /api/formas-pagamento/:id
```

### Vendas (Pedidos)
```
GET    /api/pedidos              # Lista com filtros
GET    /api/pedidos/:id
POST   /api/pedidos              # Criar venda + baixar estoque
PUT    /api/pedidos/:id/cancelar # Cancelar (estorna estoque)
GET    /api/pedidos/hoje         # Vendas do dia atual
```

### Caixa
```
GET    /api/caixa/hoje            # Caixa do dia
GET    /api/caixa/status          # Se está aberto ou fechado
POST   /api/caixa/abrir
POST   /api/caixa/fechar
GET    /api/caixa/historico       # Com filtro por período
GET    /api/caixa/:id             # Caixa específico com todas as vendas
```

### Estoque
```
GET    /api/estoque               # Estoque atual de todos os produtos
POST   /api/estoque/entrada       # Entrada de compra
POST   /api/estoque/ajuste        # Ajuste (entrada ou saída)
GET    /api/estoque/movimentacoes # Histórico com filtros
```

### Relatórios
```
GET    /api/relatorios/produtos-vendidos
GET    /api/relatorios/vendas-periodo
GET    /api/relatorios/estoque-atual
GET    /api/relatorios/movimentacao-estoque
GET    /api/relatorios/resumo-caixa
```

### Usuários
```
GET    /api/usuarios
GET    /api/usuarios/:id
POST   /api/usuarios
PUT    /api/usuarios/:id
PUT    /api/usuarios/:id/permissoes
DELETE /api/usuarios/:id          # Inativa (soft delete)
```

### Logs
```
GET    /api/logs                  # Com filtros (usuário, ação, período)
```

---

## 8. VARIÁVEIS DE AMBIENTE (.env.example)

```env
# Banco de dados — Neon.tech (banco novo e independente: vendas_db)
# Criar um novo banco no Neon.tech, separado do banco do sistema de cobrança
DATABASE_URL=postgresql://user:password@ep-xxxx.us-east-1.aws.neon.tech/vendas_db?sslmode=require

# JWT
JWT_SECRET=sua_chave_secreta_aqui
JWT_EXPIRES_IN=8h

# Servidor
PORT=3001
NODE_ENV=production

# Upload de fotos (escolher uma opção)
UPLOAD_MODE=local             # 'local' ou 'r2'
UPLOADS_PATH=./uploads

# Cloudflare R2 (se UPLOAD_MODE=r2)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# Frontend URL (para CORS)
FRONTEND_URL=https://seu-sistema.railway.app
```

---

## 9. DASHBOARD INICIAL

Após o login, exibir um painel com:
- **Resumo do dia:** Total de vendas, número de transações, por forma de pagamento
- **Status do caixa:** Aberto/Fechado + saldo atual estimado em dinheiro
- **Alertas de estoque:** Produtos com estoque abaixo do mínimo (lista com link direto)
- **Últimas vendas:** Tabela com as últimas 10 vendas
- **Gráfico:** Vendas dos últimos 7 dias (barras por dia)

---

## 10. OBSERVAÇÕES TÉCNICAS

1. **Conexão com Neon.tech:** Usar SSL obrigatório (`sslmode=require`), conforme exigido pelo Neon.tech:
   ```js
   // config/database.js
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
     ssl: { rejectUnauthorized: false }
   });
   ```

2. **Transações no banco:** A criação de venda deve ser uma transação PostgreSQL única:
   - INSERT em `pedidos`
   - INSERT em `itens_pedido` (para cada item)
   - UPDATE em `produtos.qtde_estoque` (para cada item)
   - INSERT em `movimentacao_estoque` (para cada item)
   - UPDATE em `caixa` (totais do dia)
   - INSERT em `logs_sistema`
   - Se qualquer passo falhar: ROLLBACK completo

3. **Histórico de preços:** Verificar no backend antes de qualquer UPDATE em `produtos`:
   ```js
   if (novoPrecoVenda !== produtoAtual.preco_venda) {
     INSERT INTO historico_precos (produto_id, tipo_preco, preco_anterior, preco_novo, alterado_por)
     VALUES (id, 'VENDA', produtoAtual.preco_venda, novoPrecoVenda, usuarioLogado.id)
   }
   // idem para preco_custo
   ```

4. **Fotos dos produtos:** Armazenar em Cloudflare R2 (preferencial) ou pasta `uploads/` com servida como estático. Retornar URL completa no JSON da API.

5. **Cancelamento de venda:** Estornar o estoque dos itens do pedido cancelado (criar movimentações tipo `AJUSTE_ENTRADA` com referência ao cancelamento).

6. **Número sequencial de venda:** Usar sequence do PostgreSQL. Não usar o ID da tabela — o número de venda deve ser sequencial e nunca reutilizado (mesmo após cancelamentos).

7. **Segurança:** Todas as rotas (exceto `/api/auth/login`) devem exigir JWT válido. O middleware de permissões deve ser aplicado por rota, verificando a tabela `permissoes`.

---

## 11. SEED INICIAL DO BANCO

```sql
-- Usuário administrador inicial
INSERT INTO usuarios (nome, login, senha_hash, ativo)
VALUES ('Administrador', 'admin', '$hash_do_bcrypt_aqui', true);

-- Permissões totais para o admin
INSERT INTO permissoes (usuario_id, recurso, pode_ver, pode_criar, pode_editar, pode_excluir)
SELECT 1, recurso, true, true, true, true
FROM unnest(ARRAY['produtos','vendas','caixa','estoque','relatorios','usuarios','ajuste_estoque','formas_pagamento','logs']) AS recurso;

-- Formas de pagamento padrão
INSERT INTO formas_pagamento (nome, ativo) VALUES
    ('DINHEIRO', true),
    ('CREDITO', true),
    ('DEBITO', true),
    ('PIX', true);
```

**Senha padrão do admin:** `admin123` (forçar troca no primeiro login)

---

## 12. README.md (instruções de instalação)

O Claude Code deve gerar um README.md completo com:

1. Pré-requisitos: Node.js 18+, PostgreSQL 14+
2. Passos de instalação local (desenvolvimento)
3. Como criar o banco `vendas_db` no **Neon.tech** e rodar o `schema.sql`
4. Como configurar o `.env` com a `DATABASE_URL` do novo banco no Neon.tech
5. Como rodar backend (`npm run dev`) e frontend (`npm start`)
6. Como fazer deploy no Railway/Render apontando para o banco já existente
7. Credencial padrão de acesso

---

## 13. ARQUITETURA MULTI-SISTEMA (referência)

```
Neon.tech (mesma conta, bancos independentes)

┌──────────────────────────┐     ┌──────────────────────────┐
│   Banco: vendas_db       │     │   Banco: cobranca_db     │
│                          │     │                          │
│  - usuarios              │     │  - clientes              │
│  - produtos              │     │  - parcelas              │
│  - pedidos               │     │  - regras_mensagem       │
│  - itens_pedido          │     │  - historico_envios      │
│  - caixa                 │     │  - logs_sistema          │
│  - movim_estoque         │     │                          │
│  - logs_sistema          │     │                          │
└──────────────────────────┘     └──────────────────────────┘
          ▲                                   ▲
          │                                   │
   [Sistema PDV]                    [Sistema Cobrança]
   Node.js + React                  Node.js + React
   (Railway/Render)                 (Railway/Render)
```

Cada sistema tem seu próprio banco de dados, backend e frontend completamente independentes. A única coisa em comum é a conta no Neon.tech, o que centraliza a administração num único painel.

---

*Fim da especificação. Versão 1.2 — Junho 2026 (banco próprio no Neon.tech, independente do sistema de cobrança)*
