import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, Wallet,
  BarChart2, Users, ClipboardList, Settings, LogOut,
  Store, CreditCard, ScrollText, Boxes
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  recurso?: string;
  subItems?: { label: string; href: string; recurso?: string }[];
}

const itensNav: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Vendas (PDV)', href: '/vendas', icon: ShoppingCart, recurso: 'vendas' },
  { label: 'Caixa', href: '/caixa', icon: Wallet, recurso: 'caixa' },
  { label: 'Produtos', href: '/produtos', icon: Package, recurso: 'produtos' },
  { label: 'Estoque', href: '/estoque', icon: Boxes, recurso: 'estoque' },
  { label: 'Relatórios', href: '/relatorios', icon: BarChart2, recurso: 'relatorios' },
  {
    label: 'Configurações',
    href: '/configuracoes',
    icon: Settings,
    subItems: [
      { label: 'Usuários', href: '/usuarios', recurso: 'usuarios' },
      { label: 'Formas de Pagamento', href: '/formas-pagamento', recurso: 'formas_pagamento' },
      { label: 'Logs do Sistema', href: '/logs', recurso: 'logs' },
    ],
  },
];

export function Sidebar() {
  const { usuario, logout, temPermissao } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col min-h-screen flex-shrink-0">
      <div className="p-5 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Store className="h-6 w-6 text-green-400" />
          <span className="font-bold text-base">PDV Forjafit</span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {itensNav.map((item) => {
          if (item.recurso && !temPermissao(item.recurso)) return null;

          if (item.subItems) {
            const subVisiveis = item.subItems.filter(s => !s.recurso || temPermissao(s.recurso));
            if (subVisiveis.length === 0) return null;
            return (
              <div key={item.href}>
                <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mt-3">
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </div>
                {subVisiveis.map((sub) => (
                  <NavLink
                    key={sub.href}
                    to={sub.href}
                    className={({ isActive }) =>
                      cn(
                        'block pl-9 pr-3 py-2 rounded-md text-sm transition-colors',
                        isActive
                          ? 'bg-green-700 text-white font-medium'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      )
                    }
                  >
                    {sub.label}
                  </NavLink>
                ))}
              </div>
            );
          }

          return (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-green-700 text-white font-medium'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                )
              }
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-green-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {usuario?.nome?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <span className="text-sm text-gray-300 truncate">{usuario?.nome || 'Usuário'}</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
