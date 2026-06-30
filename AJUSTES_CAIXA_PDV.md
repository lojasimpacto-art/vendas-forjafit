# AJUSTES — CAIXA E PDV
**Data:** Junho 2026

---

## AJUSTE 1 — Formato de data no histórico de caixa

**Arquivo:** `src/pages/Caixa.tsx`

A coluna DATA do histórico está exibindo o formato ISO (`2026-06-28T03:00:00.000Z`). Corrigir para exibir no formato `DD/MM/AAAA`.

Localizar onde a data é renderizada na tabela do histórico e substituir por uma função de formatação:

```tsx
// Adicionar função de formatação no início do componente:
const formatarData = (dataISO: string) => {
  const data = new Date(dataISO);
  return data.toLocaleDateString('pt-BR', { timeZone: 'America/Bahia' });
};

// Na coluna DATA da tabela, substituir:
// ERRADO:
{caixa.data_caixa}

// CORRETO:
{formatarData(caixa.data_caixa)}
```

Aplicar a mesma formatação em todos os lugares do sistema onde datas aparecem no formato ISO.

---

## AJUSTE 2 — Botão de detalhes (olho) no histórico de caixa não funciona

**Arquivo:** `src/pages/Caixa.tsx`

O botão com ícone de olho (👁) na tabela de histórico não faz nada ao clicar. Implementar a funcionalidade de ver detalhes do caixa.

### Comportamento esperado:
Ao clicar no ícone de olho, abrir um **modal de detalhes** do caixa selecionado com:
- Data do caixa (DD/MM/AAAA)
- Status (ABERTO/FECHADO)
- Saldo de abertura
- Totais por forma de pagamento (Dinheiro, Crédito, Débito, Pix)
- Total de vendas
- Diferença (se fechado)
- Lista de todas as vendas do dia: Hora | # Venda | Operador | Forma Pagamento | Valor | Status

### Implementação:

```tsx
// Estado para controlar o modal de detalhes
const [caixaDetalhe, setCaixaDetalhe] = useState<any>(null);
const [modalDetalhe, setModalDetalhe] = useState(false);
const [vendasDetalhe, setVendasDetalhe] = useState<any[]>([]);
const [loadingDetalhe, setLoadingDetalhe] = useState(false);

// Função chamada ao clicar no olho
const verDetalhesCaixa = async (caixa: any) => {
  setCaixaDetalhe(caixa);
  setModalDetalhe(true);
  setLoadingDetalhe(true);
  try {
    const res = await api.get(`/caixa/${caixa.id}`);
    setVendasDetalhe(res.data.vendas || []);
  } catch {
    setVendasDetalhe([]);
  } finally {
    setLoadingDetalhe(false);
  }
};

// Modal de detalhes no JSX:
<Dialog open={modalDetalhe} onOpenChange={setModalDetalhe}>
  <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Detalhes do Caixa — {caixaDetalhe && formatarData(caixaDetalhe.data_caixa)}</DialogTitle>
    </DialogHeader>
    {caixaDetalhe && (
      <div className="space-y-4">
        {/* Cards de totais */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Total Vendas</p>
            <p className="text-lg font-bold text-green-700">{formatarMoeda(caixaDetalhe.total_vendas)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Dinheiro</p>
            <p className="text-lg font-bold">{formatarMoeda(caixaDetalhe.total_dinheiro)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">PIX</p>
            <p className="text-lg font-bold">{formatarMoeda(caixaDetalhe.total_pix)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Crédito</p>
            <p className="text-lg font-bold">{formatarMoeda(caixaDetalhe.total_credito)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Débito</p>
            <p className="text-lg font-bold">{formatarMoeda(caixaDetalhe.total_debito)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Saldo Abertura</p>
            <p className="text-lg font-bold">{formatarMoeda(caixaDetalhe.saldo_abertura)}</p>
          </div>
        </div>

        {/* Lista de vendas */}
        <div>
          <h3 className="font-semibold mb-2">Vendas do Dia</h3>
          {loadingDetalhe ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">#</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Hora</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Operador</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Forma Pag.</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-muted-foreground">Valor</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {vendasDetalhe.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">Nenhuma venda encontrada</td>
                    </tr>
                  ) : (
                    vendasDetalhe.map((v: any) => (
                      <tr key={v.id} className="border-b hover:bg-muted/30">
                        <td className="px-3 py-2">#{v.numero_venda}</td>
                        <td className="px-3 py-2">{v.hora_venda?.slice(0, 5)}</td>
                        <td className="px-3 py-2">{v.usuario_nome}</td>
                        <td className="px-3 py-2">{v.forma_pagamento_nome}</td>
                        <td className="px-3 py-2 text-right font-medium text-green-700">{formatarMoeda(v.valor_total)}</td>
                        <td className="px-3 py-2">
                          <Badge variant={v.status === 'CONCLUIDA' ? 'success' : 'destructive'}>
                            {v.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )}
  </DialogContent>
</Dialog>
```

### Backend — garantir que o endpoint retorna as vendas:

Verificar se o endpoint `GET /api/caixa/:id` retorna as vendas do dia. Se não retornar, atualizar a query:

```js
// src/routes/caixa.js — GET /:id
router.get('/:id', autenticar, async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    const caixaRes = await client.query('SELECT * FROM caixa WHERE id = $1', [id]);
    if (caixaRes.rows.length === 0) return res.status(404).json({ message: 'Caixa não encontrado.' });

    const vendasRes = await client.query(`
      SELECT 
        p.id, p.numero_venda, p.hora_venda, p.valor_total, p.status,
        u.nome AS usuario_nome,
        fp.nome AS forma_pagamento_nome
      FROM pedidos p
      LEFT JOIN usuarios u ON u.id = p.usuario_id
      LEFT JOIN formas_pagamento fp ON fp.id = p.forma_pagamento_id
      WHERE p.data_venda = (SELECT data_caixa FROM caixa WHERE id = $1)
      ORDER BY p.hora_venda DESC
    `, [id]);

    res.json({ ...caixaRes.rows[0], vendas: vendasRes.rows });
  } finally {
    client.release();
  }
});
```

---

## AJUSTE 3 — Caixa de dia anterior ainda está ABERTO (sem opção de fechar)

**Problema:** O caixa do dia 28/06/2026 ficou com status ABERTO e não há como fechá-lo pelo sistema. Hoje é 30/06/2026 e ao tentar abrir novo caixa o sistema bloqueia dizendo que já existe um aberto.

### Solução — Adicionar botão de fechar caixa na aba "Caixa do Dia" E no modal de detalhes do histórico:

**Na aba "Caixa do Dia"** (`src/pages/Caixa.tsx`), quando o caixa está ABERTO, mostrar o botão de fechamento. Já deve existir, verificar se está funcionando.

**No modal de detalhes do histórico**, adicionar botão "Fechar este Caixa" quando o status for ABERTO:

```tsx
{/* Dentro do modal de detalhes, após os cards de totais: */}
{caixaDetalhe?.status === 'ABERTO' && (
  <div className="bg-orange-50 border border-orange-200 rounded-md p-3 flex items-center justify-between">
    <p className="text-sm text-orange-800">Este caixa ainda está aberto.</p>
    <Button
      variant="outline"
      size="sm"
      className="border-orange-400 text-orange-700 hover:bg-orange-100"
      onClick={() => handleFecharCaixaHistorico(caixaDetalhe.id)}
    >
      Fechar este Caixa
    </Button>
  </div>
)}
```

```tsx
// Função para fechar caixa do histórico
const handleFecharCaixaHistorico = async (caixaId: number) => {
  try {
    await api.post('/caixa/fechar', {
      caixa_id: caixaId,
      observacao: 'Fechamento via histórico — caixa de dia anterior'
    });
    setModalDetalhe(false);
    // Recarregar histórico
    carregarHistorico();
    alert('Caixa fechado com sucesso.');
  } catch (err: any) {
    alert(err.response?.data?.message || 'Erro ao fechar caixa.');
  }
};
```

### Backend — garantir que POST /api/caixa/fechar aceita `caixa_id` opcional:

Atualizar o endpoint de fechamento para aceitar um `caixa_id` específico (para fechar caixas de dias anteriores):

```js
// POST /api/caixa/fechar
router.post('/fechar', autenticar, async (req, res) => {
  const { saldo_fechamento, observacao, caixa_id } = req.body;
  const client = await pool.connect();
  try {
    let id = caixa_id;

    // Se não foi passado caixa_id, buscar o caixa aberto de hoje
    if (!id) {
      const hoje = new Date().toISOString().split('T')[0];
      const res = await client.query(
        `SELECT id FROM caixa WHERE data_caixa = $1 AND status = 'ABERTO'`,
        [hoje]
      );
      if (res.rows.length === 0) return res.status(400).json({ message: 'Nenhum caixa aberto hoje.' });
      id = res.rows[0].id;
    }

    await client.query(
      `UPDATE caixa SET 
        status = 'FECHADO',
        saldo_fechamento = $1,
        fechado_por = $2,
        fechado_em = NOW(),
        observacao = $3
       WHERE id = $4`,
      [saldo_fechamento || 0, req.usuario.id, observacao || null, id]
    );

    await registrarLog(client, req.usuario.id, 'FECHAMENTO_CAIXA', 'caixa', id,
      'Caixa fechado', null, { status: 'FECHADO' });

    res.json({ message: 'Caixa fechado com sucesso.' });
  } finally {
    client.release();
  }
});
```

### Correção imediata no banco (executar no Neon.tech):

Para resolver o problema do caixa do dia 28/06 que ficou aberto, executar este SQL no SQL Editor do Neon.tech **antes de testar**:

```sql
UPDATE pedidos SET status = 'FECHADO', fechado_em = NOW()
WHERE data_caixa = '2026-06-28' AND status = 'ABERTO';
```

---

## AJUSTE 4 — Lógica de abertura de novo caixa

**Arquivo:** `src/routes/caixa.js` (backend)

**Problema:** O sistema bloqueia a abertura de novo caixa porque existe um caixa ABERTO de dia anterior.

**Correção:** A regra deve ser: só bloquear se existir caixa ABERTO para **hoje**. Caixas de dias anteriores que ficaram abertos não devem bloquear a criação do caixa do dia atual.

Atualizar o endpoint `POST /api/caixa/abrir`:

```js
router.post('/abrir', autenticar, async (req, res) => {
  const { saldo_abertura } = req.body;
  const client = await pool.connect();
  try {
    const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bahia' }); // formato YYYY-MM-DD

    // Verificar se já existe caixa para HOJE (aberto ou fechado)
    const existente = await client.query(
      `SELECT id, status FROM caixa WHERE data_caixa = $1`,
      [hoje]
    );

    if (existente.rows.length > 0 && existente.rows[0].status === 'ABERTO') {
      return res.status(400).json({ message: 'Já existe um caixa aberto para hoje.' });
    }

    if (existente.rows.length > 0 && existente.rows[0].status === 'FECHADO') {
      return res.status(400).json({ 
        message: 'O caixa de hoje já foi fechado. Use a opção de reabertura.',
        reabrir: true  // flag para o frontend saber que deve mostrar modal de reabrir
      });
    }

    // Fechar automaticamente qualquer caixa ABERTO de dias anteriores
    await client.query(
      `UPDATE caixa SET status = 'FECHADO', fechado_em = NOW(), observacao = 'Fechamento automático — novo dia'
       WHERE status = 'ABERTO' AND data_caixa < $1`,
      [hoje]
    );

    // Criar novo caixa
    const novo = await client.query(
      `INSERT INTO caixa (data_caixa, saldo_abertura, status, aberto_por, aberto_em)
       VALUES ($1, $2, 'ABERTO', $3, NOW())
       RETURNING *`,
      [hoje, saldo_abertura || 0, req.usuario.id]
    );

    await registrarLog(client, req.usuario.id, 'ABERTURA_CAIXA', 'caixa', novo.rows[0].id,
      `Caixa aberto com saldo de R$ ${saldo_abertura || 0}`, null, novo.rows[0]);

    res.json(novo.rows[0]);
  } finally {
    client.release();
  }
});
```

---

## AJUSTE 5 — Layout do PDV cortando informações

**Arquivo:** `src/pages/Vendas.tsx`

O PDV está com largura excessiva, cortando partes da tela. Ajustar o layout para caber corretamente em qualquer resolução.

### Correção no container principal do PDV:

```tsx
// Estrutura principal do PDV — ajustar classes:
<div className="flex flex-col h-screen overflow-hidden bg-gray-50">

  {/* Header do PDV — altura fixa */}
  <div className="bg-gray-900 text-white px-4 py-2 flex items-center justify-between flex-shrink-0">
    ...
  </div>

  {/* Corpo — flex com overflow controlado */}
  <div className="flex flex-1 overflow-hidden min-h-0">

    {/* Lado esquerdo — lista de produtos com scroll */}
    <div className="flex-1 overflow-y-auto p-4 border-r border-gray-200 bg-white min-w-0">
      ...
    </div>

    {/* Lado direito — carrinho, largura fixa */}
    <div className="w-80 flex-shrink-0 flex flex-col bg-white border-l border-gray-200 overflow-hidden">
      ...
    </div>

  </div>
</div>
```

**Pontos críticos a verificar:**
- O container raiz deve ter `h-screen overflow-hidden` — sem isso a página cresce além da tela
- O lado esquerdo deve ter `min-w-0` para não forçar expansão horizontal
- O lado direito deve ter `flex-shrink-0` e largura fixa (`w-80` = 320px)
- Remover qualquer `min-width` fixo em pixels que possa estar causando overflow horizontal
- O header do PDV deve ter `flex-shrink-0` para não ser comprimido

**Verificar também no `App.tsx` ou `AppLayout.tsx`:**
A rota do PDV (`/vendas`) deve renderizar **fora** do AppLayout (sem sidebar), pois o PDV tem seu próprio header fullscreen. Se estiver renderizando dentro do AppLayout (com sidebar + header), mover para rota separada:

```tsx
// App.tsx — a rota /vendas deve estar FORA do AppLayout:
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/vendas" element={<ProtectedRoute><Vendas /></ProtectedRoute>} /> {/* SEM AppLayout */}
  <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
    <Route path="/" element={<Dashboard />} />
    <Route path="/produtos" element={<Produtos />} />
    {/* demais rotas dentro do layout */}
  </Route>
</Routes>
```

---

## RESUMO DOS AJUSTES

| # | Problema | Arquivo(s) |
|---|----------|------------|
| 1 | Data em formato ISO no histórico | `Caixa.tsx` |
| 2 | Botão olho sem funcionalidade | `Caixa.tsx` + `routes/caixa.js` |
| 3 | Sem opção de fechar caixa de dia anterior | `Caixa.tsx` + `routes/caixa.js` |
| 4 | Abertura de novo caixa bloqueada por caixa antigo | `routes/caixa.js` |
| 5 | PDV cortando conteúdo horizontalmente | `Vendas.tsx` + `App.tsx` |

**Antes de testar, executar no SQL Editor do Neon.tech:**
```sql
UPDATE caixa SET status = 'FECHADO', fechado_em = NOW(), observacao = 'Fechamento manual via SQL'
WHERE status = 'ABERTO' AND data_caixa < CURRENT_DATE;
```

---

*Após os ajustes, testar na seguinte ordem: 1) Abrir novo caixa, 2) Realizar uma venda, 3) Ver detalhes no histórico, 4) Fechar o caixa.*
