# Sistema de Vendas PDV — Forjafit

Sistema web de ponto de venda com controle de estoque, caixa e relatórios.

## Pré-requisitos

- Node.js 18+
- Conta no [Neon.tech](https://neon.tech) (banco PostgreSQL)

---

## 1. Criar o banco de dados (Neon.tech)

1. Acesse [neon.tech](https://neon.tech) e crie um novo projeto/banco chamado **`vendas_db`**
2. Copie a `DATABASE_URL` do painel do Neon
3. Execute o script de criação das tabelas:
   - Acesse o SQL Editor no Neon
   - Cole e execute o conteúdo de `database/schema.sql`

---

## 2. Configurar o Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edite o `.env` e preencha:
```
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/vendas_db?sslmode=require
JWT_SECRET=uma_chave_secreta_longa_e_aleatoria
```

### Gerar senha do admin

```bash
node ../database/seed.js
```

Copie o hash gerado e execute no SQL Editor do Neon:
```sql
UPDATE usuarios SET senha_hash = 'HASH_AQUI' WHERE login = 'admin';
```

### Iniciar o backend

```bash
npm run dev       # desenvolvimento (nodemon)
npm start         # produção
```

O backend sobe na porta **3001**.

---

## 3. Configurar o Frontend

```bash
cd frontend
npm install
npm start
```

O frontend sobe na porta **3000** e faz proxy para `http://localhost:3001`.

---

## 4. Acesso inicial

| Campo | Valor |
|-------|-------|
| URL   | http://localhost:3000 |
| Usuário | `admin` |
| Senha | `Admin@123` |

---

## 5. Deploy no Railway / Render

### Backend
1. Crie um novo serviço apontando para a pasta `backend/`
2. Variáveis de ambiente: `DATABASE_URL`, `JWT_SECRET`, `PORT=3001`, `FRONTEND_URL=https://seu-frontend.railway.app`
3. Comando de start: `npm start`

### Frontend
1. Crie um serviço apontando para a pasta `frontend/`
2. Variável: `REACT_APP_API_URL=https://seu-backend.railway.app/api`
3. Build command: `npm run build`
4. Start command: `npx serve -s build`

---

## Estrutura do projeto

```
sistema-vendas/
├── backend/          # Node.js + Express (API REST)
├── frontend/         # React (SPA)
├── database/
│   ├── schema.sql    # Script de criação das tabelas
│   └── seed.js       # Gerador de hash de senha
└── README.md
```

## Credencial padrão

- **Usuário:** `admin`
- **Senha:** `Admin@123`
