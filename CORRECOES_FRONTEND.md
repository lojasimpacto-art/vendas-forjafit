# CORREÇÕES FRONTEND — SISTEMA DE VENDAS
**Tarefa:** Corrigir os erros de TypeScript/compilação identificados após a migração visual  
**Data:** Junho 2026

---

## LISTA DE ERROS A CORRIGIR

### CORREÇÃO 1 — `App.tsx`: import errado do AppLayout e FormasPagamento

**Problema:** `AppLayout` está sendo importado como default export mas foi declarado como named export. O `FormasPagamento` não está sendo encontrado.

**Arquivo:** `src/App.tsx`

Localizar a linha:
```tsx
import AppLayout from '@/components/layout/AppLayout';
```
Substituir por:
```tsx
import { AppLayout } from '@/components/layout/AppLayout';
```

Verificar também se o import do `FormasPagamento` está exatamente assim (o arquivo existe em `src/pages/FormasPagamento.tsx`):
```tsx
import FormasPagamento from '@/pages/FormasPagamento';
```
Se não estiver, adicionar essa linha junto com os outros imports de páginas.

---

### CORREÇÃO 2 — `src/components/layout/AppLayout.tsx`: garantir named export

**Arquivo:** `src/components/layout/AppLayout.tsx`

Garantir que o componente está exportado como named export (com chaves), não default:
```tsx
// CORRETO — deve estar assim:
export function AppLayout() {
  ...
}

// ERRADO — se estiver assim, remover o default:
export default function AppLayout() {
```

Se estiver como `export default`, trocar para `export function` (sem o `default`).

---

### CORREÇÃO 3 — `src/pages/Vendas.tsx`: tipo errado no estado qtdeInput

**Problema:** O estado `qtdeInput` foi declarado como `string` mas a função `adicionarAoCarrinho` espera `number`.

**Arquivo:** `src/pages/Vendas.tsx`

**Passo 1** — Localizar a declaração do estado e corrigir o tipo:
```tsx
// ERRADO:
const [qtdeInput, setQtdeInput] = useState('');
const [qtdeInput, setQtdeInput] = useState('1');

// CORRETO:
const [qtdeInput, setQtdeInput] = useState<number>(1);
```

**Passo 2** — Localizar o `onChange` do Input de quantidade (por volta da linha 300) e corrigir:
```tsx
// ERRADO:
onChange={e => setQtdeInput(e.target.value)}

// CORRETO:
onChange={e => setQtdeInput(Number(e.target.value))}
```

**Passo 3** — Localizar as chamadas de `adicionarAoCarrinho` que passam `qtdeInput` e garantir que estão com `Number()`:
```tsx
// ERRADO:
adicionarAoCarrinho(modalQtde, qtdeInput)

// CORRETO:
adicionarAoCarrinho(modalQtde, Number(qtdeInput))
```
> Obs: Se o estado já foi corrigido para `number` no Passo 1, o `Number()` não é necessário — mas não causa erro deixar.

---

## VERIFICAÇÃO ADICIONAL — outros arquivos

Após corrigir os três itens acima, rodar `npm start` e verificar se aparecem novos erros. Os mais comuns em migrações desse tipo são:

### Possível erro: `useNavigate` / `useLocation` não importados
Se aparecer erro de `useNavigate` ou `useLocation` não definidos, verificar se os imports do `react-router-dom` estão presentes nos arquivos que os usam:
```tsx
import { useNavigate, useLocation } from 'react-router-dom';
```

### Possível erro: propriedades de objetos sem tipo definido
Se aparecer erro de `Property 'xxx' does not exist on type '{}'`, adicionar `as any` temporariamente:
```tsx
// Exemplo:
const usuario = JSON.parse(localStorage.getItem('usuario') || '{}') as any;
```

### Possível erro: evento de formulário sem tipo
Se aparecer `Parameter 'e' implicitly has an 'any' type`:
```tsx
// Adicionar tipo no evento:
onChange={(e: React.ChangeEvent<HTMLInputElement>) => ...}
onChange={(e: React.ChangeEvent<HTMLSelectElement>) => ...}
```

### Possível erro: `children` em componentes
Se aparecer erro de `children` em componentes customizados:
```tsx
// Adicionar na interface do componente:
interface Props {
  children: React.ReactNode;
}
```

---

## INSTRUÇÃO GERAL PARA O CLAUDE CODE

1. Aplicar as 3 correções obrigatórias descritas acima
2. Rodar `npm start` após as correções
3. Se aparecerem novos erros de TypeScript, corrigi-los usando as dicas da seção "Verificação Adicional"
4. O objetivo é ter `npm start` rodando sem nenhum erro de compilação
5. **Não alterar** a lógica de negócio, chamadas de API ou estrutura visual — apenas corrigir os erros de tipo TypeScript

---

*Após aplicar todas as correções, o sistema deve abrir em `http://localhost:3000` sem erros no terminal.*
