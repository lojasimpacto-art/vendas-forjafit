const router = require('express').Router();
const bcrypt = require('bcrypt');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const { log } = require('../middleware/logger');

const RECURSOS = ['produtos','vendas','caixa','estoque','relatorios','usuarios','ajuste_estoque','formas_pagamento','logs'];

// GET /api/usuarios
router.get('/', auth, checkPermission('usuarios', 'pode_ver'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nome, login, ativo, trocar_senha, created_at FROM usuarios ORDER BY nome'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/usuarios/:id
router.get('/:id', auth, checkPermission('usuarios', 'pode_ver'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nome, login, ativo, trocar_senha, created_at FROM usuarios WHERE id = $1',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuário não encontrado' });

    const { rows: permissoes } = await pool.query(
      'SELECT * FROM permissoes WHERE usuario_id = $1', [req.params.id]
    );

    res.json({ ...rows[0], permissoes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/usuarios
router.post('/', auth, checkPermission('usuarios', 'pode_criar'), async (req, res) => {
  const { nome, login, senha, ativo, trocar_senha, permissoes } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const senha_hash = await bcrypt.hash(senha, 10);
    const { rows } = await client.query(
      `INSERT INTO usuarios (nome, login, senha_hash, ativo, trocar_senha)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, nome, login, ativo, trocar_senha`,
      [nome, login, senha_hash, ativo !== false, trocar_senha || false]
    );
    const usuario = rows[0];

    // Inserir permissões
    for (const recurso of RECURSOS) {
      const perm = permissoes?.find(p => p.recurso === recurso) || {};
      await client.query(
        `INSERT INTO permissoes (usuario_id, recurso, pode_ver, pode_criar, pode_editar, pode_excluir, pode_reabrir)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [usuario.id, recurso,
         perm.pode_ver || false, perm.pode_criar || false,
         perm.pode_editar || false, perm.pode_excluir || false,
         recurso === 'caixa' ? (perm.pode_reabrir || false) : false]
      );
    }

    await client.query('COMMIT');

    await log({ usuario_id: req.usuario.id, acao: 'CADASTRO_USUARIO',
      tabela: 'usuarios', registro_id: usuario.id,
      descricao: `Usuário criado: ${nome} (${login})`,
      dados_depois: { nome, login, ativo }, ip: req.ip });

    res.status(201).json(usuario);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(400).json({ error: 'Login já está em uso' });
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/usuarios/:id
router.put('/:id', auth, checkPermission('usuarios', 'pode_editar'), async (req, res) => {
  const { id } = req.params;
  const { nome, login, senha, ativo, trocar_senha } = req.body;

  // Não pode desativar a si mesmo
  if (parseInt(id) === req.usuario.id && ativo === false) {
    return res.status(400).json({ error: 'Não é possível desativar seu próprio usuário' });
  }

  try {
    const { rows: antes } = await pool.query('SELECT id, nome, login, ativo FROM usuarios WHERE id = $1', [id]);
    if (!antes[0]) return res.status(404).json({ error: 'Usuário não encontrado' });

    let senha_hash = antes[0].senha_hash;
    if (senha) senha_hash = await bcrypt.hash(senha, 10);

    const { rows } = await pool.query(
      `UPDATE usuarios SET nome = COALESCE($1, nome), login = COALESCE($2, login),
       senha_hash = $3, ativo = COALESCE($4, ativo), trocar_senha = COALESCE($5, trocar_senha),
       updated_at = NOW() WHERE id = $6
       RETURNING id, nome, login, ativo, trocar_senha`,
      [nome, login, senha_hash, ativo, trocar_senha, id]
    );

    await log({ usuario_id: req.usuario.id, acao: 'EDICAO_USUARIO',
      tabela: 'usuarios', registro_id: parseInt(id),
      descricao: `Usuário editado: ${rows[0].nome}`,
      dados_antes: antes[0], dados_depois: rows[0], ip: req.ip });

    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Login já está em uso' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/usuarios/:id/permissoes
router.put('/:id/permissoes', auth, checkPermission('usuarios', 'pode_editar'), async (req, res) => {
  const { permissoes } = req.body;
  const usuario_id = req.params.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: antes } = await client.query('SELECT * FROM permissoes WHERE usuario_id = $1', [usuario_id]);

    await client.query('DELETE FROM permissoes WHERE usuario_id = $1', [usuario_id]);

    for (const recurso of RECURSOS) {
      const perm = permissoes?.find(p => p.recurso === recurso) || {};
      await client.query(
        `INSERT INTO permissoes (usuario_id, recurso, pode_ver, pode_criar, pode_editar, pode_excluir, pode_reabrir)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [usuario_id, recurso,
         perm.pode_ver || false, perm.pode_criar || false,
         perm.pode_editar || false, perm.pode_excluir || false,
         recurso === 'caixa' ? (perm.pode_reabrir || false) : false]
      );
    }

    const { rows: depois } = await client.query('SELECT * FROM permissoes WHERE usuario_id = $1', [usuario_id]);
    await client.query('COMMIT');

    await log({ usuario_id: req.usuario.id, acao: 'ALTERACAO_PERMISSAO',
      tabela: 'permissoes', registro_id: parseInt(usuario_id),
      descricao: `Permissões alteradas para usuário ${usuario_id}`,
      dados_antes: antes, dados_depois: depois, ip: req.ip });

    res.json(depois);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// DELETE /api/usuarios/:id (soft delete)
router.delete('/:id', auth, checkPermission('usuarios', 'pode_excluir'), async (req, res) => {
  if (parseInt(req.params.id) === req.usuario.id) {
    return res.status(400).json({ error: 'Não é possível excluir seu próprio usuário' });
  }
  try {
    await pool.query('UPDATE usuarios SET ativo = false, updated_at = NOW() WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
