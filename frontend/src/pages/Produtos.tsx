import { useEffect, useState } from 'react';
import { Search, Plus, Pencil, History, PackageX, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { fmt } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';

export default function Produtos() {
  const { temPermissao } = useAuth();
  const [produtos, setProdutos] = useState<any[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroEstoqueBaixo, setFiltroEstoqueBaixo] = useState(false);
  const [modal, setModal] = useState<'form' | 'historico' | null>(null);
  const [produtoAtual, setProdutoAtual] = useState<any>(null);
  const [historico, setHistorico] = useState<any[]>([]);
  const [form, setForm] = useState({ descricao: '', preco_custo: '0', preco_venda: '0', qtde_minima_estoque: '0' });
  const [fotoBase64, setFotoBase64] = useState<string>('');
  const [previewFoto, setPreviewFoto] = useState<string>('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    const params = new URLSearchParams();
    if (busca) params.set('busca', busca);
    if (filtroEstoqueBaixo) params.set('estoque_baixo', 'true');
    const { data } = await api.get(`/produtos?${params}`);
    setProdutos(data);
  };

  useEffect(() => { carregar(); }, [busca, filtroEstoqueBaixo]);

  const abrirNovo = () => {
    setProdutoAtual(null);
    setForm({ descricao: '', preco_custo: '0', preco_venda: '0', qtde_minima_estoque: '0' });
    setFotoBase64(''); setPreviewFoto(''); setErro(''); setModal('form');
  };

  const abrirEditar = (p: any) => {
    setProdutoAtual(p);
    setForm({ descricao: p.descricao, preco_custo: p.preco_custo, preco_venda: p.preco_venda, qtde_minima_estoque: p.qtde_minima_estoque });
    setFotoBase64(''); setPreviewFoto(p.foto_url || ''); setErro(''); setModal('form');
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      alert('A foto deve ter no máximo 500KB. Reduza o tamanho da imagem antes de enviar.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setFotoBase64(base64);
      setPreviewFoto(base64);
    };
    reader.readAsDataURL(file);
  };

  const abrirHistorico = async (p: any) => {
    setProdutoAtual(p);
    const { data } = await api.get(`/produtos/${p.id}/historico-precos`);
    setHistorico(data);
    setModal('historico');
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true); setErro('');
    try {
      const payload: any = { ...form };
      if (fotoBase64) payload.foto_base64 = fotoBase64;

      if (produtoAtual) {
        await api.put(`/produtos/${produtoAtual.id}`, payload);
      } else {
        await api.post('/produtos', payload);
      }
      setModal(null); carregar();
    } catch (err: any) {
      setErro(err.response?.data?.error || 'Erro ao salvar');
    } finally { setSalvando(false); }
  };

  const inativar = async (p: any) => {
    if (!window.confirm(`Inativar "${p.descricao}"?`)) return;
    await api.delete(`/produtos/${p.id}`);
    carregar();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Produtos</h2>
          <p className="text-sm text-muted-foreground">Gerencie o catálogo de produtos</p>
        </div>
        {temPermissao('produtos', 'pode_criar') && (
          <Button onClick={abrirNovo}><Plus className="h-4 w-4" />Novo Produto</Button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar produto..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={filtroEstoqueBaixo} onChange={e => setFiltroEstoqueBaixo(e.target.checked)} className="rounded" />
          Apenas estoque baixo
        </label>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  {['Foto', 'Descrição', 'Custo', 'Venda', 'Estoque', 'Mínimo', 'Status', 'Ações'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {produtos.map(p => (
                  <tr key={p.id} className={`border-b hover:bg-muted/30 transition-colors ${!p.ativo ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      {p.foto_url
                        ? <img src={p.foto_url} alt="" className="w-10 h-10 object-cover rounded-md" />
                        : <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center"><Image className="h-4 w-4 text-gray-400" /></div>}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{p.descricao}</td>
                    <td className="px-4 py-3 text-sm">{fmt(p.preco_custo)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-700">{fmt(p.preco_venda)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={p.qtde_estoque < p.qtde_minima_estoque ? 'text-red-600 font-bold' : ''}>
                        {p.qtde_estoque}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{p.qtde_minima_estoque}</td>
                    <td className="px-4 py-3">
                      <Badge variant={p.ativo ? 'success' : 'secondary'}>{p.ativo ? 'Ativo' : 'Inativo'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => abrirHistorico(p)} title="Histórico de preços">
                          <History className="h-4 w-4" />
                        </Button>
                        {temPermissao('produtos', 'pode_editar') && (
                          <Button variant="ghost" size="sm" onClick={() => abrirEditar(p)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {temPermissao('produtos', 'pode_excluir') && p.ativo && (
                          <Button variant="ghost" size="sm" onClick={() => inativar(p)} title="Inativar" className="text-red-500 hover:text-red-700">
                            <PackageX className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {produtos.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhum produto encontrado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Formulário */}
      <Dialog open={modal === 'form'} onOpenChange={o => !o && setModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{produtoAtual ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={salvar} className="space-y-4">
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input required value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Nome do produto" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Preço de Custo</Label>
                <Input type="number" step="0.01" min="0" value={form.preco_custo} onChange={e => setForm({ ...form, preco_custo: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Preço de Venda</Label>
                <Input type="number" step="0.01" min="0" value={form.preco_venda} onChange={e => setForm({ ...form, preco_venda: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Estoque Mínimo</Label>
                <Input type="number" min="0" value={form.qtde_minima_estoque} onChange={e => setForm({ ...form, qtde_minima_estoque: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Foto do Produto</Label>
              {(previewFoto) && (
                <img src={previewFoto} alt="Preview" className="w-24 h-24 object-cover rounded-lg border" />
              )}
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFotoChange}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">JPG, PNG ou WebP — máximo 500KB</p>
            </div>
            {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-md">{erro}</div>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModal(null)}>Cancelar</Button>
              <Button type="submit" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Histórico */}
      <Dialog open={modal === 'historico'} onOpenChange={o => !o && setModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Histórico de Preços — {produtoAtual?.descricao}</DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  {['Data/Hora', 'Tipo', 'Preço Anterior', 'Preço Novo', 'Alterado por'].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historico.length === 0
                  ? <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">Sem histórico de preços</td></tr>
                  : historico.map((h: any) => (
                    <tr key={h.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-2.5 text-sm">{new Date(h.alterado_em).toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-2.5"><Badge variant={h.tipo_preco === 'VENDA' ? 'info' : 'secondary'}>{h.tipo_preco}</Badge></td>
                      <td className="px-4 py-2.5 text-sm">{fmt(h.preco_anterior)}</td>
                      <td className="px-4 py-2.5 text-sm font-semibold">{fmt(h.preco_novo)}</td>
                      <td className="px-4 py-2.5 text-sm">{h.alterado_por_nome}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
