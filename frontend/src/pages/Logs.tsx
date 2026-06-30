import { useEffect, useState } from 'react';
import { Search, Download, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import api from '@/services/api';

export default function Logs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [filtro, setFiltro] = useState({ usuario_id: '', acao: '', tabela: '', data_inicio: '', data_fim: '' });
  const [expandido, setExpandido] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    api.get('/usuarios').then(r => setUsuarios(r.data)).catch(() => {});
    buscar();
  }, []);

  const buscar = async () => {
    setCarregando(true);
    const p = new URLSearchParams(filtro as any);
    try { const { data } = await api.get(`/logs?${p}`); setLogs(data); }
    finally { setCarregando(false); }
  };

  const exportarCSV = () => {
    const cols = ['Data/Hora', 'Usuário', 'Ação', 'Tabela', 'Descrição'];
    const linhas = logs.map(l => [new Date(l.created_at).toLocaleString('pt-BR'), l.usuario_nome || '', l.acao, l.tabela || '', l.descricao || ''].join(';'));
    const blob = new Blob([cols.join(';') + '\n' + linhas.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'logs.csv'; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Logs do Sistema</h2>
          <p className="text-sm text-muted-foreground">Auditoria e rastreabilidade de ações</p>
        </div>
        <Button variant="outline" onClick={exportarCSV}><Download className="h-4 w-4" />Exportar CSV</Button>
      </div>

      <div className="flex items-end gap-3 flex-wrap">
        <div className="space-y-1">
          <Label className="text-xs">Usuário</Label>
          <select className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={filtro.usuario_id} onChange={e => setFiltro(f => ({ ...f, usuario_id: e.target.value }))}>
            <option value="">Todos</option>
            {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Ação</Label>
          <Input className="h-9 w-40" placeholder="LOGIN, VENDA..." value={filtro.acao} onChange={e => setFiltro(f => ({ ...f, acao: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Tabela</Label>
          <select className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={filtro.tabela} onChange={e => setFiltro(f => ({ ...f, tabela: e.target.value }))}>
            <option value="">Todas</option>
            {['usuarios', 'produtos', 'pedidos', 'caixa', 'movimentacao_estoque'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1"><Label className="text-xs">De</Label><Input type="date" className="h-9" value={filtro.data_inicio} onChange={e => setFiltro(f => ({ ...f, data_inicio: e.target.value }))} /></div>
        <div className="space-y-1"><Label className="text-xs">Até</Label><Input type="date" className="h-9" value={filtro.data_fim} onChange={e => setFiltro(f => ({ ...f, data_fim: e.target.value }))} /></div>
        <Button onClick={buscar} disabled={carregando}><Search className="h-4 w-4" />{carregando ? 'Buscando...' : 'Buscar'}</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="w-8 px-2" />
                  {['Data/Hora', 'Usuário', 'Ação', 'Tabela', 'Descrição'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <>
                    <tr
                      key={l.id}
                      className={`border-b hover:bg-muted/30 transition-colors cursor-pointer ${expandido === l.id ? 'bg-muted/20' : ''}`}
                      onClick={() => setExpandido(expandido === l.id ? null : l.id)}
                    >
                      <td className="px-2 py-3 text-muted-foreground">
                        {(l.dados_antes || l.dados_depois) && (expandido === l.id
                          ? <ChevronDown className="h-4 w-4" />
                          : <ChevronRight className="h-4 w-4" />)}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{new Date(l.created_at).toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-3 text-sm">{l.usuario_nome || '—'}</td>
                      <td className="px-4 py-3"><Badge variant="secondary" className="font-mono text-xs">{l.acao}</Badge></td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{l.tabela || '—'}</td>
                      <td className="px-4 py-3 text-sm">{l.descricao}</td>
                    </tr>
                    {expandido === l.id && (l.dados_antes || l.dados_depois) && (
                      <tr key={`det-${l.id}`} className="bg-gray-950/5 border-b">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="flex gap-6">
                            {l.dados_antes && (
                              <div className="flex-1">
                                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Antes</p>
                                <pre className="bg-gray-900 text-green-400 rounded-lg p-3 text-xs overflow-auto max-h-48 font-mono">
                                  {JSON.stringify(l.dados_antes, null, 2)}
                                </pre>
                              </div>
                            )}
                            {l.dados_depois && (
                              <div className="flex-1">
                                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Depois</p>
                                <pre className="bg-gray-900 text-blue-400 rounded-lg p-3 text-xs overflow-auto max-h-48 font-mono">
                                  {JSON.stringify(l.dados_depois, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                {!logs.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhum log encontrado</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
