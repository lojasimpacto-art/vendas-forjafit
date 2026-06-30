import { useEffect, useState } from 'react';
import { Unlock, Lock, RotateCcw, Eye, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { fmt } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';

const formatarData = (dataISO: string) => {
  if (!dataISO) return '—';
  const d = new Date(dataISO);
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Bahia' });
};

export default function Caixa() {
  const { temPermissao } = useAuth();
  const [caixa, setCaixa] = useState<any>(null);
  const [historico, setHistorico] = useState<any[]>([]);
  const [aba, setAba] = useState<'hoje' | 'historico'>('hoje');

  // Modais principais
  const [modalAbertura, setModalAbertura] = useState(false);
  const [modalFechamento, setModalFechamento] = useState(false);
  const [modalReabrir, setModalReabrir] = useState<any>(null);

  // Modal detalhe de caixa histórico
  const [caixaDetalhe, setCaixaDetalhe] = useState<any>(null);
  const [modalDetalhe, setModalDetalhe] = useState(false);
  const [vendasDetalhe, setVendasDetalhe] = useState<any[]>([]);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);

  // Campos de formulário
  const [saldoAbertura, setSaldoAbertura] = useState('0');
  const [valorContado, setValorContado] = useState('');
  const [obsFechamento, setObsFechamento] = useState('');
  const [supervisorLogin, setSupervisorLogin] = useState('');
  const [supervisorSenha, setSupervisorSenha] = useState('');
  const [filtro, setFiltro] = useState({ data_inicio: '', data_fim: '' });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregarHoje = () => api.get('/caixa/hoje').then(r => setCaixa(r.data)).catch(() => setCaixa(null));
  const carregarHistorico = () => {
    const p = new URLSearchParams(filtro as any);
    api.get(`/caixa/historico?${p}`).then(r => setHistorico(r.data));
  };

  useEffect(() => { carregarHoje(); }, []);
  useEffect(() => { if (aba === 'historico') carregarHistorico(); }, [aba, filtro]);

  const abrirCaixa = async (e: React.FormEvent) => {
    e.preventDefault(); setSalvando(true); setErro('');
    try {
      await api.post('/caixa/abrir', { saldo_abertura: parseFloat(saldoAbertura) });
      setModalAbertura(false); carregarHoje();
    } catch (err: any) { setErro(err.response?.data?.error || 'Erro ao abrir caixa'); }
    finally { setSalvando(false); }
  };

  const fecharCaixa = async (e: React.FormEvent) => {
    e.preventDefault(); setSalvando(true); setErro('');
    try {
      await api.post('/caixa/fechar', { valor_contado: parseFloat(valorContado), observacao: obsFechamento });
      setModalFechamento(false); carregarHoje();
    } catch (err: any) { setErro(err.response?.data?.error || 'Erro ao fechar caixa'); }
    finally { setSalvando(false); }
  };

  const reabrirCaixa = async (e: React.FormEvent) => {
    e.preventDefault(); setSalvando(true); setErro('');
    try {
      await api.post(`/caixa/${modalReabrir.id}/reabrir`, { login: supervisorLogin, senha: supervisorSenha });
      setModalReabrir(null); setSupervisorLogin(''); setSupervisorSenha('');
      aba === 'hoje' ? carregarHoje() : carregarHistorico();
    } catch (err: any) { setErro(err.response?.data?.error || 'Erro'); }
    finally { setSalvando(false); }
  };

  const verDetalhesCaixa = async (c: any) => {
    setCaixaDetalhe(c);
    setModalDetalhe(true);
    setLoadingDetalhe(true);
    try {
      const { data } = await api.get(`/caixa/${c.id}`);
      // Merge para pegar totais atualizados e vendas
      setCaixaDetalhe(data);
      setVendasDetalhe(data.vendas || []);
    } catch {
      setVendasDetalhe([]);
    } finally { setLoadingDetalhe(false); }
  };

  const handleFecharCaixaHistorico = async (caixaId: number) => {
    setSalvando(true);
    try {
      await api.post('/caixa/fechar', { caixa_id: caixaId, observacao: 'Fechamento via histórico — caixa de dia anterior' });
      setModalDetalhe(false);
      carregarHistorico();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao fechar caixa.');
    } finally { setSalvando(false); }
  };

  const exportarCSV = () => {
    const cols = ['Data', 'Total Vendas', 'Dinheiro', 'Crédito', 'Débito', 'PIX', 'Status'];
    const linhas = historico.map(c => [formatarData(c.data_caixa), c.total_vendas, c.total_dinheiro, c.total_credito, c.total_debito, c.total_pix, c.status].join(';'));
    const blob = new Blob([cols.join(';') + '\n' + linhas.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'caixas.csv'; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Controle de Caixa</h2>
          <p className="text-sm text-muted-foreground">Abertura, fechamento e histórico</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {[{ id: 'hoje', label: 'Caixa do Dia' }, { id: 'historico', label: 'Histórico' }].map(t => (
          <button key={t.id} onClick={() => setAba(t.id as any)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${aba === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── ABA HOJE ── */}
      {aba === 'hoje' && (
        <div className="space-y-6">
          {!caixa ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Lock className="h-12 w-12 text-gray-300" />
              <p className="text-lg font-semibold text-gray-600">Nenhum caixa aberto para hoje</p>
              {temPermissao('caixa', 'pode_criar') && (
                <Button onClick={() => { setModalAbertura(true); setErro(''); }}>
                  <Unlock className="h-4 w-4" />Abrir Caixa
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 flex-wrap">
                <Badge variant={caixa.status === 'ABERTO' ? 'success' : 'secondary'} className="text-sm px-3 py-1">
                  {caixa.status === 'ABERTO' ? <><Unlock className="h-3 w-3 mr-1" />ABERTO</> : <><Lock className="h-3 w-3 mr-1" />FECHADO</>}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Data: {formatarData(caixa.data_caixa)} | Abertura: {fmt(caixa.saldo_abertura)}
                </span>
                {temPermissao('caixa', 'pode_editar') && caixa.status === 'ABERTO' && (
                  <Button variant="destructive" size="sm" className="ml-auto"
                    onClick={() => { setModalFechamento(true); setErro(''); setValorContado(''); setObsFechamento(''); }}>
                    <Lock className="h-4 w-4" />Fechar Caixa
                  </Button>
                )}
                {temPermissao('caixa', 'pode_editar') && caixa.status === 'FECHADO' && (
                  <Button variant="outline" size="sm" className="ml-auto"
                    onClick={() => { setModalReabrir(caixa); setErro(''); }}>
                    <RotateCcw className="h-4 w-4" />Reabrir Caixa
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { label: 'Total Vendas', valor: caixa.total_vendas, cor: 'text-blue-700' },
                  { label: 'Dinheiro', valor: caixa.total_dinheiro, cor: 'text-green-700' },
                  { label: 'PIX', valor: caixa.total_pix, cor: 'text-purple-700' },
                  { label: 'Crédito', valor: caixa.total_credito, cor: 'text-orange-700' },
                  { label: 'Débito', valor: caixa.total_debito, cor: 'text-gray-700' },
                ].map((c, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
                      <p className={`text-lg font-bold ${c.cor}`}>{fmt(c.valor)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Vendas do Dia ({caixa.vendas?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          {['#', 'Hora', 'Operador', 'Forma Pag.', 'Total', 'Status'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {!caixa.vendas?.length
                          ? <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhuma venda realizada</td></tr>
                          : caixa.vendas.map((v: any) => (
                            <tr key={v.id} className={`border-b hover:bg-muted/30 transition-colors ${v.status === 'CANCELADA' ? 'opacity-50 line-through' : ''}`}>
                              <td className="px-4 py-3 text-sm font-mono">#{v.numero_venda}</td>
                              <td className="px-4 py-3 text-sm">{v.hora_venda?.slice(0, 5)}</td>
                              <td className="px-4 py-3 text-sm">{v.operador_nome}</td>
                              <td className="px-4 py-3 text-sm">{v.forma_pagamento_nome}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-green-700">{fmt(v.valor_total)}</td>
                              <td className="px-4 py-3">
                                <Badge variant={v.status === 'CONCLUIDA' ? 'success' : 'destructive'}>{v.status}</Badge>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── ABA HISTÓRICO ── */}
      {aba === 'historico' && (
        <div className="space-y-4">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1">
              <Label className="text-xs">De</Label>
              <Input type="date" className="h-9" value={filtro.data_inicio} onChange={e => setFiltro(f => ({ ...f, data_inicio: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Até</Label>
              <Input type="date" className="h-9" value={filtro.data_fim} onChange={e => setFiltro(f => ({ ...f, data_fim: e.target.value }))} />
            </div>
            <Button variant="outline" size="sm" onClick={exportarCSV}>
              <Download className="h-4 w-4" />Exportar CSV
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {['Data', 'Total Vendas', 'Dinheiro', 'Crédito', 'Débito', 'PIX', 'Status', 'Diferença', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historico.map(c => {
                      const diferenca = c.saldo_fechamento != null ? parseFloat(c.saldo_fechamento) - parseFloat(c.total_dinheiro) : null;
                      return (
                        <tr key={c.id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium">{formatarData(c.data_caixa)}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-green-700">{fmt(c.total_vendas)}</td>
                          <td className="px-4 py-3 text-sm">{fmt(c.total_dinheiro)}</td>
                          <td className="px-4 py-3 text-sm">{fmt(c.total_credito)}</td>
                          <td className="px-4 py-3 text-sm">{fmt(c.total_debito)}</td>
                          <td className="px-4 py-3 text-sm">{fmt(c.total_pix)}</td>
                          <td className="px-4 py-3">
                            <Badge variant={c.status === 'ABERTO' ? 'success' : 'secondary'}>{c.status}</Badge>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold">
                            {diferenca != null
                              ? <span className={diferenca >= 0 ? 'text-green-600' : 'text-red-600'}>{fmt(diferenca)}</span>
                              : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {c.status === 'FECHADO' && temPermissao('caixa', 'pode_editar') && (
                                <Button variant="ghost" size="sm" onClick={() => { setModalReabrir(c); setErro(''); }} title="Reabrir caixa">
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" onClick={() => verDetalhesCaixa(c)} title="Ver detalhes">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!historico.length && <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhum caixa encontrado</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── MODAL: Abrir Caixa ── */}
      <Dialog open={modalAbertura} onOpenChange={setModalAbertura}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Abrir Caixa</DialogTitle></DialogHeader>
          <form onSubmit={abrirCaixa} className="space-y-4">
            <div className="space-y-2">
              <Label>Saldo de abertura (dinheiro em caixa)</Label>
              <Input type="number" step="0.01" min="0" value={saldoAbertura}
                onChange={e => setSaldoAbertura(e.target.value)} autoFocus />
            </div>
            {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-md">{erro}</div>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalAbertura(false)}>Cancelar</Button>
              <Button type="submit" disabled={salvando}>{salvando ? 'Abrindo...' : 'Abrir Caixa'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: Fechar Caixa ── */}
      <Dialog open={modalFechamento} onOpenChange={setModalFechamento}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Fechar Caixa</DialogTitle></DialogHeader>
          {caixa && (
            <form onSubmit={fecharCaixa} className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                {[
                  ['Total Dinheiro (sistema)', caixa.total_dinheiro],
                  ['Total Crédito', caixa.total_credito],
                  ['Total Débito', caixa.total_debito],
                  ['Total PIX', caixa.total_pix],
                  ['Total Vendas', caixa.total_vendas],
                ].map(([l, v]) => (
                  <div key={l as string} className="flex justify-between">
                    <span className="text-muted-foreground">{l}</span>
                    <span className="font-semibold">{fmt(v)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label>Valor contado em dinheiro (físico) *</Label>
                <Input type="number" step="0.01" min="0" required value={valorContado}
                  onChange={e => setValorContado(e.target.value)} autoFocus />
              </div>
              {valorContado !== '' && (
                <div className={`text-lg font-bold px-4 py-2 rounded-lg ${parseFloat(valorContado) - parseFloat(caixa.total_dinheiro) >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  Diferença: {fmt(parseFloat(valorContado || '0') - parseFloat(caixa.total_dinheiro))}
                </div>
              )}
              <div className="space-y-2">
                <Label>Observação</Label>
                <textarea value={obsFechamento} onChange={e => setObsFechamento(e.target.value)} rows={2}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </div>
              {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-md">{erro}</div>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setModalFechamento(false)}>Cancelar</Button>
                <Button type="submit" variant="destructive" disabled={salvando}>{salvando ? 'Fechando...' : 'Confirmar Fechamento'}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── MODAL: Reabrir Caixa (supervisor) ── */}
      <Dialog open={!!modalReabrir} onOpenChange={o => !o && setModalReabrir(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Reabrir Caixa</DialogTitle></DialogHeader>
          {modalReabrir && (
            <form onSubmit={reabrirCaixa} className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                Esta ação requer autorização de um supervisor com permissão de reabertura.
                Caixa: <strong>{formatarData(modalReabrir.data_caixa)}</strong>
              </div>
              <div className="space-y-2">
                <Label>Usuário do Supervisor</Label>
                <Input value={supervisorLogin} onChange={e => setSupervisorLogin(e.target.value)} required autoFocus />
              </div>
              <div className="space-y-2">
                <Label>Senha do Supervisor</Label>
                <Input type="password" value={supervisorSenha} onChange={e => setSupervisorSenha(e.target.value)} required />
              </div>
              {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-md">{erro}</div>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setModalReabrir(null)}>Cancelar</Button>
                <Button type="submit" disabled={salvando}>{salvando ? 'Verificando...' : 'Autorizar e Reabrir'}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── MODAL: Detalhes do Caixa (histórico) ── */}
      <Dialog open={modalDetalhe} onOpenChange={setModalDetalhe}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Caixa — {caixaDetalhe && formatarData(caixaDetalhe.data_caixa)}</DialogTitle>
          </DialogHeader>
          {caixaDetalhe && (
            <div className="space-y-4">
              {/* Aviso + botão fechar se caixa ainda aberto */}
              {caixaDetalhe.status === 'ABERTO' && (
                <div className="bg-orange-50 border border-orange-200 rounded-md p-3 flex items-center justify-between">
                  <p className="text-sm text-orange-800">Este caixa ainda está aberto.</p>
                  {temPermissao('caixa', 'pode_editar') && (
                    <Button variant="outline" size="sm"
                      className="border-orange-400 text-orange-700 hover:bg-orange-100"
                      onClick={() => handleFecharCaixaHistorico(caixaDetalhe.id)}
                      disabled={salvando}>
                      Fechar este Caixa
                    </Button>
                  )}
                </div>
              )}

              {/* Cards de totais */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total Vendas', valor: caixaDetalhe.total_vendas, cor: 'text-blue-700' },
                  { label: 'Dinheiro', valor: caixaDetalhe.total_dinheiro, cor: 'text-green-700' },
                  { label: 'PIX', valor: caixaDetalhe.total_pix, cor: 'text-purple-700' },
                  { label: 'Crédito', valor: caixaDetalhe.total_credito, cor: 'text-orange-700' },
                  { label: 'Débito', valor: caixaDetalhe.total_debito, cor: 'text-gray-700' },
                  { label: 'Saldo Abertura', valor: caixaDetalhe.saldo_abertura, cor: 'text-gray-700' },
                ].map((c, i) => (
                  <div key={i} className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                    <p className={`text-lg font-bold ${c.cor}`}>{fmt(c.valor)}</p>
                  </div>
                ))}
              </div>

              {/* Lista de vendas */}
              <div>
                <h3 className="font-semibold mb-2 text-sm">Vendas do Dia</h3>
                {loadingDetalhe ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          {['#', 'Hora', 'Operador', 'Forma Pag.', 'Valor', 'Status'].map(h => (
                            <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {vendasDetalhe.length === 0
                          ? <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground text-sm">Nenhuma venda encontrada</td></tr>
                          : vendasDetalhe.map((v: any) => (
                            <tr key={v.id} className={`border-b hover:bg-muted/30 ${v.status === 'CANCELADA' ? 'opacity-50 line-through' : ''}`}>
                              <td className="px-3 py-2 font-mono">#{v.numero_venda}</td>
                              <td className="px-3 py-2">{v.hora_venda?.slice(0, 5)}</td>
                              <td className="px-3 py-2">{v.operador_nome || v.usuario_nome}</td>
                              <td className="px-3 py-2">{v.forma_pagamento_nome}</td>
                              <td className="px-3 py-2 text-right font-medium text-green-700">{fmt(v.valor_total)}</td>
                              <td className="px-3 py-2">
                                <Badge variant={v.status === 'CONCLUIDA' ? 'success' : 'destructive'}>{v.status}</Badge>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
