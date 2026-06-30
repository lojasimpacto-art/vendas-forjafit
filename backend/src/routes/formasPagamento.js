const router = require('express').Router();
const pool = require('../config/database');
const auth = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

// GET /api/formas-pagamento
router.get('/', auth, async (req, res) => {
  try {
    const { ativo } = req.query;
    let query = 'SELECT * FROM formas_pagamento';
    const params = [];
    if (ativo !== 'todos') {
      params.push(true);
      query += ' WHERE ativo = $1';
    }
    query += ' ORDER BY id';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/formas-pagamento
router.post('/', auth, checkPermission('formas_pagamento', 'pode_criar'), async (req, res) => {
  try {
    const { nome } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO formas_pagamento (nome) VALUES ($1) RETURNING *',
      [nome]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/formas-pagamento/:id
router.put('/:id', auth, checkPermission('formas_pagamento', 'pode_editar'), async (req, res) => {
  try {
    const { nome, ativo } = req.body;

    // Verificar se foi usada em vendas antes de inativar
    if (ativo === false) {
      const { rows } = await pool.query(
        'SELECT id FROM pedidos WHERE forma_pagamento_id = $1 LIMIT 1',
        [req.params.id]
      );
      if (rows.length > 0) {
        return res.status(400).json({ error: 'Esta forma de pagamento já foi usada em vendas e não pode ser excluída' });
      }
    }

    const { rows } = await pool.query(
      'UPDATE formas_pagamento SET nome = COALESCE($1, nome), ativo = COALESCE($2, ativo) WHERE id = $3 RETURNING *',
      [nome, ativo, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
