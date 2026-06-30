# CORREÇÃO — FLUXO DE ABERTURA DE CAIXA NO PDV
**Arquivo principal:** `src/pages/Vendas.tsx`  
**Arquivos secundários:** `src/pages/Caixa.tsx`, backend rotas de caixa  
**Data:** Junho 2026

---

## COMPORTAMENTO ATUAL (errado)
Ao acessar o PDV com caixa fechado, o sistema exibe uma mensagem e redireciona para a tela de Caixa, que não tem opção de abrir o caixa.

## COMPORTAMENTO ESPERADO

### Cenário 1 — Caixa nunca foi aberto hoje (primeiro acesso do dia)
1. Usuário clica em **Vendas (PDV)**
2. Sistema verifica via API se existe caixa aberto para hoje
3. Se não existe → abre automaticamente um **modal de abertura de caixa** dentro do PDV
4. Modal pede apenas o **saldo de abertura** (campo numérico, aceita zero)
5. Usuário informa o saldo e clica em **"Abrir Caixa e Iniciar Vendas"**
6. Sistema chama a API para abrir o caixa e libera o PDV normalmente

### Cenário 2 — Caixa do dia já foi fechado e precisa reabrir
1. Usuário clica em **Vendas (PDV)**
2. Sistema verifica que já existe um caixa para hoje com `status = 'FECHADO'`
3. Abre um **modal de reabertura de caixa** com aviso: *"O caixa de hoje já foi fechado. Para reabrir é necessário autorização."*
4. Modal pede a **senha de um usuário com permissão** de reabrir caixa
5. Sistema valida a senha via API (`POST /api/auth/validar-senha` ou endpoint similar)
6. Se senha válida e usuário tem permissão → reabre o caixa (`status = 'ABERTO'`) e libera o PDV
7. Se senha inválida → exibe erro no próprio modal sem fechar

---

## IMPLEMENTAÇÃO

### 1. Lógica no frontend — `src/pages/Vendas.tsx`

No `useEffect` inicial do PDV, ao carregar a página, verificar o status do caixa:

```tsx
useEffect(() => {
  verificarCaixa();
}, []);

const verificarCaixa = async () => {
  try {
    const res = await api.get('/caixa/hoje');
    const caixa = res.data;

    if (!caixa) {
      // Cenário 1: nenhum caixa hoje — modal de abertura inicial
      setModalCaixa('abertura');
    } else if (caixa.status === 'FECHADO') {
      // Cenário 2: caixa fechado — modal de reabertura com senha
      setCaixaIdHoje(caixa.id);
      setModalCaixa('reabrir');
    } else {
      // Caixa aberto normalmente — liberar PDV
      setCaixaAberto(true);
      setCaixaIdHoje(caixa.id);
    }
  } catch (err) {
    setModalCaixa('abertura');
  }
};
```

### 2. Estados necessários no PDV

```tsx
const [modalCaixa, setModalCaixa] = useState<'abertura' | 'reabrir' | null>(null);
const [saldoAbertura, setSaldoAbertura] = useState<number>(0);
const [senhaReabertura, setSenhaReabertura] = useState('');
const [erroCaixa, setErroCaixa] = useState('');
const [caixaAberto, setCaixaAberto] = useState(false);
const [caixaIdHoje, setCaixaIdHoje] = useState<number | null>(null);
const [loadingCaixa, setLoadingCaixa] = useState(false);
```

### 3. Função de abrir caixa (Cenário 1)

```tsx
const handleAbrirCaixa = async () => {
  setLoadingCaixa(true);
  setErroCaixa('');
  try {
    await api.post('/caixa/abrir', { saldo_abertura: saldoAbertura });
    setModalCaixa(null);
    setCaixaAberto(true);
    await verificarCaixa();
  } catch (err: any) {
    setErroCaixa(err.response?.data?.message || 'Erro ao abrir caixa.');
  } finally {
    setLoadingCaixa(false);
  }
};
```

### 4. Função de reabrir caixa com senha (Cenário 2)

```tsx
const handleReabrirCaixa = async () => {
  if (!senhaReabertura.trim()) {
    setErroCaixa('Informe a senha de autorização.');
    return;
  }
  setLoadingCaixa(true);
  setErroCaixa('');
  try {
    // Valida senha e permissão, e reabre o caixa
    await api.post('/caixa/reabrir', {
      caixa_id: caixaIdHoje,
      senha: senhaReabertura,
    });
    setModalCaixa(null);
    setCaixaAberto(true);
    setSenhaReabertura('');
  } catch (err: any) {
    setErroCaixa(err.response?.data?.message || 'Senha inválida ou sem permissão.');
  } finally {
    setLoadingCaixa(false);
  }
};
```

### 5. Modais no JSX do PDV

Adicionar os dois modais dentro do JSX do PDV, **antes** do conteúdo principal:

```tsx
{/* Modal Cenário 1 — Abertura inicial do caixa */}
<Dialog open={modalCaixa === 'abertura'} onOpenChange={() => {}}>
  <DialogContent className="max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <Wallet className="h-5 w-5 text-green-600" />
        Abrir Caixa
      </DialogTitle>
    </DialogHeader>
    <div className="space-y-4 py-2">
      <p className="text-sm text-muted-foreground">
        Nenhum caixa aberto para hoje. Informe o saldo inicial para começar as vendas.
      </p>
      <div className="space-y-2">
        <Label htmlFor="saldo_abertura">Saldo de Abertura (R$)</Label>
        <Input
          id="saldo_abertura"
          type="number"
          min="0"
          step="0.01"
          placeholder="0,00"
          value={saldoAbertura}
          onChange={(e) => setSaldoAbertura(Number(e.target.value))}
          autoFocus
        />
        <p className="text-xs text-muted-foreground">
          Informe o valor em dinheiro presente no caixa agora. Pode ser zero.
        </p>
      </div>
      {erroCaixa && (
        <p className="text-sm text-destructive">{erroCaixa}</p>
      )}
    </div>
    <DialogFooter>
      <Button
        className="w-full bg-green-600 hover:bg-green-700"
        onClick={handleAbrirCaixa}
        disabled={loadingCaixa}
      >
        {loadingCaixa ? 'Abrindo...' : 'Abrir Caixa e Iniciar Vendas'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

{/* Modal Cenário 2 — Reabrir caixa já fechado */}
<Dialog open={modalCaixa === 'reabrir'} onOpenChange={() => {}}>
  <DialogContent className="max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <Lock className="h-5 w-5 text-orange-500" />
        Reabrir Caixa
      </DialogTitle>
    </DialogHeader>
    <div className="space-y-4 py-2">
      <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
        <p className="text-sm text-orange-800">
          O caixa de hoje já foi fechado. Para reabrir é necessária a senha de um usuário com permissão.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="senha_reab">Senha de Autorização</Label>
        <Input
          id="senha_reab"
          type="password"
          placeholder="••••••••"
          value={senhaReabertura}
          onChange={(e) => setSenhaReabertura(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleReabrirCaixa(); }}
          autoFocus
        />
      </div>
      {erroCaixa && (
        <p className="text-sm text-destructive">{erroCaixa}</p>
      )}
    </div>
    <DialogFooter>
      <Button
        className="w-full"
        onClick={handleReabrirCaixa}
        disabled={loadingCaixa}
      >
        {loadingCaixa ? 'Verificando...' : 'Autorizar Reabertura'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

> **Importante:** Adicionar `Lock` nos imports do `lucide-react`:
> ```tsx
> import { ..., Wallet, Lock } from 'lucide-react';
> ```

> **Importante:** O modal não pode ser fechado clicando fora (`onInteractOutside` bloqueado e `onOpenChange` vazio), pois o PDV não deve funcionar sem caixa aberto.

---

### 6. Bloquear o PDV enquanto caixa não está aberto

No JSX principal do PDV, renderizar o conteúdo de vendas **somente** quando `caixaAberto === true`:

```tsx
// Se caixa ainda não foi confirmado como aberto, mostrar tela de carregamento
if (!caixaAberto && modalCaixa === null) {
  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-muted-foreground text-sm">Verificando caixa...</p>
    </div>
  );
}
```

---

### 7. Novo endpoint no backend — `POST /api/caixa/reabrir`

Criar a rota no backend `src/routes/caixa.js`:

```js
// POST /api/caixa/reabrir
// Valida a senha do usuário, verifica permissão e reabre o caixa
router.post('/reabrir', autenticar, async (req, res) => {
  const { caixa_id, senha } = req.body;
  const client = await pool.connect();

  try {
    // 1. Buscar qualquer usuário ativo pelo login (usa o usuário logado ou verifica senha de admin)
    // Valida a senha recebida contra TODOS os usuários com permissão de reabrir caixa
    const usuarios = await client.query(
      `SELECT u.id, u.senha_hash 
       FROM usuarios u
       JOIN permissoes p ON p.usuario_id = u.id
       WHERE u.ativo = true 
         AND p.recurso = 'caixa' 
         AND p.pode_editar = true`
    );

    let autorizado = false;
    for (const usuario of usuarios.rows) {
      const valido = await bcrypt.compare(senha, usuario.senha_hash);
      if (valido) {
        autorizado = true;
        break;
      }
    }

    if (!autorizado) {
      return res.status(403).json({ message: 'Senha inválida ou usuário sem permissão para reabrir o caixa.' });
    }

    // 2. Reabrir o caixa
    await client.query(
      `UPDATE caixa SET status = 'ABERTO', fechado_por = NULL, fechado_em = NULL 
       WHERE id = $1`,
      [caixa_id]
    );

    // 3. Log
    await registrarLog(client, req.usuario.id, 'REABERTURA_CAIXA', 'caixa', caixa_id,
      'Caixa reaberto após fechamento', null, { status: 'ABERTO' });

    res.json({ message: 'Caixa reaberto com sucesso.' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao reabrir caixa.' });
  } finally {
    client.release();
  }
});
```

> **Lembrar de importar `bcrypt`** no arquivo de rotas do caixa se ainda não estiver importado:
> ```js
> const bcrypt = require('bcrypt');
> ```

---

### 8. Remover o redirecionamento atual

No arquivo `src/pages/Vendas.tsx`, localizar e **remover** qualquer código que redireciona para `/caixa` quando o caixa está fechado. Substituir por `setModalCaixa('abertura')` ou `setModalCaixa('reabrir')` conforme o cenário.

---

### 9. Permissão para reabrir caixa

Na tabela `permissoes`, a verificação de quem pode reabrir o caixa usa `recurso = 'caixa'` e `pode_editar = true`. O usuário **admin** já tem essa permissão pois foi criado com todas as permissões ativas.

---

## RESUMO DO FLUXO FINAL

```
Usuário acessa PDV
        ↓
   Verifica caixa hoje
        ↓
   ┌────────────────────────────────────┐
   │ Nenhum caixa hoje                 │ → Modal abertura → informa saldo → Abrir Caixa
   │ Caixa hoje com status = FECHADO   │ → Modal reabrir → informa senha → Autorizar
   │ Caixa hoje com status = ABERTO    │ → PDV liberado normalmente
   └────────────────────────────────────┘
```

---

*Após implementar, testar os dois cenários: abrir o caixa pela primeira vez no dia e tentar reabrir após fechar.*
