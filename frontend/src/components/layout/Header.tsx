import { useLocation } from 'react-router-dom';

const titulos: Record<string, string> = {
  '/': 'Dashboard',
  '/vendas': 'Vendas — PDV',
  '/produtos': 'Produtos',
  '/estoque': 'Estoque',
  '/caixa': 'Controle de Caixa',
  '/relatorios': 'Relatórios',
  '/usuarios': 'Usuários',
  '/formas-pagamento': 'Formas de Pagamento',
  '/logs': 'Logs do Sistema',
};

export function Header() {
  const location = useLocation();
  const titulo = titulos[location.pathname] || 'Sistema de Vendas';
  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });

  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-6 shadow-sm flex-shrink-0">
      <div>
        <h1 className="text-sm font-semibold text-gray-800">{titulo}</h1>
        <p className="text-xs text-muted-foreground capitalize">{hoje}</p>
      </div>
    </header>
  );
}
