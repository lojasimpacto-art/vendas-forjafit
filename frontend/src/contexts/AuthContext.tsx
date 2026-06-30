import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';

interface Usuario {
  id: number;
  nome: string;
  login: string;
  trocar_senha: boolean;
}

interface Permissao {
  recurso: string;
  pode_ver: boolean;
  pode_criar: boolean;
  pode_editar: boolean;
  pode_excluir: boolean;
  pode_reabrir: boolean;
}

interface AuthContextType {
  usuario: Usuario | null;
  permissoes: Permissao[];
  carregando: boolean;
  login: (login: string, senha: string) => Promise<any>;
  logout: () => Promise<void>;
  temPermissao: (recurso: string, campo?: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const u = localStorage.getItem('usuario');
    if (token && u) {
      setUsuario(JSON.parse(u));
      api.get('/auth/me')
        .then(r => {
          setUsuario(r.data.usuario);
          setPermissoes(r.data.permissoes);
        })
        .catch(() => logout())
        .finally(() => setCarregando(false));
    } else {
      setCarregando(false);
    }
  }, []);

  const login = async (loginStr: string, senha: string) => {
    const { data } = await api.post('/auth/login', { login: loginStr, senha });
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    setUsuario(data.usuario);
    setPermissoes(data.permissoes);
    return data;
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
    setPermissoes([]);
  };

  const temPermissao = (recurso: string, campo: string = 'pode_ver') => {
    const p = permissoes.find(p => p.recurso === recurso);
    return p ? (p as any)[campo] : false;
  };

  return (
    <AuthContext.Provider value={{ usuario, permissoes, carregando, login, logout, temPermissao }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
};
