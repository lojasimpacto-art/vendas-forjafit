# AJUSTES — TELA DE VENDAS (PDV)
**Arquivo principal:** `src/pages/Vendas.tsx`  
**Data:** Junho 2026

---

## PROBLEMA 1 — PDV com largura excessiva (barra de rolagem horizontal)

A tela do PDV está mais larga que a janela do navegador, forçando scroll horizontal e cortando o lado direito (carrinho, total, botão finalizar).

### Causa provável
O container raiz do PDV não está limitado à largura da viewport, ou algum elemento interno tem largura maior que 100vw.

### Correção

O container raiz do PDV deve ser:

```tsx
<div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-50">
```

O corpo (área de produtos + carrinho) deve ser:

```tsx
<div className="flex flex-1 overflow-hidden min-h-0 w-full">
```

A área de busca/produtos (lado esquerdo):

```tsx
<div className="flex-1 overflow-y-auto overflow-x-hidden p-4 border-r border-gray-200 bg-white min-w-0">
```

O carrinho (lado direito) — largura fixa que não expande:

```tsx
<div className="w-72 flex-shrink-0 flex flex-col bg-white border-l border-gray-200 overflow-hidden">
```

**Regra geral:** Nenhum elemento dentro do PDV pode ter `min-width` fixo em pixels maior que a tela, `width` maior que `100%`, ou estar fora do fluxo normal sem `overflow-hidden` no pai.

---

## PROBLEMA 2 — Campo de busca só funciona se o usuário souber o nome do produto

Atualmente o campo de busca exibe "Digite o nome do produto para buscar" e só mostra resultados após digitar. Se o operador não souber o nome exato, não consegue encontrar o produto.

### Solução

Adicionar um botão **"Ver todos os produtos"** ao lado do campo de busca. Ao clicar, exibe todos os produtos ativos em ordem alfabética, sem precisar digitar nada. A busca por texto continua funcionando normalmente.

### Comportamento esperado

```
[ 🔍 Buscar produto pelo nome...        ] [ 📋 Ver Todos ]

— Se campo vazio e nenhum botão clicado → mostra mensagem "Digite ou clique em Ver Todos"
— Se campo vazio e clicou "Ver Todos"   → lista TODOS os produtos em ordem alfabética
— Se digitou algo no campo              → filtra os produtos pelo texto digitado (comportamento atual)
— Se limpou o campo após "Ver Todos"   → volta a mostrar todos os produtos
```

### Implementação no `src/pages/Vendas.tsx`

**Estados a adicionar:**
```tsx
const [mostrarTodos, setMostrarTodos] = useState(false);
const [todosProdutos, setTodosProdutos] = useState<any[]>([]);
const [loadingTodos, setLoadingTodos] = useState(false);
```

**Função para carregar todos os produtos:**
```tsx
const carregarTodosProdutos = async () => {
  if (todosProdutos.length > 0) {
    // Já carregou antes — só exibir
    setMostrarTodos(true);
    return;
  }
  setLoadingTodos(true);
  try {
    const res = await api.get('/produtos?ativo=true&ordem=descricao&limit=500');
    setTodosProdutos(res.data.produtos || res.data);
    setMostrarTodos(true);
  } catch {
    alert('Erro ao carregar produtos.');
  } finally {
    setLoadingTodos(false);
  }
};
```

**Lógica de qual lista exibir:**
```tsx
// Produtos a exibir no painel esquerdo:
const produtosExibidos = busca.trim().length > 0
  ? resultadosBusca          // digitou algo → resultado da busca atual
  : mostrarTodos
    ? todosProdutos           // clicou "Ver Todos" → lista completa alfabética
    : [];                     // nenhuma ação → lista vazia (estado inicial)
```

**Quando o usuário começar a digitar, ocultar a lista geral:**
```tsx
const handleBuscaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const valor = e.target.value;
  setBusca(valor);
  if (valor.trim().length > 0) {
    setMostrarTodos(false); // digitando → desativa "ver todos"
  }
};
```

**JSX do cabeçalho da área de busca:**
```tsx
{/* Barra de busca + botão ver todos */}
<div className="flex gap-2 mb-4 flex-shrink-0">
  <div className="relative flex-1">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      className="pl-9"
      placeholder="Buscar produto pelo nome..."
      value={busca}
      onChange={handleBuscaChange}
      autoFocus
    />
  </div>
  <Button
    variant="outline"
    onClick={carregarTodosProdutos}
    disabled={loadingTodos}
    className="flex items-center gap-2 flex-shrink-0"
  >
    <List className="h-4 w-4" />
    {loadingTodos ? 'Carregando...' : 'Ver Todos'}
  </Button>
</div>

{/* Lista de produtos */}
<div className="flex-1 overflow-y-auto space-y-2">
  {produtosExibidos.length === 0 && (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <Search className="h-10 w-10 mb-3 opacity-30" />
      <p className="text-sm">Digite o nome do produto ou clique em <strong>Ver Todos</strong></p>
    </div>
  )}
  {produtosExibidos.map((produto: any) => (
    <div
      key={produto.id}
      className="flex gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors"
      onClick={() => selecionarProduto(produto)}
    >
      {produto.foto_url ? (
        <img src={produto.foto_url} className="w-14 h-14 object-cover rounded-md flex-shrink-0" alt={produto.descricao} />
      ) : (
        <div className="w-14 h-14 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
          <Package className="h-6 w-6 text-gray-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{produto.descricao}</p>
        <p className="text-green-700 font-bold text-sm">{formatarMoeda(produto.preco_venda)}</p>
        <p className="text-xs text-muted-foreground">
          Estoque: <span className={produto.qtde_estoque <= produto.qtde_minima_estoque ? 'text-red-600 font-medium' : ''}>
            {produto.qtde_estoque} un
          </span>
        </p>
      </div>
    </div>
  ))}
</div>
```

**Adicionar `List` e `Package` nos imports do lucide-react:**
```tsx
import { ..., List, Package } from 'lucide-react';
```

### Backend — garantir que GET /api/produtos aceita parâmetro de ordenação

Verificar se o endpoint `GET /api/produtos` aceita `?ordem=descricao` e retorna ordenado alfabeticamente. Se não aceitar, ajustar a query:

```js
// src/routes/produtos.js — GET /
router.get('/', autenticar, async (req, res) => {
  const { busca, ativo, ordem, limit } = req.query;
  const client = await pool.connect();
  try {
    let query = `
      SELECT id, descricao, preco_venda, preco_custo, qtde_estoque, qtde_minima_estoque, foto_url, ativo
      FROM produtos
      WHERE 1=1
    `;
    const params = [];

    if (ativo === 'true') {
      params.push(true);
      query += ` AND ativo = $${params.length}`;
    }

    if (busca) {
      params.push(`%${busca}%`);
      query += ` AND descricao ILIKE $${params.length}`;
    }

    // Ordenação
    if (ordem === 'descricao') {
      query += ' ORDER BY descricao ASC';
    } else {
      query += ' ORDER BY descricao ASC'; // padrão também alfabético
    }

    if (limit) {
      params.push(parseInt(limit));
      query += ` LIMIT $${params.length}`;
    }

    const resultado = await client.query(query, params);
    res.json(resultado.rows);
  } finally {
    client.release();
  }
});
```

---

## RESUMO

| # | Problema | Solução |
|---|----------|---------|
| 1 | PDV mais largo que a tela | `w-screen overflow-hidden` no container raiz + `min-w-0` nos filhos |
| 2 | Busca só funciona digitando | Botão "Ver Todos" que carrega lista alfabética completa |

---

*Após os ajustes, o PDV deve caber perfeitamente na tela sem scroll horizontal, e o operador pode tanto digitar para buscar quanto clicar em "Ver Todos" para navegar pelo catálogo completo.*
