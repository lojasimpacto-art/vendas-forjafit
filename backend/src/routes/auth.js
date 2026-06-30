const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { log } = require('../middleware/logger');
const auth = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { login, senha } = req.body;
  const ip = req.ip;

  try {
    const { rows } = await pool.query(
      'SELECT * FROM usuarios WHERE login = $1 AND ativo = true',
      [login]
    );

    if (rows.length === 0) {
      await log({ acao: 'LOGIN_FALHA', descricao: `Tentativa de login: ${login}`, ip });
      return res.status(401).json({ error: 'Usuário ou senha inválidos' });
    }

    const usuario = rows[0];
    const senhaOk = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaOk) {
      await log({ usuario_id: usuario.id, acao: 'LOGIN_FALHA', descricao: `Senha incorreta para: ${login}`, ip });
      return res.status(401).json({ error: 'Usuário ou senha inválidos' });
    }

    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome, login: usuario.login },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    await log({ usuario_id: usuario.id, acao: 'LOGIN_SUCESSO', descricao: `Login realizado`, ip });

    // Buscar permissões
    const { rows: permissoes } = await pool.query(
      'SELECT * FROM permissoes WHERE usuario_id = $1',
      [usuario.id]
    );

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        login: usuario.login,
        trocar_senha: usuario.trocar_senha
      },
      permissoes
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nome, login, ativo, trocar_senha FROM usuarios WHERE id = $1',
      [req.usuario.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuário não encontrado' });

    const { rows: permissoes } = await pool.query(
      'SELECT * FROM permissoes WHERE usuario_id = $1',
      [req.usuario.id]
    );

    res.json({ usuario: rows[0], permissoes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', auth, async (req, res) => {
  await log({ usuario_id: req.usuario.id, acao: 'LOGOUT', ip: req.ip });
  res.json({ ok: true });
});

module.exports = router;
