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

const RECURSOS = [
  { key: 'produtos', label: 'Produtos' },
  { key: 'vendas', label: 'Vendas' },
  { key: 'caixa', label: 'Caixa' },
  { key: 'estoque', label: 'Estoque' },
  { key: 'ajuste_estoque', label: 'Ajuste Estoque' },
  { key: 'relatorios', label: 'Relatórios' },
  { key: 'usuarios', label: 'Usuários' },
  { key: 'formas_pagamento', label: 'Formas Pag.' },
  { key: 'logs', label: 'Logs' },
];

const permVazia = () => RECURSOS.reduce((acc: any, r) => {
  acc[r.key] = { pode_ver: false, pode_criar: false, pode_editar: false, pode_excluir: false, pode_reabrir: false };
  return acc;
}, {});

export default function Usuarios() {
  const { temPermissao, usuario: usuarioLogado } = useAuth();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [usuarioAtual, setUsuarioAtual] = useState<any>(null);
  const [form, setForm] = useState({ nome: '', login: '', senha: '', ativo: true, trocar_senha: false });
  const [permissoes, setPermissoes] = useState<any>(permVazia());
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = () => api.get('/usuarios').then(r => setUsuarios(r.data));
  useEffect(() => { carregar(); }, []);

  const abrirNovo = () => {
    setUsuarioAtual(null);
    setForm({ nome: '', login: '', senha: '', ativo: true, trocar_senha: false });
    setPermissoes(permVazia()); setErro(''); setModal(true);
  };

  const abrirEditar = async (u: any) => {
    const { data } = await api.get(`/usuarios/${u.id}`);
    setUsuarioAtual(data);
    setForm({ nome: data.nome, login: data.login, senha: '', ativo: data.ativo, trocar_senha: data.trocar_senha });
    const p = permVazia();
    data.permissoes?.forEach((perm: any) => {
      if (p[perm.recurso]) p[perm.recurso] = { pode_ver: perm.pode_ver, pode_criar: perm.pode_criar, pode_editar: perm.pode_editar, pode_excluir: perm.pode_excluir, pode_reabrir: perm.pode_reabrir };
    });
    setPermissoes(p); setErro(''); setModal(true);
  };

  const setPerm = (recurso: string, campo: string, valor: boolean) => {
    setPermissoes((p: any) => ({ ...p, [recurso]: { ...p[recurso], [campo]: valor } }));
  };

  const marcarTodos = (recurso: string) => {
    setPermissoes((p: any) => ({ ...p, [recurso]: { pode_ver: true, pode_criar: true, pode_editar: true, pode_excluir: true, pode_reabrir: recurso === 'caixa' } }));
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault(); setSalvando(true); setErro('');
    const listaPermissoes = Object.entries(permissoes).map(([recurso, perm]) => ({ recurso, ...(perm as any) }));
    try {
      if (usuarioAtual) {
        const payload: any = { nome: form.nome, login: form.login, ativo: form.ativo, trocar_senha: form.trocar_senha };
        if (form.senha) payload.senha = form.senha;
        await api.put(`/usuarios/${usuarioAtual.id}`, payload);
        await api.put(`/usuarios/${usuarioAtual.id}/permissoes`, { permissoes: listaPermissoes });
      } else {
        const { data } = await api.post('/usuarios', { ...form, permissoes: listaPermissoes });
        await api.put(`/usuarios/${data.id}/permissoes`, { permissoes: listaPermissoes });
      }
      setModal(false); carregar();
    } catch (err: any) {
      setErro(err.response?.data?.error || 'Erro ao salvar');
    } finally { setSalvando(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Usuários</h2>
          <p className="text-sm text-muted-foreground">Gerencie acessos e permissões</p>
        </div>
        {temPermissao('usuarios', 'pode_criar') && (
          <Button onClick={abrirNovo}><Plus className="h-4 w-4" />Novo Usuário</Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                {['Nome', 'Login', 'Status', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium">{u.nome}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{u.login}</td>
                  <td className="px-4 py-3"><Badge variant={u.ativo ? 'success' : 'secondary'}>{u.ativo ? 'Ativo' : 'Inativo'}</Badge></td>
                  <td className="px-4 py-3">
                    {temPermissao('usuarios', 'pode_editar') && (
                      <Button variant="ghost" size="sm" onClick={() => abrirEditar(u)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {!usuarios.length && <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhum usuário</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={modal} onOpenChange={o => !o && setModal(false)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{usuarioAtual ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={salvar} className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Login *</Label>
                <Input required value={form.login} onChange={e => setForm(f => ({ ...f, login: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{usuarioAtual ? 'Nova Senha (opcional)' : 'Senha *'}</Label>
                <Input type="password" required={!usuarioAtual} value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))}
                  disabled={usuarioAtual?.id === usuarioLogado?.id} className="rounded" />
                Usuário ativo
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.trocar_senha} onChange={e => setForm(f => ({ ...f, trocar_senha: e.target.checked }))} className="rounded" />
                Exigir troca de senha no primeiro login
              </label>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3">Permissões</h3>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Módulo</th>
                      {['Ver', 'Criar', 'Editar', 'Excluir', 'Reabrir Caixa', ''].map(h => (
                        <th key={h} className="px-3 py-2 text-center font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {RECURSOS.map(r => (
                      <tr key={r.key} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-3 py-2 font-medium">{r.label}</td>
                        {(['pode_ver', 'pode_criar', 'pode_editar', 'pode_excluir'] as const).map(campo => (
                          <td key={campo} className="px-3 py-2 text-center">
                            <input type="checkbox" checked={permissoes[r.key]?.[campo] || false}
                              onChange={e => setPerm(r.key, campo, e.target.checked)} className="rounded w-4 h-4 cursor-pointer" />
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center">
                          {r.key === 'caixa' && (
                            <input type="checkbox" checked={permissoes[r.key]?.pode_reabrir || false}
                              onChange={e => setPerm(r.key, 'pode_reabrir', e.target.checked)} className="rounded w-4 h-4 cursor-pointer" />
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button type="button" onClick={() => marcarTodos(r.key)}
                            className="text-xs text-primary hover:underline">Todos</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

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
