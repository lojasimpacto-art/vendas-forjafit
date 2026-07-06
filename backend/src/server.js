require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));

// Rotas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/produtos', require('./routes/produtos'));
app.use('/api/formas-pagamento', require('./routes/formasPagamento'));
app.use('/api/pedidos', require('./routes/vendas'));
app.use('/api/caixa', require('./routes/caixa'));
app.use('/api/estoque', require('./routes/estoque'));
app.use('/api/relatorios', require('./routes/relatorios'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/logs', require('./routes/logs'));

app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
