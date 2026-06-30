import { useEffect, useState } from 'react';
import { PackagePlus, SlidersHorizontal, Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { fmt } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';

export default function Estoque() {
  const { temPermissao } = useAuth();
  const [aba, setAba] = useState<'atual' | 'movimentacoes'>('atual');
  const [estoque, setEstoque] = useState<any[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [filtroEstoqueBaixo, setFiltroEstoqueBaixo] = useState(false);
  const [filtroMov, setFiltroMov] = useState({ produto_id: '', tipo: '', data_inicio: '', data_fim: '' });
  const [modalEntrada, setModalEntrada] = useState(false);
  const [modalAjuste, setModalAjuste] = useState(false);
  const [formEntrada, setFormEntrada] = useState({ produto_id: '', quantidade: '', preco_custo: '', observacao: '' });
  const [formAjuste, setFormAjuste] = useState({ produto_id: '', tipo: 'ENTRADA', quantidade: '', motivo: '' });
  const [buscaEntrada, setBuscaEntrada] = useState('');
  const [produtosBusca, setProdutosBusca] = useState<any[]>([]);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregarEstoque = () => api.get(`/estoque${filtroEstoqueBaixo ? '?estoque_baixo=true' : ''}`).then(r => setEstoque(r.data));
  const carregarMovimentacoes = () => {
    const p = new URLSearchParams(filtroMov as any);
    api.get(`/estoque/movimentacoes?${p}`).then(r => setMovimentacoes(r.data));
  };

  useEffect(() => { api.get('/produtos?ativo=true').then(r => setProdutos(r.data)); }, []);
  useEffect(() => { carregarEstoque(); }, [filtroEstoqueBaixo]);
  useEffect(() => { if (aba === 'movimentacoes') carregarMovimentacoes(); }, [aba, filtroMov]);

  useEffect(() => {
    if (!buscaEntrada.trim()) { setProdutosBusca([]); return; }
    const t = setTimeout(() => {
      api.get(`/produtos?busca=${encodeURIComponent(buscaEntrada)}`).then(r => setProdutosBusca(r.data));
    }, 300);
    return () => clearTimeout(t);
  }, [buscaEntrada]);

  const registrarEntrada = async (e: React.FormEvent) => {
    e.preventDefault(); setSalvando(true); setErro('');
    try {
      await api.post('/estoque/entrada', formEntrada);
      setModalEntrada(false);
      setFormEntrada({ produto_id: '', quantidade: '', preco_custo: '', observacao: '' });
      setBuscaEntrada(''); carregarEstoque();
    } catch (err: any) { setErro(err.response?.data?.error || 'Erro'); }
    finally { setSalvando(false); }
  };

  const registrarAjuste = async (e: React.FormEvent) => {
    e.preventDefault(); setSalvando(true); setErro('');
    try {
      await api.post('/estoque/ajuste', formAjuste);
      setModalAjuste(false);
      setFormAjuste({ produto_id: '', tipo: 'ENTRADA', quantidade: '', motivo: '' });
      carregarEstoque();
    } catch (err: any) { setErro(err.response?.data?.error || 'Erro'); }
    finally { setSalvando(false); }
  };

  const exportarCSV = () => {
    const cols = ['Data', 'Produto', 'Tipo', 'Qtde Ant.', 'Qtde Movida', 'Qtde Post.', 'Obs.', 'Usuário'];
    const linhas = movimentacoes.map(m => [new Date(m.created_at).toLocaleString('pt-BR'), m.produto_nome, m.tipo, m.qtde_anterior, m.quantidade, m.qtde_posterior, m.observacao || '', m.usuario_nome].join(';'));
    const blob = new Blob([cols.join(';') + '\n' + linhas.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'movimentacoes.csv'; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Controle de Estoque</h2>
          <p className="text-sm text-muted-foreground">Entradas, ajustes e movimentações</p>
        </div>
        <div className="flex gap-2">
          {temPermissao('ajuste_estoque', 'pode_criar') && (
            <Button onClick={() => { setModalEntrada(true); setErro(''); }}>
              <PackagePlus className="h-4 w-4" />Entrada de Produtos
            </Button>
          )}
          {temPermissao('ajuste_estoque', 'pode_editar') && (
            <Button variant="outline" onClick={() => { setModalAjuste(true); setErro(''); }}>
              <SlidersHorizontal className="h-4 w-4" />Ajuste de Estoque
            </Button>
          )}
        </div>
      </div>

      <div className="flex border-b mb-0">
        {[{ id: 'atual', label: 'Estoque Atual' }, { id: 'movimentacoes', label: 'Movimentações' }].map(t => (
          <button key={t.id} onClick={() => setAba(t.id as any)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${aba === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {aba === 'atual' && (
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={filtroEstoqueBaixo} onChange={e => setFiltroEstoqueBaixo(e.target.checked)} className="rounded" />
            Apenas produtos com estoque abaixo do mínimo
          </label>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {['Produto', 'Estoque Atual', 'Mínimo', 'Preço Custo', 'Preço Venda', 'Valor em Estoque'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {estoque.map(p => (
                      <tr key={p.id} className={`border-b hover:bg-muted/30 transition-colors ${p.qtde_estoque < p.qtde_minima_estoque ? 'bg-red-50/30' : ''}`}>
                        <td className="px-4 py-3 text-sm font-medium">{p.descricao}</td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-bold ${p.qtde_estoque < p.qtde_minima_estoque ? 'text-red-600' : 'text-gray-800'}`}>{p.qtde_estoque}</span>
                          {p.qtde_estoque < p.qtde_minima_estoque && <Badge variant="warning" className="ml-2 text-xs">Baixo</Badge>}
                        </td>
                        <td className="px-4 py-3 text-sm">{p.qtde_minima_estoque}</td>
                        <td className="px-4 py-3 text-sm">{fmt(p.preco_custo)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-green-700">{fmt(p.preco_venda)}</td>
                        <td className="px-4 py-3 text-sm">{fmt(p.qtde_estoque * p.preco_custo)}</td>
                      </tr>
                    ))}
                    {!estoque.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhum produto cadastrado</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {aba === 'movimentacoes' && (
        <div className="space-y-4">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1">
              <Label className="text-xs">Produto</Label>
              <select className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={filtroMov.produto_id} onChange={e => setFiltroMov(f => ({ ...f, produto_id: e.target.value }))}>
                <option value="">Todos</option>
                {produtos.map(p => <option key={p.id} value={p.id}>{p.descricao}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <select className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={filtroMov.tipo} onChange={e => setFiltroMov(f => ({ ...f, tipo: e.target.value }))}>
                <option value="">Todos</option>
                <option value="ENTRADA_COMPRA">Entrada Compra</option>
                <option value="SAIDA_VENDA">Saída Venda</option>
                <option value="AJUSTE_ENTRADA">Ajuste Entrada</option>
                <option value="AJUSTE_SAIDA">Ajuste Saída</option>
              </select>
            </div>
            <div className="space-y-1"><Label className="text-xs">De</Label><Input type="date" className="h-9" value={filtroMov.data_inicio} onChange={e => setFiltroMov(f => ({ ...f, data_inicio: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Até</Label><Input type="date" className="h-9" value={filtroMov.data_fim} onChange={e => setFiltroMov(f => ({ ...f, data_fim: e.target.value }))} /></div>
            <Button variant="outline" size="sm" onClick={exportarCSV}><Download className="h-4 w-4" />CSV</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {['Data', 'Produto', 'Tipo', 'Qtde Ant.', 'Qtde Movida', 'Qtde Post.', 'Observação', 'Usuário'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {movimentacoes.map(m => (
                      <tr key={m.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-sm whitespace-nowrap">{new Date(m.created_at).toLocaleString('pt-BR')}</td>
                        <td className="px-4 py-3 text-sm">{m.produto_nome}</td>
                        <td className="px-4 py-3"><Badge variant={m.tipo.includes('ENTRADA') ? 'success' : 'destructive'}>{m.tipo.replace('_', ' ')}</Badge></td>
                        <td className="px-4 py-3 text-sm">{m.qtde_anterior}</td>
                        <td className="px-4 py-3 text-sm font-bold">{m.quantidade}</td>
                        <td className="px-4 py-3 text-sm">{m.qtde_posterior}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{m.observacao}</td>
                        <td className="px-4 py-3 text-sm">{m.usuario_nome}</td>
                      </tr>
                    ))}
                    {!movimentacoes.length && <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhuma movimentação encontrada</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: Entrada */}
      <Dialog open={modalEntrada} onOpenChange={setModalEntrada}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Entrada de Produtos</DialogTitle></DialogHeader>
          <form onSubmit={registrarEntrada} className="space-y-4">
            <div className="space-y-2">
              <Label>Produto *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar produto..." value={buscaEntrada} onChange={e => setBuscaEntrada(e.target.value)} autoFocus />
              </div>
              {produtosBusca.length > 0 && (
                <div className="border rounded-md bg-white shadow-md max-h-40 overflow-y-auto">
                  {produtosBusca.map(p => (
                    <div key={p.id} className="px-3 py-2 hover:bg-muted cursor-pointer text-sm border-b last:border-0"
                      onClick={() => { setFormEntrada(f => ({ ...f, produto_id: p.id })); setBuscaEntrada(p.descricao); setProdutosBusca([]); }}>
                      {p.descricao} — estoque atual: <strong>{p.qtde_estoque}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Quantidade *</Label>
                <Input type="number" min="1" required value={formEntrada.quantidade} onChange={e => setFormEntrada(f => ({ ...f, quantidade: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Preço de Custo (opcional)</Label>
                <Input type="number" step="0.01" min="0" value={formEntrada.preco_custo} onChange={e => setFormEntrada(f => ({ ...f, preco_custo: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observação (ex: NF 1234)</Label>
              <Input value={formEntrada.observacao} onChange={e => setFormEntrada(f => ({ ...f, observacao: e.target.value }))} />
            </div>
            {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-md">{erro}</div>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalEntrada(false)}>Cancelar</Button>
              <Button type="submit" disabled={salvando || !formEntrada.produto_id}>{salvando ? 'Salvando...' : 'Registrar Entrada'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Ajuste */}
      <Dialog open={modalAjuste} onOpenChange={setModalAjuste}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Ajuste de Estoque</DialogTitle></DialogHeader>
          <form onSubmit={registrarAjuste} className="space-y-4">
            <div className="space-y-2">
              <Label>Produto *</Label>
              <select required className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={formAjuste.produto_id} onChange={e => setFormAjuste(f => ({ ...f, produto_id: e.target.value }))}>
                <option value="">Selecione...</option>
                {estoque.map(p => <option key={p.id} value={p.id}>{p.descricao} (atual: {p.qtde_estoque})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={formAjuste.tipo} onChange={e => setFormAjuste(f => ({ ...f, tipo: e.target.value }))}>
                  <option value="ENTRADA">Entrada</option>
                  <option value="SAIDA">Saída</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Quantidade *</Label>
                <Input type="number" min="1" required value={formAjuste.quantidade} onChange={e => setFormAjuste(f => ({ ...f, quantidade: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Motivo *</Label>
              <Input required placeholder="Avaria, Contagem, Devolução..." value={formAjuste.motivo} onChange={e => setFormAjuste(f => ({ ...f, motivo: e.target.value }))} />
            </div>
            {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-md">{erro}</div>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalAjuste(false)}>Cancelar</Button>
              <Button type="submit" disabled={salvando}>{salvando ? 'Salvando...' : 'Registrar Ajuste'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
