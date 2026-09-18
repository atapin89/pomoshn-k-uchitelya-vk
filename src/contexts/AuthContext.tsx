import { createContext, useContext, ReactNode } from 'react';
import { useVkAuth, VkUser } from '@/hooks/useVkAuth';

interface AuthContextType {
  user: VkUser | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useVkAuth();

  return (
    <AuthContext.Provider value={{ ...auth, isAuthenticated: !!auth.user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
