import { useEffect, useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';

export default function FormasPagamento() {
  const { temPermissao } = useAuth();
  const [formas, setFormas] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [atual, setAtual] = useState<any>(null);
  const [form, setForm] = useState({ nome: '', ativo: true });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = () => api.get('/formas-pagamento?ativo=todos').then(r => setFormas(r.data));
  useEffect(() => { carregar(); }, []);

  const abrirNovo = () => { setAtual(null); setForm({ nome: '', ativo: true }); setErro(''); setModal(true); };
  const abrirEditar = (f: any) => { setAtual(f); setForm({ nome: f.nome, ativo: f.ativo }); setErro(''); setModal(true); };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault(); setSalvando(true); setErro('');
    try {
      if (atual) await api.put(`/formas-pagamento/${atual.id}`, form);
      else await api.post('/formas-pagamento', form);
      setModal(false); carregar();
    } catch (err: any) {
      setErro(err.response?.data?.error || 'Erro ao salvar');
    } finally { setSalvando(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Formas de Pagamento</h2>
          <p className="text-sm text-muted-foreground">Configure as formas de pagamento aceitas</p>
        </div>
        {temPermissao('formas_pagamento', 'pode_criar') && (
          <Button onClick={abrirNovo}><Plus className="h-4 w-4" />Nova Forma de Pagamento</Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                {['Nome', 'Status', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {formas.map(f => (
                <tr key={f.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium">{f.nome}</td>
                  <td className="px-4 py-3"><Badge variant={f.ativo ? 'success' : 'secondary'}>{f.ativo ? 'Ativa' : 'Inativa'}</Badge></td>
                  <td className="px-4 py-3">
                    {temPermissao('formas_pagamento', 'pode_editar') && (
                      <Button variant="ghost" size="sm" onClick={() => abrirEditar(f)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {!formas.length && <tr><td colSpan={3} className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhuma forma de pagamento cadastrada</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={modal} onOpenChange={o => !o && setModal(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{atual ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}</DialogTitle></DialogHeader>
          <form onSubmit={salvar} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input required autoFocus value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Dinheiro, Pix, Crédito..." />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} className="rounded" />
              Forma de pagamento ativa
            </label>
            {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-md">{erro}</div>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModal(false)}>Cancelar</Button>
              <Button type="submit" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
