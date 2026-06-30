import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ShoppingCart, DollarSign, CreditCard, Smartphone, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fmt } from '@/lib/utils';
import api from '@/services/api';

export default function Dashboard() {
  const [caixa, setCaixa] = useState<any>(null);
  const [vendas7, setVendas7] = useState<any[]>([]);
  const [ultimasVendas, setUltimasVendas] = useState<any[]>([]);
  const [estoqueBaixo, setEstoqueBaixo] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/caixa/hoje').catch(() => ({ data: null })),
      api.get('/relatorios/vendas-7dias').catch(() => ({ data: [] })),
      api.get('/pedidos/hoje').catch(() => ({ data: [] })),
      api.get('/estoque?estoque_baixo=true').catch(() => ({ data: [] }))
    ]).then(([c, v7, uv, eb]) => {
      setCaixa(c.data);
      setVendas7(v7.data);
      setUltimasVendas(uv.data?.slice(0, 10) || []);
      setEstoqueBaixo(eb.data || []);
    }).finally(() => setCarregando(false));
  }, []);

  if (carregando) {
    return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Carregando...</div>;
  }

  const cards = [
    {
      label: 'Total de Vendas Hoje',
      valor: fmt(caixa?.total_vendas),
      sub: `${ultimasVendas.length} transações`,
      icon: ShoppingCart,
      cor: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Dinheiro',
      valor: fmt(caixa?.total_dinheiro),
      icon: DollarSign,
      cor: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'PIX',
      valor: fmt(caixa?.total_pix),
      icon: Smartphone,
      cor: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Cartões',
      valor: fmt((parseFloat(caixa?.total_credito || 0) + parseFloat(caixa?.total_debito || 0))),
      sub: `Créd: ${fmt(caixa?.total_credito)} | Déb: ${fmt(caixa?.total_debito)}`,
      icon: CreditCard,
      cor: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Dashboard</h2>
        <p className="text-sm text-muted-foreground">Resumo do dia</p>
      </div>

      {/* Status do caixa */}
      {caixa ? (
        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium ${caixa.status === 'ABERTO' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>
          <div className={`w-2 h-2 rounded-full ${caixa.status === 'ABERTO' ? 'bg-green-500' : 'bg-gray-400'}`} />
          Caixa {caixa.status} — Saldo abertura: {fmt(caixa.saldo_abertura)}
          <Link to="/caixa" className="ml-auto text-xs underline opacity-70 hover:opacity-100">Ver caixa</Link>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm bg-yellow-50 text-yellow-800 border border-yellow-200">
          <AlertTriangle className="h-4 w-4" />
          Nenhum caixa aberto hoje.
          <Link to="/caixa" className="ml-auto underline font-medium">Abrir caixa →</Link>
        </div>
      )}

      {/* Cards KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              <div className={`${card.bg} p-2 rounded-md`}>
                <card.icon className={`h-4 w-4 ${card.cor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.valor}</div>
              {card.sub && <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico vendas 7 dias */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Vendas — Últimos 7 Dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={vendas7}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="data" tickFormatter={(d: string) => d?.slice(5)} tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v: number) => `R$${v}`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => fmt(v)} labelFormatter={(l: string) => `Data: ${l}`} />
                <Bar dataKey="total" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} name="Total" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Alertas de estoque */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Estoque Baixo
              {estoqueBaixo.length > 0 && (
                <Badge variant="warning" className="ml-auto">{estoqueBaixo.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {estoqueBaixo.length === 0 ? (
              <p className="px-6 pb-4 text-sm text-muted-foreground">Nenhum produto com estoque baixo.</p>
            ) : (
              <div className="divide-y">
                {estoqueBaixo.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between px-6 py-2.5">
                    <span className="text-sm truncate max-w-[160px]">{p.descricao}</span>
                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                      {p.qtde_estoque}/{p.qtde_minima_estoque}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {estoqueBaixo.length > 0 && (
              <div className="px-6 pb-4 pt-2">
                <Link to="/estoque" className="text-xs text-primary hover:underline">Ver estoque completo →</Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Últimas vendas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimas Vendas de Hoje</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  {['#', 'Hora', 'Operador', 'Forma de Pagamento', 'Total'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ultimasVendas.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhuma venda registrada hoje</td></tr>
                ) : ultimasVendas.map((v: any) => (
                  <tr key={v.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono">#{v.numero_venda}</td>
                    <td className="px-4 py-3 text-sm">{v.hora_venda?.slice(0, 5)}</td>
                    <td className="px-4 py-3 text-sm">{v.operador_nome}</td>
                    <td className="px-4 py-3 text-sm">{v.forma_pagamento_nome}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-700">{fmt(v.valor_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
