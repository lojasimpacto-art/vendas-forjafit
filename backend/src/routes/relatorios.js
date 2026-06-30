const router = require('express').Router();
const pool = require('../config/database');
const auth = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

// GET /api/relatorios/produtos-vendidos
router.get('/produtos-vendidos', auth, checkPermission('relatorios', 'pode_ver'), async (req, res) => {
  try {
    const { data_inicio, data_fim, produto_id } = req.query;
    const params = [];
    let where = "WHERE p.status = 'CONCLUIDA'";

    if (data_inicio) { params.push(data_inicio); where += ` AND p.data_venda >= $${params.length}`; }
    if (data_fim) { params.push(data_fim); where += ` AND p.data_venda <= $${params.length}`; }
    if (produto_id) { params.push(produto_id); where += ` AND ip.produto_id = $${params.length}`; }

    const { rows } = await pool.query(`
      SELECT
        ip.produto_id,
        ip.descricao_produto,
        SUM(ip.quantidade) as qtde_vendida,
        AVG(ip.preco_unitario) as preco_medio_venda,
        SUM(ip.subtotal) as total_vendido,
        SUM(ip.preco_custo * ip.quantidade) as custo_total,
        ROUND(
          (SUM(ip.subtotal) - SUM(ip.preco_custo * ip.quantidade)) / NULLIF(SUM(ip.subtotal), 0) * 100, 2
        ) as margem_pct
      FROM itens_pedido ip
      JOIN pedidos p ON p.id = ip.pedido_id
      ${where}
      GROUP BY ip.produto_id, ip.descricao_produto
      ORDER BY total_vendido DESC
    `, params);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/relatorios/vendas-periodo
router.get('/vendas-periodo', auth, checkPermission('relatorios', 'pode_ver'), async (req, res) => {
  try {
    const { data_inicio, data_fim, forma_pagamento_id } = req.query;
    const params = [];
    let where = 'WHERE 1=1';

    if (data_inicio) { params.push(data_inicio); where += ` AND p.data_venda >= $${params.length}`; }
    if (data_fim) { params.push(data_fim); where += ` AND p.data_venda <= $${params.length}`; }
    if (forma_pagamento_id) { params.push(forma_pagamento_id); where += ` AND p.forma_pagamento_id = $${params.length}`; }

    const { rows } = await pool.query(`
      SELECT p.*, fp.nome as forma_pagamento_nome, u.nome as operador_nome,
             (SELECT COUNT(*) FROM itens_pedido WHERE pedido_id = p.id) as qtde_itens
      FROM pedidos p
      LEFT JOIN formas_pagamento fp ON fp.id = p.forma_pagamento_id
      LEFT JOIN usuarios u ON u.id = p.usuario_id
      ${where}
      ORDER BY p.data_venda DESC, p.hora_venda DESC
    `, params);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/relatorios/estoque-atual
router.get('/estoque-atual', auth, checkPermission('relatorios', 'pode_ver'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, descricao, qtde_estoque, qtde_minima_estoque, preco_custo, preco_venda,
             (qtde_estoque * preco_custo) as valor_em_estoque,
             (qtde_estoque < qtde_minima_estoque) as estoque_baixo
      FROM produtos
      WHERE ativo = true
      ORDER BY descricao
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/relatorios/movimentacao-estoque
router.get('/movimentacao-estoque', auth, checkPermission('relatorios', 'pode_ver'), async (req, res) => {
  try {
    const { produto_id, tipo, data_inicio, data_fim } = req.query;
    const params = [];
    let where = 'WHERE 1=1';

    if (produto_id) { params.push(produto_id); where += ` AND me.produto_id = $${params.length}`; }
    if (tipo) { params.push(tipo); where += ` AND me.tipo = $${params.length}`; }
    if (data_inicio) { params.push(data_inicio); where += ` AND me.created_at::date >= $${params.length}`; }
    if (data_fim) { params.push(data_fim); where += ` AND me.created_at::date <= $${params.length}`; }

    const { rows } = await pool.query(`
      SELECT me.*, p.descricao as produto_nome, u.nome as usuario_nome
      FROM movimentacao_estoque me
      LEFT JOIN produtos p ON p.id = me.produto_id
      LEFT JOIN usuarios u ON u.id = me.usuario_id
      ${where}
      ORDER BY me.created_at DESC
    `, params);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/relatorios/resumo-caixa
router.get('/resumo-caixa', auth, checkPermission('relatorios', 'pode_ver'), async (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;
    const params = [];
    let where = 'WHERE 1=1';

    if (data_inicio) { params.push(data_inicio); where += ` AND c.data_caixa >= $${params.length}`; }
    if (data_fim) { params.push(data_fim); where += ` AND c.data_caixa <= $${params.length}`; }

    const { rows } = await pool.query(`
      SELECT c.*,
             u1.nome as aberto_por_nome,
             u2.nome as fechado_por_nome,
             (c.saldo_fechamento - c.total_dinheiro) as diferenca_dinheiro
      FROM caixa c
      LEFT JOIN usuarios u1 ON u1.id = c.aberto_por
      LEFT JOIN usuarios u2 ON u2.id = c.fechado_por
      ${where}
      ORDER BY c.data_caixa DESC
    `, params);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/relatorios/vendas-7dias (para dashboard)
router.get('/vendas-7dias', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT data_venda::text as data, SUM(valor_total) as total, COUNT(*) as qtde
      FROM pedidos
      WHERE data_venda >= CURRENT_DATE - INTERVAL '6 days' AND status = 'CONCLUIDA'
      GROUP BY data_venda
      ORDER BY data_venda ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
