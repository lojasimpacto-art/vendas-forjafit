import { useState, useEffect } from 'react';
import { Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { fmt, hoje, mesInicio } from '@/lib/utils';
import api from '@/services/api';

const ABAS = [
  { id: 'produtos-vendidos', label: 'Produtos Vendidos' },
  { id: 'vendas-periodo', label: 'Vendas por Período' },
  { id: 'estoque-atual', label: 'Estoque Atual' },
  { id: 'movimentacao-estoque', label: 'Movimentação Estoque' },
  { id: 'resumo-caixa', label: 'Resumo de Caixa' },
];

export default function Relatorios() {
  const [aba, setAba] = useState('produtos-vendidos');
  const [dados, setDados] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [formasPag, setFormasPag] = useState<any[]>([]);
  const [filtro, setFiltro] = useState({ data_inicio: mesInicio(), data_fim: hoje(), produto_id: '', forma_pagamento_id: '', tipo: '' });
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    api.get('/produtos?ativo=todos').then(r => setProdutos(r.data));
    api.get('/formas-pagamento?ativo=todos').then(r => setFormasPag(r.data));
  }, []);

  const buscar = async () => {
    setCarregando(true); setDados([]);
    const p = new URLSearchParams();
    if (filtro.data_inicio) p.set('data_inicio', filtro.data_inicio);
    if (filtro.data_fim) p.set('data_fim', filtro.data_fim);
    if (filtro.produto_id) p.set('produto_id', filtro.produto_id);
    if (filtro.forma_pagamento_id) p.set('forma_pagamento_id', filtro.forma_pagamento_id);
    if (filtro.tipo) p.set('tipo', filtro.tipo);
    try { const { data } = await api.get(`/relatorios/${aba}?${p}`); setDados(data); }
    finally { setCarregando(false); }
  };

  useEffect(() => { buscar(); }, [aba]);

  const exportarCSV = (cols: string[], rows: string[][]) => {
    const blob = new Blob([cols.join(';') + '\n' + rows.map(r => r.join(';')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${aba}.csv`; a.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Relatórios</h2>
        <p className="text-sm text-muted-foreground">Análises e exportações</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b overflow-x-auto">
        {ABAS.map(t => (
          <button key={t.id} onClick={() => setAba(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${aba === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex items-end gap-3 flex-wrap">
        {aba !== 'estoque-atual' && (
          <>
            <div className="space-y-1"><Label className="text-xs">De</Label><Input type="date" className="h-9" value={filtro.data_inicio} onChange={e => setFiltro(f => ({ ...f, data_inicio: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Até</Label><Input type="date" className="h-9" value={filtro.data_fim} onChange={e => setFiltro(f => ({ ...f, data_fim: e.target.value }))} /></div>
          </>
        )}
        {['produtos-vendidos', 'movimentacao-estoque'].includes(aba) && (
          <div className="space-y-1">
            <Label className="text-xs">Produto</Label>
            <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={filtro.produto_id} onChange={e => setFiltro(f => ({ ...f, produto_id: e.target.value }))}>
              <option value="">Todos</option>
              {produtos.map(p => <option key={p.id} value={p.id}>{p.descricao}</option>)}
            </select>
          </div>
        )}
        {aba === 'vendas-periodo' && (
          <div className="space-y-1">
            <Label className="text-xs">Forma de Pagamento</Label>
            <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={filtro.forma_pagamento_id} onChange={e => setFiltro(f => ({ ...f, forma_pagamento_id: e.target.value }))}>
              <option value="">Todas</option>
              {formasPag.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
        )}
        {aba === 'movimentacao-estoque' && (
          <div className="space-y-1">
            <Label className="text-xs">Tipo</Label>
            <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={filtro.tipo} onChange={e => setFiltro(f => ({ ...f, tipo: e.target.value }))}>
              <option value="">Todos</option>
              <option value="ENTRADA_COMPRA">Entrada Compra</option>
              <option value="SAIDA_VENDA">Saída Venda</option>
              <option value="AJUSTE_ENTRADA">Ajuste Entrada</option>
              <option value="AJUSTE_SAIDA">Ajuste Saída</option>
            </select>
          </div>
        )}
        <Button onClick={buscar} disabled={carregando}>
          <Search className="h-4 w-4" />{carregando ? 'Buscando...' : 'Buscar'}
        </Button>
      </div>

      {/* Tabelas */}
      <Card>
        <CardContent className="p-0">
          {aba === 'produtos-vendidos' && (
            <>
              <div className="flex justify-end p-3 border-b">
                <Button variant="outline" size="sm" onClick={() => exportarCSV(
                  ['Produto', 'Qtde Vendida', 'Preço Médio', 'Total Vendido', 'Custo Total', 'Margem %'],
                  dados.map(d => [d.descricao_produto, d.qtde_vendida, d.preco_medio_venda, d.total_vendido, d.custo_total, d.margem_pct])
                )}><Download className="h-4 w-4" />Exportar CSV</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b bg-muted/50">{['Produto', 'Qtde Vendida', 'Preço Médio', 'Total Vendido', 'Custo Total', 'Margem %'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>)}</tr></thead>
                  <tbody>
                    {dados.map((d, i) => <tr key={i} className="border-b hover:bg-muted/30"><td className="px-4 py-3 text-sm">{d.descricao_produto}</td><td className="px-4 py-3 text-sm">{d.qtde_vendida}</td><td className="px-4 py-3 text-sm">{fmt(d.preco_medio_venda)}</td><td className="px-4 py-3 text-sm font-semibold text-green-700">{fmt(d.total_vendido)}</td><td className="px-4 py-3 text-sm">{fmt(d.custo_total)}</td><td className="px-4 py-3 text-sm">{d.margem_pct}%</td></tr>)}
                    {!dados.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">Sem dados no período</td></tr>}
                  </tbody>
                  {dados.length > 0 && <tfoot><tr className="border-t-2 bg-muted/30 font-bold"><td className="px-4 py-3 text-sm">TOTAL</td><td className="px-4 py-3 text-sm">{dados.reduce((s, d) => s + parseInt(d.qtde_vendida), 0)}</td><td /><td className="px-4 py-3 text-sm text-green-700">{fmt(dados.reduce((s, d) => s + parseFloat(d.total_vendido), 0))}</td><td className="px-4 py-3 text-sm">{fmt(dados.reduce((s, d) => s + parseFloat(d.custo_total), 0))}</td><td /></tr></tfoot>}
                </table>
              </div>
            </>
          )}

          {aba === 'vendas-periodo' && (
            <>
              <div className="flex justify-end p-3 border-b">
                <Button variant="outline" size="sm" onClick={() => exportarCSV(
                  ['#', 'Data', 'Hora', 'Operador', 'Itens', 'Total', 'Pagamento', 'Status'],
                  dados.map(d => [d.numero_venda, d.data_venda, d.hora_venda, d.operador_nome, d.qtde_itens, d.valor_total, d.forma_pagamento_nome, d.status])
                )}><Download className="h-4 w-4" />Exportar CSV</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b bg-muted/50">{['#', 'Data', 'Hora', 'Operador', 'Itens', 'Total', 'Pagamento', 'Status'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>)}</tr></thead>
                  <tbody>
                    {dados.map(d => <tr key={d.id} className={`border-b hover:bg-muted/30 ${d.status === 'CANCELADA' ? 'opacity-50 line-through' : ''}`}><td className="px-4 py-3 text-sm font-mono">#{d.numero_venda}</td><td className="px-4 py-3 text-sm">{d.data_venda}</td><td className="px-4 py-3 text-sm">{d.hora_venda?.slice(0, 5)}</td><td className="px-4 py-3 text-sm">{d.operador_nome}</td><td className="px-4 py-3 text-sm">{d.qtde_itens}</td><td className="px-4 py-3 text-sm font-semibold text-green-700">{fmt(d.valor_total)}</td><td className="px-4 py-3 text-sm">{d.forma_pagamento_nome}</td><td className="px-4 py-3"><Badge variant={d.status === 'CONCLUIDA' ? 'success' : 'destructive'}>{d.status}</Badge></td></tr>)}
                    {!dados.length && <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">Sem dados</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {aba === 'estoque-atual' && (
            <>
              <div className="flex justify-end p-3 border-b">
                <Button variant="outline" size="sm" onClick={() => exportarCSV(
                  ['Produto', 'Estoque Atual', 'Mínimo', 'Preço Custo', 'Preço Venda', 'Valor Estoque'],
                  dados.map(d => [d.descricao, d.qtde_estoque, d.qtde_minima_estoque, d.preco_custo, d.preco_venda, d.valor_em_estoque])
                )}><Download className="h-4 w-4" />Exportar CSV</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b bg-muted/50">{['Produto', 'Estoque Atual', 'Mínimo', 'Preço Custo', 'Preço Venda', 'Valor Estoque'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>)}</tr></thead>
                  <tbody>
                    {dados.map(d => <tr key={d.id} className={`border-b hover:bg-muted/30 ${d.estoque_baixo ? 'bg-red-50/30' : ''}`}><td className="px-4 py-3 text-sm">{d.descricao}</td><td className="px-4 py-3"><span className={`text-sm font-bold ${d.estoque_baixo ? 'text-red-600' : ''}`}>{d.qtde_estoque}</span>{d.estoque_baixo && <Badge variant="warning" className="ml-2 text-xs">Baixo</Badge>}</td><td className="px-4 py-3 text-sm">{d.qtde_minima_estoque}</td><td className="px-4 py-3 text-sm">{fmt(d.preco_custo)}</td><td className="px-4 py-3 text-sm font-semibold text-green-700">{fmt(d.preco_venda)}</td><td className="px-4 py-3 text-sm">{fmt(d.valor_em_estoque)}</td></tr>)}
                    {!dados.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">Sem dados</td></tr>}
                  </tbody>
                  {dados.length > 0 && <tfoot><tr className="border-t-2 bg-muted/30 font-bold"><td className="px-4 py-3 text-sm" colSpan={5}>TOTAL EM ESTOQUE</td><td className="px-4 py-3 text-sm">{fmt(dados.reduce((s, d) => s + parseFloat(d.valor_em_estoque), 0))}</td></tr></tfoot>}
                </table>
              </div>
            </>
          )}

          {aba === 'movimentacao-estoque' && (
            <>
              <div className="flex justify-end p-3 border-b">
                <Button variant="outline" size="sm" onClick={() => exportarCSV(
                  ['Data', 'Produto', 'Tipo', 'Qtde Ant.', 'Qtde', 'Qtde Post.', 'Obs.', 'Usuário'],
                  dados.map(d => [new Date(d.created_at).toLocaleString('pt-BR'), d.produto_nome, d.tipo, d.qtde_anterior, d.quantidade, d.qtde_posterior, d.observacao || '', d.usuario_nome])
                )}><Download className="h-4 w-4" />Exportar CSV</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b bg-muted/50">{['Data', 'Produto', 'Tipo', 'Qtde Ant.', 'Qtde', 'Qtde Post.', 'Obs.', 'Usuário'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>)}</tr></thead>
                  <tbody>
                    {dados.map(d => <tr key={d.id} className="border-b hover:bg-muted/30"><td className="px-4 py-3 text-sm whitespace-nowrap">{new Date(d.created_at).toLocaleString('pt-BR')}</td><td className="px-4 py-3 text-sm">{d.produto_nome}</td><td className="px-4 py-3"><Badge variant={d.tipo.includes('ENTRADA') ? 'success' : 'destructive'}>{d.tipo.replace('_', ' ')}</Badge></td><td className="px-4 py-3 text-sm">{d.qtde_anterior}</td><td className="px-4 py-3 text-sm font-bold">{d.quantidade}</td><td className="px-4 py-3 text-sm">{d.qtde_posterior}</td><td className="px-4 py-3 text-sm text-muted-foreground">{d.observacao}</td><td className="px-4 py-3 text-sm">{d.usuario_nome}</td></tr>)}
                    {!dados.length && <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">Sem dados</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {aba === 'resumo-caixa' && (
            <>
              <div className="flex justify-end p-3 border-b">
                <Button variant="outline" size="sm" onClick={() => exportarCSV(
                  ['Data', 'Total Vendas', 'Dinheiro', 'Crédito', 'Débito', 'PIX', 'Status'],
                  dados.map(d => [d.data_caixa, d.total_vendas, d.total_dinheiro, d.total_credito, d.total_debito, d.total_pix, d.status])
                )}><Download className="h-4 w-4" />Exportar CSV</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b bg-muted/50">{['Data', 'Total Vendas', 'Dinheiro', 'Crédito', 'Débito', 'PIX', 'Status'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>)}</tr></thead>
                  <tbody>
                    {dados.map(d => <tr key={d.id} className="border-b hover:bg-muted/30"><td className="px-4 py-3 text-sm font-medium">{d.data_caixa}</td><td className="px-4 py-3 text-sm font-semibold text-green-700">{fmt(d.total_vendas)}</td><td className="px-4 py-3 text-sm">{fmt(d.total_dinheiro)}</td><td className="px-4 py-3 text-sm">{fmt(d.total_credito)}</td><td className="px-4 py-3 text-sm">{fmt(d.total_debito)}</td><td className="px-4 py-3 text-sm">{fmt(d.total_pix)}</td><td className="px-4 py-3"><Badge variant={d.status === 'ABERTO' ? 'success' : 'secondary'}>{d.status}</Badge></td></tr>)}
                    {!dados.length && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">Sem dados</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
