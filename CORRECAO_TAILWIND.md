# CORREÇÃO — TAILWIND NÃO ESTÁ SENDO APLICADO
**Problema:** O sistema abre sem estilo visual. O Tailwind CSS não está carregando.  
**Causa:** O arquivo `src/index.js` não foi migrado e não importa o `index.css` corretamente.

---

## CORREÇÃO 1 — Verificar/corrigir `src/index.js` (ou migrar para `index.tsx`)

O arquivo `src/index.js` precisa importar o CSS e renderizar o App. Verificar se está assim:

```js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';   // ← Esta linha é obrigatória — sem ela o Tailwind não carrega
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Se o `import './index.css'` não estiver presente, adicionar.

---

## CORREÇÃO 2 — Verificar `src/index.css`

Confirmar que o arquivo `src/index.css` começa exatamente com estas três linhas:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Se não tiver essas três linhas no início, substituir o conteúdo completo do arquivo por:

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
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
}
```

---

## CORREÇÃO 3 — Verificar `tailwind.config.js`

Confirmar que o arquivo `tailwind.config.js` existe na raiz do `frontend/` e está assim:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html',
  ],
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
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
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

Se o arquivo não existir, criá-lo com o conteúdo acima.

---

## CORREÇÃO 4 — Verificar `postcss.config.js`

Confirmar que o arquivo `postcss.config.js` existe na raiz do `frontend/` com este conteúdo:

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

Se não existir, criá-lo.

---

## CORREÇÃO 5 — Verificar dependências instaladas

Rodar no terminal dentro de `frontend/`:

```bash
npm list tailwindcss postcss autoprefixer
```

Se algum aparecer como `(empty)` ou der erro, instalar:

```bash
npm install -D tailwindcss postcss autoprefixer
```

---

## APÓS TODAS AS CORREÇÕES

1. Parar o servidor (Ctrl+C no terminal do frontend)
2. Rodar novamente:
```bash
npm start
```

O layout deve aparecer com sidebar escura à esquerda, header branco no topo e cards estilizados no conteúdo.
