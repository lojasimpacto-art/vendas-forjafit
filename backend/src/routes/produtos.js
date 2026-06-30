const router = require('express').Router();
const path = require('path');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const { log } = require('../middleware/logger');
const upload = require('../config/multer');

// GET /api/produtos
router.get('/', auth, checkPermission('produtos', 'pode_ver'), async (req, res) => {
  try {
    const { busca, estoque_baixo, ativo } = req.query;
    let query = 'SELECT * FROM produtos WHERE 1=1';
    const params = [];

    if (ativo !== 'todos') {
      params.push(ativo === 'false' ? false : true);
      query += ` AND ativo = $${params.length}`;
    }
    if (busca) {
      params.push(`%${busca}%`);
      query += ` AND descricao ILIKE $${params.length}`;
    }
    if (estoque_baixo === 'true') {
      query += ` AND qtde_estoque < qtde_minima_estoque`;
    }
    query += ' ORDER BY descricao';

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/produtos/:id
router.get('/:id', auth, checkPermission('produtos', 'pode_ver'), async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM produtos WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/produtos
router.post('/', auth, checkPermission('produtos', 'pode_criar'), async (req, res) => {
  const { descricao, preco_custo, preco_venda, qtde_minima_estoque } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO produtos (descricao, preco_custo, preco_venda, qtde_minima_estoque)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [descricao, preco_custo || 0, preco_venda || 0, qtde_minima_estoque || 0]
    );
    await log({
      usuario_id: req.usuario.id, acao: 'CADASTRO_PRODUTO',
      tabela: 'produtos', registro_id: rows[0].id,
      descricao: `Produto criado: ${descricao}`,
      dados_depois: rows[0], ip: req.ip
    });
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/produtos/:id
router.put('/:id', auth, checkPermission('produtos', 'pode_editar'), async (req, res) => {
  const { id } = req.params;
  const { descricao, preco_custo, preco_venda, qtde_minima_estoque, ativo } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: atual } = await client.query('SELECT * FROM produtos WHERE id = $1', [id]);
    if (!atual[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Produto não encontrado' }); }

    const antes = atual[0];

    // Verificar mudança de preços
    if (preco_custo !== undefined && parseFloat(preco_custo) !== parseFloat(antes.preco_custo)) {
      await client.query(
        `INSERT INTO historico_precos (produto_id, tipo_preco, preco_anterior, preco_novo, alterado_por)
         VALUES ($1, 'CUSTO', $2, $3, $4)`,
        [id, antes.preco_custo, preco_custo, req.usuario.id]
      );
      await log({ usuario_id: req.usuario.id, acao: 'ALTERACAO_PRECO', tabela: 'produtos', registro_id: parseInt(id),
        descricao: `Preço de custo alterado: ${antes.preco_custo} → ${preco_custo}`,
        dados_antes: { preco_custo: antes.preco_custo }, dados_depois: { preco_custo }, ip: req.ip });
    }
    if (preco_venda !== undefined && parseFloat(preco_venda) !== parseFloat(antes.preco_venda)) {
      await client.query(
        `INSERT INTO historico_precos (produto_id, tipo_preco, preco_anterior, preco_novo, alterado_por)
         VALUES ($1, 'VENDA', $2, $3, $4)`,
        [id, antes.preco_venda, preco_venda, req.usuario.id]
      );
      await log({ usuario_id: req.usuario.id, acao: 'ALTERACAO_PRECO', tabela: 'produtos', registro_id: parseInt(id),
        descricao: `Preço de venda alterado: ${antes.preco_venda} → ${preco_venda}`,
        dados_antes: { preco_venda: antes.preco_venda }, dados_depois: { preco_venda }, ip: req.ip });
    }

    const { rows } = await client.query(
      `UPDATE produtos SET
        descricao = COALESCE($1, descricao),
        preco_custo = COALESCE($2, preco_custo),
        preco_venda = COALESCE($3, preco_venda),
        qtde_minima_estoque = COALESCE($4, qtde_minima_estoque),
        ativo = COALESCE($5, ativo),
        updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [descricao, preco_custo, preco_venda, qtde_minima_estoque, ativo, id]
    );

    await client.query('COMMIT');

    const acao = ativo === false ? 'INATIVACAO_PRODUTO' : 'EDICAO_PRODUTO';
    await log({ usuario_id: req.usuario.id, acao, tabela: 'produtos', registro_id: parseInt(id),
      descricao: `Produto editado: ${rows[0].descricao}`,
      dados_antes: antes, dados_depois: rows[0], ip: req.ip });

    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// DELETE /api/produtos/:id  (soft delete)
router.delete('/:id', auth, checkPermission('produtos', 'pode_excluir'), async (req, res) => {
  try {
    const { rows: antes } = await pool.query('SELECT * FROM produtos WHERE id = $1', [req.params.id]);
    if (!antes[0]) return res.status(404).json({ error: 'Produto não encontrado' });

    await pool.query('UPDATE produtos SET ativo = false, updated_at = NOW() WHERE id = $1', [req.params.id]);
    await log({ usuario_id: req.usuario.id, acao: 'INATIVACAO_PRODUTO', tabela: 'produtos',
      registro_id: parseInt(req.params.id), descricao: `Produto inativado: ${antes[0].descricao}`,
      dados_antes: antes[0], ip: req.ip });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/produtos/:id/historico-precos
router.get('/:id/historico-precos', auth, checkPermission('produtos', 'pode_ver'), async (req, res) => {
  try {
    const { tipo } = req.query;
    let query = `SELECT hp.*, u.nome as alterado_por_nome
                 FROM historico_precos hp
                 LEFT JOIN usuarios u ON u.id = hp.alterado_por
                 WHERE hp.produto_id = $1`;
    const params = [req.params.id];
    if (tipo) { params.push(tipo); query += ` AND hp.tipo_preco = $${params.length}`; }
    query += ' ORDER BY hp.alterado_em DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/produtos/:id/foto
router.post('/:id/foto', auth, checkPermission('produtos', 'pode_editar'), upload.single('foto'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhuma foto enviada' });
    const fotoUrl = `/uploads/${req.file.filename}`;
    await pool.query('UPDATE produtos SET foto_url = $1, updated_at = NOW() WHERE id = $2', [fotoUrl, req.params.id]);
    res.json({ foto_url: fotoUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
