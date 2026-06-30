import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Minus, Plus, X, AlertTriangle, Printer, CheckCircle, Wallet, Lock, List, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { fmt } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';

interface ItemCarrinho {
  produto_id: number;
  descricao: string;
  preco_unitario: number;
  quantidade: number;
  subtotal: number;
  qtde_estoque: number;
}

export default function Vendas() {
  const { usuario } = useAuth();
  const navigate = useNavigate();

  // Estados do caixa
  const [caixaAberto, setCaixaAberto] = useState(false);
  const [caixaIdHoje, setCaixaIdHoje] = useState<number | null>(null);
  const [modalCaixa, setModalCaixa] = useState<'abertura' | 'reabrir' | null>(null);
  const [saldoAbertura, setSaldoAbertura] = useState<number>(0);
  const [senhaReabertura, setSenhaReabertura] = useState('');
  const [erroCaixa, setErroCaixa] = useState('');
  const [loadingCaixa, setLoadingCaixa] = useState(false);

  // Estados do PDV
  const [produtos, setProdutos] = useState<any[]>([]);
  const [busca, setBusca] = useState('');
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [todosProdutos, setTodosProdutos] = useState<any[]>([]);
  const [loadingTodos, setLoadingTodos] = useState(false);
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [formasPag, setFormasPag] = useState<any[]>([]);
  const [formaPagId, setFormaPagId] = useState('');
  const [valorRecebido, setValorRecebido] = useState('');
  const [modalQtde, setModalQtde] = useState<any>(null);
  const [qtdeInput, setQtdeInput] = useState<number>(1);
  const [modalConfirm, setModalConfirm] = useState(false);
  const [modalRecibo, setModalRecibo] = useState<any>(null);
  const [erro, setErro] = useState('');
  const [finalizando, setFinalizando] = useState(false);
  const buscaRef = useRef<HTMLInputElement>(null);

  const verificarCaixa = async () => {
    try {
      const { data } = await api.get('/caixa/status');
      if (!data) {
        setModalCaixa('abertura');
      } else if (data.status === 'FECHADO') {
        setCaixaIdHoje(data.id);
        setModalCaixa('reabrir');
      } else {
        setCaixaAberto(true);
        setCaixaIdHoje(data.id);
      }
    } catch {
      setModalCaixa('abertura');
    }
  };

  useEffect(() => {
    verificarCaixa();
    api.get('/formas-pagamento').then(r => setFormasPag(r.data));
  }, []);

  useEffect(() => {
    if (!busca.trim()) { setProdutos([]); return; }
    const t = setTimeout(() => {
      api.get(`/produtos?busca=${encodeURIComponent(busca)}&ativo=true`).then(r => setProdutos(r.data));
    }, 300);
    return () => clearTimeout(t);
  }, [busca]);

  const handleAbrirCaixa = async () => {
    setLoadingCaixa(true); setErroCaixa('');
    try {
      await api.post('/caixa/abrir', { saldo_abertura: saldoAbertura });
      setModalCaixa(null);
      setSaldoAbertura(0);
      await verificarCaixa();
    } catch (err: any) {
      setErroCaixa(err.response?.data?.error || err.response?.data?.message || 'Erro ao abrir caixa.');
    } finally { setLoadingCaixa(false); }
  };

  const handleReabrirCaixa = async () => {
    if (!senhaReabertura.trim()) { setErroCaixa('Informe a senha de autorização.'); return; }
    setLoadingCaixa(true); setErroCaixa('');
    try {
      await api.post('/caixa/reabrir', { caixa_id: caixaIdHoje, senha: senhaReabertura });
      setModalCaixa(null);
      setSenhaReabertura('');
      setCaixaAberto(true);
    } catch (err: any) {
      setErroCaixa(err.response?.data?.message || err.response?.data?.error || 'Senha inválida ou sem permissão.');
    } finally { setLoadingCaixa(false); }
  };

  const carregarTodosProdutos = async () => {
    if (todosProdutos.length > 0) { setMostrarTodos(true); return; }
    setLoadingTodos(true);
    try {
      const { data } = await api.get('/produtos?ativo=true');
      setTodosProdutos(data);
      setMostrarTodos(true);
    } catch { alert('Erro ao carregar produtos.'); }
    finally { setLoadingTodos(false); }
  };

  const handleBuscaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setBusca(valor);
    if (valor.trim().length > 0) setMostrarTodos(false);
  };

  const produtosExibidos = busca.trim().length > 0
    ? produtos
    : mostrarTodos
      ? todosProdutos
      : [];

  const adicionarAoCarrinho = (produto: any, quantidade: number) => {
    const qtde = quantidade || 1;
    setCarrinho(prev => {
      const idx = prev.findIndex(i => i.produto_id === produto.id);
      if (idx >= 0) {
        const novo = [...prev];
        novo[idx].quantidade += qtde;
        novo[idx].subtotal = novo[idx].quantidade * parseFloat(produto.preco_venda);
        return novo;
      }
      return [...prev, {
        produto_id: produto.id,
        descricao: produto.descricao,
        preco_unitario: parseFloat(produto.preco_venda),
        quantidade: qtde,
        subtotal: qtde * parseFloat(produto.preco_venda),
        qtde_estoque: produto.qtde_estoque
      }];
    });
    setBusca(''); setProdutos([]); setModalQtde(null);
    buscaRef.current?.focus();
  };

  const removerItem = (idx: number) => setCarrinho(prev => prev.filter((_, i) => i !== idx));

  const alterarQtde = (idx: number, qtde: number) => {
    if (qtde < 1) return;
    setCarrinho(prev => {
      const novo = [...prev];
      novo[idx].quantidade = qtde;
      novo[idx].subtotal = qtde * novo[idx].preco_unitario;
      return novo;
    });
  };

  const total = carrinho.reduce((s, i) => s + i.subtotal, 0);
  const formaPagSelecionada = formasPag.find(f => f.id === parseInt(formaPagId));
  const troco = formaPagSelecionada?.nome === 'DINHEIRO' ? Math.max(0, parseFloat(valorRecebido || '0') - total) : 0;

  const finalizar = async () => {
    setFinalizando(true); setErro('');
    try {
      const { data } = await api.post('/pedidos', {
        itens: carrinho.map(i => ({ produto_id: i.produto_id, quantidade: i.quantidade })),
        forma_pagamento_id: parseInt(formaPagId),
        valor_recebido: formaPagSelecionada?.nome === 'DINHEIRO' ? parseFloat(valorRecebido) : total
      });
      setModalRecibo({ ...data, itens: carrinho, forma_pag: formaPagSelecionada?.nome, troco });
      setCarrinho([]); setFormaPagId(''); setValorRecebido(''); setModalConfirm(false);
    } catch (err: any) {
      setErro(err.response?.data?.error || 'Erro ao finalizar venda');
      setModalConfirm(false);
    } finally { setFinalizando(false); }
  };

  // Tela de verificação de caixa (loading inicial)
  if (!caixaAberto && modalCaixa === null) {
    return (
      <div className="flex flex-col h-screen bg-gray-900 items-center justify-center gap-3">
        <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Verificando caixa...</p>

        {/* Modais de caixa — renderizados aqui para o cenário de carregamento */}
        <ModalAbrirCaixa
          open={modalCaixa === 'abertura'}
          saldo={saldoAbertura} onSaldo={setSaldoAbertura}
          erro={erroCaixa} loading={loadingCaixa}
          onConfirm={handleAbrirCaixa}
          onBack={() => navigate('/')}
        />
        <ModalReabrirCaixa
          open={modalCaixa === 'reabrir'}
          senha={senhaReabertura} onSenha={setSenhaReabertura}
          erro={erroCaixa} loading={loadingCaixa}
          onConfirm={handleReabrirCaixa}
          onBack={() => navigate('/')}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-50 -m-6">
      {/* Modais de caixa — também acessíveis enquanto PDV está ativo */}
      <ModalAbrirCaixa
        open={modalCaixa === 'abertura'}
        saldo={saldoAbertura} onSaldo={setSaldoAbertura}
        erro={erroCaixa} loading={loadingCaixa}
        onConfirm={handleAbrirCaixa}
        onBack={() => navigate('/')}
      />
      <ModalReabrirCaixa
        open={modalCaixa === 'reabrir'}
        senha={senhaReabertura} onSenha={setSenhaReabertura}
        erro={erroCaixa} loading={loadingCaixa}
        onConfirm={handleReabrirCaixa}
        onBack={() => navigate('/')}
      />

      {/* Header PDV */}
      <div className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between shadow-md flex-shrink-0">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-5 w-5 text-green-400" />
          <span className="font-bold">PDV — Vendas</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-300">
          <span>Operador: <strong className="text-white">{usuario?.nome}</strong></span>
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-gray-300 hover:text-white hover:bg-gray-700">
            <X className="h-4 w-4 mr-1" />Fechar PDV
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0 w-full">
        {/* Esquerda — busca de produtos */}
        <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden p-4 border-r border-gray-200 bg-white min-w-0">

          {/* Barra de busca + botão Ver Todos */}
          <div className="flex gap-2 mb-4 flex-shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={buscaRef}
                className="pl-9"
                placeholder="Buscar produto pelo nome..."
                value={busca}
                onChange={handleBuscaChange}
                autoFocus
              />
            </div>
            <Button variant="outline" onClick={carregarTodosProdutos} disabled={loadingTodos} className="flex-shrink-0">
              <List className="h-4 w-4" />
              {loadingTodos ? 'Carregando...' : 'Ver Todos'}
            </Button>
          </div>

          {/* Lista de produtos */}
          <div className="space-y-2">
            {produtosExibidos.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Search className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm text-center">
                  Digite o nome do produto ou clique em <strong>Ver Todos</strong>
                </p>
              </div>
            )}

            {busca.trim().length > 0 && produtos.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">Nenhum produto encontrado para "{busca}"</p>
            )}

            {produtosExibidos.map(p => (
              <div
                key={p.id}
                className={`flex gap-3 p-3 rounded-lg border transition-all cursor-pointer ${p.qtde_estoque <= 0 ? 'opacity-50 cursor-not-allowed border-gray-100' : 'border-gray-200 hover:border-green-500 hover:bg-green-50'}`}
                onClick={() => {
                  if (p.qtde_estoque <= 0) return;
                  setModalQtde(p); setQtdeInput(1);
                }}
              >
                {p.foto_url
                  ? <img src={p.foto_url} alt="" className="w-14 h-14 object-cover rounded-md flex-shrink-0" />
                  : <div className="w-14 h-14 bg-gray-100 rounded-md flex-shrink-0 flex items-center justify-center">
                      <Package className="h-6 w-6 text-gray-400" />
                    </div>}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{p.descricao}</p>
                  <p className="text-green-700 font-bold text-sm">{fmt(p.preco_venda)}</p>
                  <p className={`text-xs ${p.qtde_estoque <= 0 ? 'text-red-500 font-semibold' : 'text-muted-foreground'}`}>
                    Estoque: {p.qtde_estoque} un {p.qtde_estoque <= 0 ? '— SEM ESTOQUE' : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Direita — carrinho */}
        <div className="w-72 flex-shrink-0 flex flex-col bg-white border-l border-gray-200 overflow-hidden p-4">
          <h3 className="font-bold text-base mb-3 pb-3 border-b flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Itens da Venda
            {carrinho.length > 0 && <Badge variant="info" className="ml-auto">{carrinho.length}</Badge>}
          </h3>

          <div className="flex-1 overflow-y-auto space-y-2 mb-4">
            {carrinho.length === 0 ? (
              <div className="text-center text-muted-foreground py-12 text-sm">Nenhum produto adicionado</div>
            ) : carrinho.map((item, idx) => (
              <div key={idx} className="p-2.5 rounded-lg border border-gray-100 bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-medium leading-tight flex-1 mr-2">{item.descricao}</p>
                  <button onClick={() => removerItem(idx)} className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center border rounded-md bg-white">
                    <button className="px-2 py-1 hover:bg-gray-100 rounded-l-md" onClick={() => alterarQtde(idx, item.quantidade - 1)}>
                      <Minus className="h-3 w-3" />
                    </button>
                    <input
                      type="number" min="1" value={item.quantidade}
                      onChange={e => alterarQtde(idx, parseInt(e.target.value) || 1)}
                      className="w-10 text-center text-sm border-x py-1 focus:outline-none"
                    />
                    <button className="px-2 py-1 hover:bg-gray-100 rounded-r-md" onClick={() => alterarQtde(idx, item.quantidade + 1)}>
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="text-xs text-muted-foreground">× {fmt(item.preco_unitario)}</span>
                  <span className="ml-auto font-bold text-sm text-green-700">{fmt(item.subtotal)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-3 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">TOTAL</span>
              <span className="text-2xl font-extrabold text-green-700">{fmt(total)}</span>
            </div>

            <select
              value={formaPagId}
              onChange={e => setFormaPagId(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Selecione a forma de pagamento</option>
              {formasPag.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>

            {formaPagSelecionada?.nome === 'DINHEIRO' && (
              <div className="space-y-1">
                <Input
                  type="number" step="0.01" min={total}
                  value={valorRecebido}
                  onChange={e => setValorRecebido(e.target.value)}
                  placeholder="Valor recebido"
                />
                {valorRecebido && (
                  <div className={`text-sm font-semibold px-2 ${troco >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    Troco: {fmt(troco)}
                  </div>
                )}
              </div>
            )}

            {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-md">{erro}</div>}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setCarrinho([]); setFormaPagId(''); setValorRecebido(''); setErro(''); }}>
                Cancelar
              </Button>
              <Button
                variant="success"
                className="flex-1"
                disabled={carrinho.length === 0 || !formaPagId || finalizando}
                onClick={() => setModalConfirm(true)}
              >
                Finalizar Venda
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: quantidade */}
      <Dialog open={!!modalQtde} onOpenChange={o => !o && setModalQtde(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Adicionar ao Carrinho</DialogTitle></DialogHeader>
          {modalQtde && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-semibold">{modalQtde.descricao}</p>
                <p className="text-green-700 font-bold text-lg">{fmt(modalQtde.preco_venda)}</p>
                <p className="text-sm text-muted-foreground">Estoque disponível: {modalQtde.qtde_estoque} un</p>
              </div>
              {qtdeInput > modalQtde.qtde_estoque && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm px-3 py-2 rounded-md flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  Quantidade maior que o estoque disponível
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Quantidade</label>
                <Input
                  type="number" min="1" value={qtdeInput}
                  onChange={e => setQtdeInput(Number(e.target.value))}
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') adicionarAoCarrinho(modalQtde, qtdeInput); }}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalQtde(null)}>Cancelar</Button>
            <Button onClick={() => adicionarAoCarrinho(modalQtde, qtdeInput)}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: confirmação */}
      <Dialog open={modalConfirm} onOpenChange={setModalConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Confirmar Venda</DialogTitle></DialogHeader>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            {carrinho.map((i, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span>{i.quantidade}× {i.descricao}</span>
                <span className="font-medium">{fmt(i.subtotal)}</span>
              </div>
            ))}
            <div className="border-t pt-2 flex justify-between font-bold text-base">
              <span>Total</span><span className="text-green-700">{fmt(total)}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Pagamento: <strong className="text-foreground">{formaPagSelecionada?.nome}</strong>
              {formaPagSelecionada?.nome === 'DINHEIRO' && <span className="ml-2">| Troco: <strong>{fmt(troco)}</strong></span>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalConfirm(false)}>Voltar</Button>
            <Button variant="success" onClick={finalizar} disabled={finalizando}>
              {finalizando ? 'Processando...' : <><CheckCircle className="h-4 w-4" />Confirmar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: recibo */}
      <Dialog open={!!modalRecibo} onOpenChange={o => !o && setModalRecibo(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />Venda Realizada!
            </DialogTitle>
          </DialogHeader>
          {modalRecibo && (
            <div className="font-mono text-sm border rounded-lg p-4 bg-gray-50">
              <div className="text-center mb-3">
                <div className="font-bold text-base">PDV Forjafit</div>
                <div>Venda #{modalRecibo.numero_venda}</div>
                <div className="text-xs text-muted-foreground">{new Date().toLocaleString('pt-BR')}</div>
              </div>
              <hr className="my-2 border-dashed" />
              {modalRecibo.itens.map((i: any, idx: number) => (
                <div key={idx} className="flex justify-between py-0.5">
                  <span className="truncate max-w-[160px]">{i.quantidade}× {i.descricao}</span>
                  <span>{fmt(i.subtotal)}</span>
                </div>
              ))}
              <hr className="my-2 border-dashed" />
              <div className="flex justify-between font-bold"><span>Total</span><span>{fmt(modalRecibo.valor_total)}</span></div>
              <div className="text-xs mt-1">Pagamento: {modalRecibo.forma_pag}</div>
              {modalRecibo.forma_pag === 'DINHEIRO' && <div className="text-xs">Troco: {fmt(modalRecibo.troco)}</div>}
              <div className="text-center mt-3 text-xs text-muted-foreground">Obrigado pela preferência!</div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />Imprimir
            </Button>
            <Button onClick={() => { setModalRecibo(null); buscaRef.current?.focus(); }}>
              Nova Venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Componentes auxiliares de modal de caixa ──────────────────────────────────

interface ModalAbrirCaixaProps {
  open: boolean;
  saldo: number; onSaldo: (v: number) => void;
  erro: string; loading: boolean;
  onConfirm: () => void;
  onBack: () => void;
}

function ModalAbrirCaixa({ open, saldo, onSaldo, erro, loading, onConfirm, onBack }: ModalAbrirCaixaProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-sm" onInteractOutside={e => e.preventDefault()}>
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
              type="number" min="0" step="0.01" placeholder="0,00"
              value={saldo}
              onChange={e => onSaldo(Number(e.target.value))}
              onKeyDown={e => { if (e.key === 'Enter') onConfirm(); }}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">Informe o valor em dinheiro presente no caixa agora. Pode ser zero.</p>
          </div>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="w-full" onClick={onConfirm} disabled={loading}>
            {loading ? 'Abrindo...' : 'Abrir Caixa e Iniciar Vendas'}
          </Button>
          <Button variant="ghost" className="w-full text-muted-foreground" onClick={onBack}>
            Voltar ao Menu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ModalReabrirCaixaProps {
  open: boolean;
  senha: string; onSenha: (v: string) => void;
  erro: string; loading: boolean;
  onConfirm: () => void;
  onBack: () => void;
}

function ModalReabrirCaixa({ open, senha, onSenha, erro, loading, onConfirm, onBack }: ModalReabrirCaixaProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-sm" onInteractOutside={e => e.preventDefault()}>
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
              type="password" placeholder="••••••••"
              value={senha}
              onChange={e => onSenha(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onConfirm(); }}
              autoFocus
            />
          </div>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="w-full" onClick={onConfirm} disabled={loading}>
            {loading ? 'Verificando...' : 'Autorizar Reabertura'}
          </Button>
          <Button variant="ghost" className="w-full text-muted-foreground" onClick={onBack}>
            Voltar ao Menu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
