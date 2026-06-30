const router = require('express').Router();
const pool = require('../config/database');
const auth = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const { log } = require('../middleware/logger');

// GET /api/pedidos
router.get('/', auth, checkPermission('vendas', 'pode_ver'), async (req, res) => {
  try {
    const { data_inicio, data_fim, forma_pagamento_id, status } = req.query;
    let query = `
      SELECT p.*, fp.nome as forma_pagamento_nome, u.nome as operador_nome
      FROM pedidos p
      LEFT JOIN formas_pagamento fp ON fp.id = p.forma_pagamento_id
      LEFT JOIN usuarios u ON u.id = p.usuario_id
      WHERE 1=1`;
    const params = [];

    if (data_inicio) { params.push(data_inicio); query += ` AND p.data_venda >= $${params.length}`; }
    if (data_fim) { params.push(data_fim); query += ` AND p.data_venda <= $${params.length}`; }
    if (forma_pagamento_id) { params.push(forma_pagamento_id); query += ` AND p.forma_pagamento_id = $${params.length}`; }
    if (status) { params.push(status); query += ` AND p.status = $${params.length}`; }

    query += ' ORDER BY p.created_at DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pedidos/hoje
router.get('/hoje', auth, checkPermission('vendas', 'pode_ver'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*, fp.nome as forma_pagamento_nome, u.nome as operador_nome
      FROM pedidos p
      LEFT JOIN formas_pagamento fp ON fp.id = p.forma_pagamento_id
      LEFT JOIN usuarios u ON u.id = p.usuario_id
      WHERE p.data_venda = CURRENT_DATE AND p.status = 'CONCLUIDA'
      ORDER BY p.hora_venda DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pedidos/:id
router.get('/:id', auth, checkPermission('vendas', 'pode_ver'), async (req, res) => {
  try {
    const { rows: pedido } = await pool.query(`
      SELECT p.*, fp.nome as forma_pagamento_nome, u.nome as operador_nome
      FROM pedidos p
      LEFT JOIN formas_pagamento fp ON fp.id = p.forma_pagamento_id
      LEFT JOIN usuarios u ON u.id = p.usuario_id
      WHERE p.id = $1`, [req.params.id]);

    if (!pedido[0]) return res.status(404).json({ error: 'Venda não encontrada' });

    const { rows: itens } = await pool.query(
      'SELECT * FROM itens_pedido WHERE pedido_id = $1 ORDER BY id',
      [req.params.id]
    );

    res.json({ ...pedido[0], itens });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pedidos  (criar venda)
router.post('/', auth, checkPermission('vendas', 'pode_criar'), async (req, res) => {
  const { itens, forma_pagamento_id, valor_recebido, observacao } = req.body;

  if (!itens || itens.length === 0) return res.status(400).json({ error: 'A venda deve ter ao menos um item' });
  if (!forma_pagamento_id) return res.status(400).json({ error: 'Forma de pagamento é obrigatória' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar se caixa está aberto
    const { rows: caixaRows } = await client.query(
      "SELECT id FROM caixa WHERE data_caixa = CURRENT_DATE AND status = 'ABERTO'"
    );
    if (caixaRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Caixa do dia não está aberto' });
    }
    const caixaId = caixaRows[0].id;

    // Calcular total e verificar estoque
    let valor_total = 0;
    const itensProcessados = [];

    for (const item of itens) {
      const { rows: prod } = await client.query(
        'SELECT * FROM produtos WHERE id = $1 AND ativo = true',
        [item.produto_id]
      );
      if (!prod[0]) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Produto ${item.produto_id} não encontrado` });
      }
      if (prod[0].qtde_estoque <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Produto "${prod[0].descricao}" está sem estoque` });
      }

      const subtotal = parseFloat(prod[0].preco_venda) * parseInt(item.quantidade);
      valor_total += subtotal;
      itensProcessados.push({ ...item, produto: prod[0], subtotal });
    }

    const troco = forma_pagamento_id === 1 ? Math.max(0, parseFloat(valor_recebido || 0) - valor_total) : 0;
    const vr = forma_pagamento_id === 1 ? parseFloat(valor_recebido || valor_total) : valor_total;

    // Inserir pedido
    const { rows: pedido } = await client.query(
      `INSERT INTO pedidos (valor_total, forma_pagamento_id, valor_recebido, troco, usuario_id, observacao)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [valor_total, forma_pagamento_id, vr, troco, req.usuario.id, observacao || null]
    );

    // Inserir itens e baixar estoque
    for (const item of itensProcessados) {
      await client.query(
        `INSERT INTO itens_pedido (pedido_id, produto_id, descricao_produto, quantidade, preco_unitario, preco_custo, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [pedido[0].id, item.produto_id, item.produto.descricao, item.quantidade,
         item.produto.preco_venda, item.produto.preco_custo, item.subtotal]
      );

      const qtde_anterior = item.produto.qtde_estoque;
      const qtde_posterior = qtde_anterior - parseInt(item.quantidade);

      await client.query(
        'UPDATE produtos SET qtde_estoque = $1, updated_at = NOW() WHERE id = $2',
        [qtde_posterior, item.produto_id]
      );

      await client.query(
        `INSERT INTO movimentacao_estoque (produto_id, tipo, quantidade, qtde_anterior, qtde_posterior, referencia_id, observacao, usuario_id)
         VALUES ($1, 'SAIDA_VENDA', $2, $3, $4, $5, $6, $7)`,
        [item.produto_id, item.quantidade, qtde_anterior, qtde_posterior, pedido[0].id,
         `Venda #${pedido[0].numero_venda}`, req.usuario.id]
      );
    }

    // Atualizar caixa
    const fp = await client.query('SELECT nome FROM formas_pagamento WHERE id = $1', [forma_pagamento_id]);
    const fpNome = fp.rows[0]?.nome || '';
    const colunaCaixa = {
      'DINHEIRO': 'total_dinheiro',
      'CREDITO': 'total_credito',
      'DEBITO': 'total_debito',
      'PIX': 'total_pix'
    }[fpNome] || 'total_dinheiro';

    await client.query(
      `UPDATE caixa SET ${colunaCaixa} = ${colunaCaixa} + $1, total_vendas = total_vendas + $1 WHERE id = $2`,
      [valor_total, caixaId]
    );

    await client.query('COMMIT');

    await log({ usuario_id: req.usuario.id, acao: 'VENDA_REALIZADA',
      tabela: 'pedidos', registro_id: pedido[0].id,
      descricao: `Venda #${pedido[0].numero_venda} — R$ ${valor_total.toFixed(2)}`,
      dados_depois: pedido[0], ip: req.ip });

    res.status(201).json(pedido[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/pedidos/:id/cancelar
router.put('/:id/cancelar', auth, checkPermission('vendas', 'pode_editar'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: pedido } = await client.query('SELECT * FROM pedidos WHERE id = $1', [req.params.id]);
    if (!pedido[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Venda não encontrada' }); }
    if (pedido[0].status === 'CANCELADA') { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Venda já cancelada' }); }

    const { rows: itens } = await client.query('SELECT * FROM itens_pedido WHERE pedido_id = $1', [req.params.id]);

    // Estornar estoque
    for (const item of itens) {
      const { rows: prod } = await client.query('SELECT qtde_estoque FROM produtos WHERE id = $1', [item.produto_id]);
      const qtde_anterior = prod[0].qtde_estoque;
      const qtde_posterior = qtde_anterior + item.quantidade;

      await client.query('UPDATE produtos SET qtde_estoque = $1, updated_at = NOW() WHERE id = $2',
        [qtde_posterior, item.produto_id]);

      await client.query(
        `INSERT INTO movimentacao_estoque (produto_id, tipo, quantidade, qtde_anterior, qtde_posterior, referencia_id, observacao, usuario_id)
         VALUES ($1, 'AJUSTE_ENTRADA', $2, $3, $4, $5, $6, $7)`,
        [item.produto_id, item.quantidade, qtde_anterior, qtde_posterior,
         pedido[0].id, `Estorno cancelamento venda #${pedido[0].numero_venda}`, req.usuario.id]
      );
    }

    // Reverter caixa
    const fp = await client.query('SELECT nome FROM formas_pagamento WHERE id = $1', [pedido[0].forma_pagamento_id]);
    const fpNome = fp.rows[0]?.nome || '';
    const colunaCaixa = { 'DINHEIRO': 'total_dinheiro', 'CREDITO': 'total_credito', 'DEBITO': 'total_debito', 'PIX': 'total_pix' }[fpNome] || 'total_dinheiro';

    await client.query(
      `UPDATE caixa SET ${colunaCaixa} = ${colunaCaixa} - $1, total_vendas = total_vendas - $1
       WHERE data_caixa = $2`,
      [pedido[0].valor_total, pedido[0].data_venda]
    );

    const { rows: cancelada } = await client.query(
      "UPDATE pedidos SET status = 'CANCELADA' WHERE id = $1 RETURNING *",
      [req.params.id]
    );

    await client.query('COMMIT');

    await log({ usuario_id: req.usuario.id, acao: 'CANCELAMENTO_VENDA',
      tabela: 'pedidos', registro_id: pedido[0].id,
      descricao: `Venda #${pedido[0].numero_venda} cancelada`,
      dados_antes: pedido[0], dados_depois: cancelada[0], ip: req.ip });

    res.json(cancelada[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
