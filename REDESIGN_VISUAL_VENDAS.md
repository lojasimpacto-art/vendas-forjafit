# REDESIGN VISUAL — SISTEMA DE VENDAS PDV
**Tarefa:** Migrar o frontend do sistema de vendas do CSS puro para Tailwind CSS + shadcn/ui  
**Referência visual:** Sistema de Cobrança WhatsApp (mesmo padrão)  
**Data:** Junho 2026

---

## OBJETIVO

O sistema de vendas atualmente usa CSS puro (`index.css`). O objetivo é reescrever todo o frontend usando **Tailwind CSS + shadcn/ui**, ficando idêntico em estilo ao sistema de cobrança WhatsApp. A lógica de negócio (chamadas de API, estados, fluxos) deve ser preservada integralmente — apenas o visual muda.

---

## STACK DO FRONTEND APÓS MIGRAÇÃO

| Item | Antes | Depois |
|------|-------|--------|
| Linguagem | JavaScript (.jsx) | TypeScript (.tsx) |
| Estilização | CSS puro (index.css) | Tailwind CSS |
| Componentes | HTML puro + classes CSS | shadcn/ui |
| Ícones | Emojis / texto | lucide-react |
| Tipagem | Nenhuma | TypeScript interfaces |

---

## CONFIGURAÇÃO INICIAL DO PROJETO

### 1. Instalar dependências

```bash
# Na pasta frontend/
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

npm install class-variance-authority clsx tailwind-merge
npm install lucide-react
npm install @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-label
npm install @radix-ui/react-slot @radix-ui/react-toast @radix-ui/react-progress
```

### 2. tailwind.config.js

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
};
```

### 3. src/index.css (substituir completamente)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 142 76% 36%;
    --primary-foreground: 355.7 100% 97.3%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 142 76% 36%;
    --radius: 0.5rem;
  }
}

@layer base {
  * { @apply border-border; }
  body {
    @apply bg-background text-foreground;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
}
```

### 4. src/lib/utils.ts

```ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## COMPONENTES SHADCN/UI A CRIAR

Criar os seguintes componentes em `src/components/ui/`:

### button.tsx
```tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-md px-8 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

### card.tsx
```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)} {...props} />
  )
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
  )
);
CardTitle.displayName = 'CardTitle';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardContent, CardFooter };
```

### input.tsx
```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export { Input };
```

### badge.tsx
```tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground',
        success: 'border-transparent bg-green-100 text-green-800',
        warning: 'border-transparent bg-yellow-100 text-yellow-800',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
```

---

## LAYOUT PRINCIPAL

### src/components/layout/AppLayout.tsx
```tsx
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

### src/components/layout/Sidebar.tsx
```tsx
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, Wallet,
  BarChart2, Users, ClipboardList, Settings, LogOut, Store
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  subItems?: { label: string; href: string }[];
}

const itensNav: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Vendas (PDV)', href: '/vendas', icon: ShoppingCart },
  { label: 'Produtos', href: '/produtos', icon: Package },
  { label: 'Estoque', href: '/estoque', icon: ClipboardList },
  { label: 'Caixa', href: '/caixa', icon: Wallet },
  { label: 'Relatórios', href: '/relatorios', icon: BarChart2 },
  {
    label: 'Configurações',
    href: '/configuracoes',
    icon: Settings,
    subItems: [
      { label: 'Usuários', href: '/usuarios' },
      { label: 'Formas de Pagamento', href: '/formas-pagamento' },
      { label: 'Logs', href: '/logs' },
    ],
  },
];

export function Sidebar() {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col min-h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Store className="h-6 w-6 text-green-400" />
          <span className="font-bold text-lg">Sistema Vendas</span>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {itensNav.map((item) => {
          if (item.subItems) {
            return (
              <div key={item.href} className="space-y-1">
                <div className="flex items-center gap-3 px-3 py-2 text-gray-400 text-xs font-semibold uppercase tracking-wider mt-4">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </div>
                {item.subItems.map((sub) => (
                  <NavLink
                    key={sub.href}
                    to={sub.href}
                    className={({ isActive }) =>
                      cn(
                        'block pl-10 pr-3 py-2 rounded-md text-sm transition-colors',
                        isActive
                          ? 'bg-green-700 text-white'
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
                    ? 'bg-green-700 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer com usuário e logout */}
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
```

### src/components/layout/Header.tsx
```tsx
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
    <header className="h-16 border-b bg-white flex items-center justify-between px-6 shadow-sm">
      <div>
        <h1 className="text-base font-semibold text-gray-800">{titulo}</h1>
        <p className="text-xs text-muted-foreground capitalize">{hoje}</p>
      </div>
    </header>
  );
}
```

---

## PADRÕES DE MIGRAÇÃO DAS PÁGINAS

Ao reescrever cada página, seguir estes padrões:

### Cards de KPI (Dashboard)
```tsx
<Card>
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-sm font-medium text-muted-foreground">Total de Vendas</CardTitle>
    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">R$ 1.240,00</div>
    <p className="text-xs text-muted-foreground mt-1">12 vendas hoje</p>
  </CardContent>
</Card>
```

### Tabelas
```tsx
<div className="rounded-lg border bg-card shadow-sm overflow-hidden">
  <table className="w-full">
    <thead>
      <tr className="border-b bg-muted/50">
        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Produto
        </th>
      </tr>
    </thead>
    <tbody>
      <tr className="border-b hover:bg-muted/30 transition-colors">
        <td className="px-4 py-3 text-sm">...</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Badges de status
```tsx
<Badge variant="success">Ativo</Badge>
<Badge variant="destructive">Inativo</Badge>
<Badge variant="warning">Estoque Baixo</Badge>
<Badge variant="outline">Cancelada</Badge>
```

### Botões
```tsx
<Button>Salvar</Button>
<Button variant="outline">Cancelar</Button>
<Button variant="destructive">Excluir</Button>
<Button variant="ghost" size="sm"><Pencil className="h-4 w-4" /></Button>
```

### Formulários
```tsx
<div className="space-y-4">
  <div className="space-y-2">
    <Label htmlFor="descricao">Descrição</Label>
    <Input id="descricao" placeholder="Nome do produto" />
  </div>
  <div className="grid grid-cols-2 gap-4">
    <div className="space-y-2">
      <Label htmlFor="preco_custo">Preço de Custo</Label>
      <Input id="preco_custo" type="number" step="0.01" />
    </div>
    <div className="space-y-2">
      <Label htmlFor="preco_venda">Preço de Venda</Label>
      <Input id="preco_venda" type="number" step="0.01" />
    </div>
  </div>
</div>
```

### Modais (Dialog)
```tsx
<Dialog open={aberto} onOpenChange={setAberto}>
  <DialogContent className="max-w-lg">
    <DialogHeader>
      <DialogTitle>Novo Produto</DialogTitle>
    </DialogHeader>
    {/* conteúdo */}
    <DialogFooter>
      <Button variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
      <Button onClick={handleSalvar}>Salvar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Cabeçalho de página
```tsx
<div className="flex items-center justify-between mb-6">
  <div>
    <h2 className="text-xl font-bold text-gray-800">Produtos</h2>
    <p className="text-sm text-muted-foreground">Gerencie o catálogo de produtos</p>
  </div>
  <Button onClick={() => setModalAberto(true)}>
    <Plus className="h-4 w-4" />
    Novo Produto
  </Button>
</div>
```

### Filtros/Busca
```tsx
<div className="flex items-center gap-3 mb-4">
  <div className="relative flex-1 max-w-sm">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input className="pl-9" placeholder="Buscar produto..." value={busca} onChange={(e) => setBusca(e.target.value)} />
  </div>
  <select className="h-9 rounded-md border border-input bg-background px-3 text-sm">
    <option>Todos</option>
    <option>Ativos</option>
    <option>Inativos</option>
  </select>
</div>
```

---

## TELA DE LOGIN

```tsx
export function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Store className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Sistema de Vendas</h1>
          <p className="text-sm text-muted-foreground mt-1">Acesse sua conta</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login">Usuário</Label>
            <Input id="login" placeholder="seu.usuario" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <Input id="senha" type="password" placeholder="••••••••" />
          </div>
          <Button className="w-full mt-2">Entrar</Button>
        </div>
      </div>
    </div>
  );
}
```

---

## TELA DE VENDAS (PDV) — LAYOUT ESPECIAL

A tela de PDV ocupa 100% da tela e não usa o layout padrão com sidebar. Ela tem sua própria estrutura:

```tsx
// Layout do PDV — fullscreen sem AppLayout
<div className="flex flex-col h-screen bg-gray-50">
  {/* Header do PDV */}
  <div className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between shadow-md">
    <div className="flex items-center gap-3">
      <ShoppingCart className="h-5 w-5 text-green-400" />
      <span className="font-bold">PDV — Venda #{numero}</span>
    </div>
    <div className="flex items-center gap-4 text-sm text-gray-300">
      <span>{dataHoje}</span>
      <span>Operador: {nomeUsuario}</span>
      <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-gray-300 hover:text-white">
        <X className="h-4 w-4 mr-1" /> Fechar PDV
      </Button>
    </div>
  </div>

  {/* Corpo do PDV */}
  <div className="flex flex-1 overflow-hidden">
    {/* Lado esquerdo — busca de produtos */}
    <div className="flex-1 p-4 overflow-y-auto border-r border-gray-200 bg-white">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9 text-base h-11" placeholder="Buscar produto pelo nome..." />
      </div>
      {/* Cards de produtos */}
      <div className="space-y-2">
        {produtos.map(p => (
          <div key={p.id}
            className="flex gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors"
            onClick={() => adicionarAoCarrinho(p)}
          >
            <img src={p.foto_url || '/sem-foto.png'} className="w-14 h-14 object-cover rounded-md flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{p.descricao}</p>
              <p className="text-green-700 font-bold">{formatarMoeda(p.preco_venda)}</p>
              <p className="text-xs text-muted-foreground">Estoque: {p.qtde_estoque} un</p>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Lado direito — carrinho */}
    <div className="w-96 flex flex-col bg-white p-4 shadow-inner">
      <h3 className="font-bold text-base mb-3 pb-2 border-b">Itens da Venda</h3>
      <div className="flex-1 overflow-y-auto space-y-2 mb-4">
        {carrinho.length === 0 && (
          <div className="text-center text-muted-foreground py-12 text-sm">
            Nenhum produto adicionado
          </div>
        )}
        {/* itens do carrinho */}
      </div>
      {/* Total e forma de pagamento */}
      <div className="border-t pt-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold">Total</span>
          <span className="text-2xl font-extrabold text-green-700">{formatarMoeda(total)}</span>
        </div>
        <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Selecione a forma de pagamento</option>
          {formasPagamento.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </select>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={limparCarrinho}>Cancelar</Button>
          <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={finalizarVenda}>
            Finalizar Venda
          </Button>
        </div>
      </div>
    </div>
  </div>
</div>
```

---

## INSTRUÇÕES GERAIS PARA O CLAUDE CODE

1. **Renomear todos os arquivos** de `.jsx` para `.tsx` e adicionar tipagens TypeScript básicas
2. **Preservar toda a lógica** — chamadas `axios`, estados `useState`, `useEffect`, autenticação JWT — nada disso muda
3. **Substituir todas as classes CSS customizadas** pelos equivalentes Tailwind + shadcn/ui conforme os padrões acima
4. **Usar lucide-react** para todos os ícones (substituir emojis e texto por ícones)
5. **Configurar path alias** `@/` apontando para `src/` no `tsconfig.json`
6. **A tela de Vendas (PDV)** deve ser rota separada que não renderiza dentro do AppLayout
7. **Manter o proxy** `"proxy": "http://localhost:3001"` no `package.json`
8. **Não alterar nada no backend** — apenas o frontend muda

---

## TSCONFIG.JSON

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "ES2020"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": false,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "ESNext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": "src",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["src"]
}
```

---

*Fim das instruções. Após a migração o sistema de vendas terá visual idêntico ao sistema de cobrança WhatsApp.*
