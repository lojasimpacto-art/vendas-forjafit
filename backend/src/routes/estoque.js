const router = require('express').Router();
const pool = require('../config/database');
const auth = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const { log } = require('../middleware/logger');

// GET /api/estoque
router.get('/', auth, checkPermission('estoque', 'pode_ver'), async (req, res) => {
  try {
    const { estoque_baixo } = req.query;
    let query = 'SELECT * FROM produtos WHERE ativo = true';
    if (estoque_baixo === 'true') query += ' AND qtde_estoque < qtde_minima_estoque';
    query += ' ORDER BY descricao';
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/estoque/entrada
router.post('/entrada', auth, checkPermission('ajuste_estoque', 'pode_criar'), async (req, res) => {
  const { produto_id, quantidade, preco_custo, observacao } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: prod } = await client.query('SELECT * FROM produtos WHERE id = $1 AND ativo = true', [produto_id]);
    if (!prod[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Produto não encontrado' }); }

    const qtde_anterior = prod[0].qtde_estoque;
    const qtde_posterior = qtde_anterior + parseInt(quantidade);

    // Se informou novo preço de custo
    if (preco_custo && parseFloat(preco_custo) !== parseFloat(prod[0].preco_custo)) {
      await client.query(
        `INSERT INTO historico_precos (produto_id, tipo_preco, preco_anterior, preco_novo, alterado_por)
         VALUES ($1, 'CUSTO', $2, $3, $4)`,
        [produto_id, prod[0].preco_custo, preco_custo, req.usuario.id]
      );
      await client.query('UPDATE produtos SET preco_custo = $1, updated_at = NOW() WHERE id = $2', [preco_custo, produto_id]);
    }

    await client.query('UPDATE produtos SET qtde_estoque = $1, updated_at = NOW() WHERE id = $2', [qtde_posterior, produto_id]);

    await client.query(
      `INSERT INTO movimentacao_estoque (produto_id, tipo, quantidade, qtde_anterior, qtde_posterior, observacao, usuario_id)
       VALUES ($1, 'ENTRADA_COMPRA', $2, $3, $4, $5, $6)`,
      [produto_id, quantidade, qtde_anterior, qtde_posterior, observacao || null, req.usuario.id]
    );

    await client.query('COMMIT');

    await log({ usuario_id: req.usuario.id, acao: 'ENTRADA_ESTOQUE',
      tabela: 'produtos', registro_id: parseInt(produto_id),
      descricao: `Entrada de ${quantidade} unidade(s) de "${prod[0].descricao}". Estoque: ${qtde_anterior} → ${qtde_posterior}`,
      dados_antes: { qtde_estoque: qtde_anterior }, dados_depois: { qtde_estoque: qtde_posterior }, ip: req.ip });

    res.status(201).json({ ok: true, qtde_anterior, qtde_posterior });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/estoque/ajuste
router.post('/ajuste', auth, checkPermission('ajuste_estoque', 'pode_editar'), async (req, res) => {
  const { produto_id, tipo, quantidade, motivo } = req.body;
  // tipo: 'ENTRADA' ou 'SAIDA'

  if (!motivo) return res.status(400).json({ error: 'Motivo do ajuste é obrigatório' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: prod } = await client.query('SELECT * FROM produtos WHERE id = $1 AND ativo = true', [produto_id]);
    if (!prod[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Produto não encontrado' }); }

    const qtde_anterior = prod[0].qtde_estoque;
    const qtde_posterior = tipo === 'ENTRADA'
      ? qtde_anterior + parseInt(quantidade)
      : qtde_anterior - parseInt(quantidade);

    const tipoMovim = tipo === 'ENTRADA' ? 'AJUSTE_ENTRADA' : 'AJUSTE_SAIDA';

    await client.query('UPDATE produtos SET qtde_estoque = $1, updated_at = NOW() WHERE id = $2', [qtde_posterior, produto_id]);

    await client.query(
      `INSERT INTO movimentacao_estoque (produto_id, tipo, quantidade, qtde_anterior, qtde_posterior, observacao, usuario_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [produto_id, tipoMovim, quantidade, qtde_anterior, qtde_posterior, motivo, req.usuario.id]
    );

    await client.query('COMMIT');

    await log({ usuario_id: req.usuario.id, acao: 'AJUSTE_ESTOQUE',
      tabela: 'produtos', registro_id: parseInt(produto_id),
      descricao: `Ajuste ${tipo} de ${quantidade} un. em "${prod[0].descricao}". Motivo: ${motivo}`,
      dados_antes: { qtde_estoque: qtde_anterior }, dados_depois: { qtde_estoque: qtde_posterior }, ip: req.ip });

    res.status(201).json({ ok: true, qtde_anterior, qtde_posterior });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET /api/estoque/movimentacoes
router.get('/movimentacoes', auth, checkPermission('estoque', 'pode_ver'), async (req, res) => {
  try {
    const { produto_id, tipo, data_inicio, data_fim } = req.query;
    let query = `
      SELECT me.*, p.descricao as produto_nome, u.nome as usuario_nome
      FROM movimentacao_estoque me
      LEFT JOIN produtos p ON p.id = me.produto_id
      LEFT JOIN usuarios u ON u.id = me.usuario_id
      WHERE 1=1`;
    const params = [];

    if (produto_id) { params.push(produto_id); query += ` AND me.produto_id = $${params.length}`; }
    if (tipo) { params.push(tipo); query += ` AND me.tipo = $${params.length}`; }
    if (data_inicio) { params.push(data_inicio); query += ` AND me.created_at::date >= $${params.length}`; }
    if (data_fim) { params.push(data_fim); query += ` AND me.created_at::date <= $${params.length}`; }

    query += ' ORDER BY me.created_at DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
