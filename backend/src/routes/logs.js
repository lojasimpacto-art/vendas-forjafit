const router = require('express').Router();
const pool = require('../config/database');
const auth = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

// GET /api/logs
router.get('/', auth, checkPermission('logs', 'pode_ver'), async (req, res) => {
  try {
    const { usuario_id, acao, tabela, data_inicio, data_fim } = req.query;
    const params = [];
    let where = 'WHERE 1=1';

    if (usuario_id) { params.push(usuario_id); where += ` AND l.usuario_id = $${params.length}`; }
    if (acao) { params.push(`%${acao}%`); where += ` AND l.acao ILIKE $${params.length}`; }
    if (tabela) { params.push(tabela); where += ` AND l.tabela = $${params.length}`; }
    if (data_inicio) { params.push(data_inicio); where += ` AND l.created_at::date >= $${params.length}`; }
    if (data_fim) { params.push(data_fim); where += ` AND l.created_at::date <= $${params.length}`; }

    const { rows } = await pool.query(`
      SELECT l.*, u.nome as usuario_nome
      FROM logs_sistema l
      LEFT JOIN usuarios u ON u.id = l.usuario_id
      ${where}
      ORDER BY l.created_at DESC
      LIMIT 500
    `, params);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
