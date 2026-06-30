const router = require('express').Router();
const bcrypt = require('bcrypt');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const { log } = require('../middleware/logger');

// GET /api/caixa/status
router.get('/status', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM caixa WHERE data_caixa = CURRENT_DATE"
    );
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/caixa/hoje
router.get('/hoje', auth, checkPermission('caixa', 'pode_ver'), async (req, res) => {
  try {
    const { rows: caixa } = await pool.query(
      `SELECT c.*, u1.nome as aberto_por_nome, u2.nome as fechado_por_nome
       FROM caixa c
       LEFT JOIN usuarios u1 ON u1.id = c.aberto_por
       LEFT JOIN usuarios u2 ON u2.id = c.fechado_por
       WHERE c.data_caixa = CURRENT_DATE`
    );
    if (!caixa[0]) return res.json(null);

    const { rows: vendas } = await pool.query(`
      SELECT p.*, fp.nome as forma_pagamento_nome, u.nome as operador_nome
      FROM pedidos p
      LEFT JOIN formas_pagamento fp ON fp.id = p.forma_pagamento_id
      LEFT JOIN usuarios u ON u.id = p.usuario_id
      WHERE p.data_venda = CURRENT_DATE AND p.status = 'CONCLUIDA'
      ORDER BY p.hora_venda DESC`
    );

    res.json({ ...caixa[0], vendas });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/caixa/historico
router.get('/historico', auth, checkPermission('caixa', 'pode_ver'), async (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;
    let query = `
      SELECT c.*, u1.nome as aberto_por_nome, u2.nome as fechado_por_nome
      FROM caixa c
      LEFT JOIN usuarios u1 ON u1.id = c.aberto_por
      LEFT JOIN usuarios u2 ON u2.id = c.fechado_por
      WHERE 1=1`;
    const params = [];
    if (data_inicio) { params.push(data_inicio); query += ` AND c.data_caixa >= $${params.length}`; }
    if (data_fim) { params.push(data_fim); query += ` AND c.data_caixa <= $${params.length}`; }
    query += ' ORDER BY c.data_caixa DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/caixa/:id
router.get('/:id', auth, checkPermission('caixa', 'pode_ver'), async (req, res) => {
  try {
    const { rows: caixa } = await pool.query(
      `SELECT c.*, u1.nome as aberto_por_nome, u2.nome as fechado_por_nome
       FROM caixa c
       LEFT JOIN usuarios u1 ON u1.id = c.aberto_por
       LEFT JOIN usuarios u2 ON u2.id = c.fechado_por
       WHERE c.id = $1`, [req.params.id]
    );
    if (!caixa[0]) return res.status(404).json({ error: 'Caixa não encontrado' });

    const { rows: vendas } = await pool.query(`
      SELECT p.*, fp.nome as forma_pagamento_nome, u.nome as operador_nome
      FROM pedidos p
      LEFT JOIN formas_pagamento fp ON fp.id = p.forma_pagamento_id
      LEFT JOIN usuarios u ON u.id = p.usuario_id
      WHERE p.data_venda = $1
      ORDER BY p.hora_venda DESC`, [caixa[0].data_caixa]
    );

    res.json({ ...caixa[0], vendas });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/caixa/abrir
router.post('/abrir', auth, checkPermission('caixa', 'pode_criar'), async (req, res) => {
  const { saldo_abertura } = req.body;
  const client = await pool.connect();
  try {
    const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bahia' });

    const { rows: existente } = await client.query(
      'SELECT id, status FROM caixa WHERE data_caixa = $1', [hoje]
    );

    if (existente.length > 0 && existente[0].status === 'ABERTO') {
      return res.status(400).json({ error: 'Já existe um caixa aberto para hoje.' });
    }
    if (existente.length > 0 && existente[0].status === 'FECHADO') {
      return res.status(400).json({ error: 'O caixa de hoje já foi fechado. Use a opção de reabertura.', reabrir: true });
    }

    // Fechar automaticamente caixas de dias anteriores que ficaram abertos
    await client.query(
      `UPDATE caixa SET status = 'FECHADO', fechado_em = NOW(), observacao = 'Fechamento automático — novo dia'
       WHERE status = 'ABERTO' AND data_caixa < $1`, [hoje]
    );

    const { rows } = await client.query(
      `INSERT INTO caixa (data_caixa, saldo_abertura, status, aberto_por, aberto_em)
       VALUES ($1, $2, 'ABERTO', $3, NOW()) RETURNING *`,
      [hoje, saldo_abertura || 0, req.usuario.id]
    );

    await log({ usuario_id: req.usuario.id, acao: 'ABERTURA_CAIXA',
      tabela: 'caixa', registro_id: rows[0].id,
      descricao: `Caixa aberto com saldo de R$ ${saldo_abertura || 0}`, ip: req.ip });

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// POST /api/caixa/fechar
router.post('/fechar', auth, checkPermission('caixa', 'pode_editar'), async (req, res) => {
  const { valor_contado, observacao, caixa_id } = req.body;
  const client = await pool.connect();
  try {
    let caixaAlvo;
    if (caixa_id) {
      const { rows } = await client.query('SELECT * FROM caixa WHERE id = $1', [caixa_id]);
      if (!rows[0]) return res.status(404).json({ error: 'Caixa não encontrado.' });
      caixaAlvo = rows[0];
    } else {
      const { rows } = await client.query("SELECT * FROM caixa WHERE status = 'ABERTO' ORDER BY data_caixa DESC LIMIT 1");
      if (!rows[0]) return res.status(400).json({ error: 'Não há caixa aberto para fechar.' });
      caixaAlvo = rows[0];
    }

    if (caixaAlvo.status === 'FECHADO') return res.status(400).json({ error: 'Este caixa já está fechado.' });

    const { rows } = await client.query(
      `UPDATE caixa SET status = 'FECHADO', saldo_fechamento = $1, fechado_por = $2,
       fechado_em = NOW(), observacao = $3 WHERE id = $4 RETURNING *`,
      [valor_contado || 0, req.usuario.id, observacao || null, caixaAlvo.id]
    );

    await log({ usuario_id: req.usuario.id, acao: 'FECHAMENTO_CAIXA',
      tabela: 'caixa', registro_id: caixaAlvo.id,
      descricao: `Caixa fechado. Total vendas: R$ ${caixaAlvo.total_vendas}`,
      dados_antes: caixaAlvo, dados_depois: rows[0], ip: req.ip });

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// POST /api/caixa/reabrir  (PDV — valida senha de qualquer usuário com pode_reabrir)
router.post('/reabrir', auth, async (req, res) => {
  const { caixa_id, senha } = req.body;

  if (!caixa_id || !senha) return res.status(400).json({ message: 'Informe o caixa e a senha de autorização.' });

  try {
    const caixaRes = await pool.query('SELECT * FROM caixa WHERE id = $1', [caixa_id]);
    if (!caixaRes.rows[0]) return res.status(404).json({ message: 'Caixa não encontrado.' });
    if (caixaRes.rows[0].status === 'ABERTO') return res.status(400).json({ message: 'Caixa já está aberto.' });

    // Encontrar um usuário com pode_reabrir cuja senha bate
    const { rows: candidatos } = await pool.query(
      `SELECT u.id, u.nome, u.senha_hash FROM usuarios u
       JOIN permissoes p ON p.usuario_id = u.id
       WHERE u.ativo = true AND p.recurso = 'caixa' AND p.pode_reabrir = true`
    );

    let autorizado = null;
    for (const u of candidatos) {
      if (await bcrypt.compare(senha, u.senha_hash)) { autorizado = u; break; }
    }

    if (!autorizado) return res.status(403).json({ message: 'Senha inválida ou usuário sem permissão para reabrir o caixa.' });

    const { rows } = await pool.query(
      `UPDATE caixa SET status = 'ABERTO', reaberto_por = $1, autorizado_por = $2,
       reaberto_em = NOW(), saldo_fechamento = NULL, fechado_por = NULL, fechado_em = NULL
       WHERE id = $3 RETURNING *`,
      [req.usuario.id, autorizado.id, caixa_id]
    );

    await log({ usuario_id: req.usuario.id, acao: 'REABERTURA_CAIXA',
      tabela: 'caixa', registro_id: caixa_id,
      descricao: `Caixa reaberto via PDV. Autorizado por: ${autorizado.nome}`,
      dados_antes: caixaRes.rows[0], dados_depois: rows[0], ip: req.ip });

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/caixa/:id/reabrir  (supervisor override)
router.post('/:id/reabrir', auth, async (req, res) => {
  const { login, senha } = req.body;

  if (!login || !senha) return res.status(400).json({ error: 'Informe usuário e senha do supervisor' });

  try {
    // Validar credenciais do supervisor
    const { rows: supervisor } = await pool.query(
      'SELECT * FROM usuarios WHERE login = $1 AND ativo = true', [login]
    );
    if (!supervisor[0]) return res.status(401).json({ error: 'Supervisor não encontrado' });

    const senhaOk = await bcrypt.compare(senha, supervisor[0].senha_hash);
    if (!senhaOk) return res.status(401).json({ error: 'Senha do supervisor inválida' });

    // Verificar permissão pode_reabrir
    const { rows: perm } = await pool.query(
      "SELECT pode_reabrir FROM permissoes WHERE usuario_id = $1 AND recurso = 'caixa'",
      [supervisor[0].id]
    );
    if (!perm[0] || !perm[0].pode_reabrir) {
      return res.status(403).json({ error: 'Supervisor sem permissão para reabrir caixa' });
    }

    const { rows: caixa } = await pool.query('SELECT * FROM caixa WHERE id = $1', [req.params.id]);
    if (!caixa[0]) return res.status(404).json({ error: 'Caixa não encontrado' });
    if (caixa[0].status === 'ABERTO') return res.status(400).json({ error: 'Caixa já está aberto' });

    const { rows } = await pool.query(
      `UPDATE caixa SET status = 'ABERTO', reaberto_por = $1, autorizado_por = $2,
       reaberto_em = NOW(), saldo_fechamento = NULL, fechado_por = NULL, fechado_em = NULL
       WHERE id = $3 RETURNING *`,
      [req.usuario.id, supervisor[0].id, req.params.id]
    );

    await log({ usuario_id: req.usuario.id, acao: 'REABERTURA_CAIXA',
      tabela: 'caixa', registro_id: caixa[0].id,
      descricao: `Caixa reaberto. Autorizado por: ${supervisor[0].nome}`,
      dados_antes: caixa[0], dados_depois: rows[0], ip: req.ip });

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
