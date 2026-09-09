import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types/hive';
import { saveToStorage, loadFromStorage, removeFromStorage, STORAGE_KEYS } from '../utils/storage';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  register: (email: string, password: string, name?: string) => boolean;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Usuarios de prueba (en producción esto debería estar en un backend)
const DEMO_USERS = [
  { email: 'demo@apiarioscarrion.com', password: 'demo123', name: 'Usuario Demo' },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Cargar usuario desde localStorage al iniciar
    const savedUser = loadFromStorage<User>(STORAGE_KEYS.USER);
    if (savedUser) {
      setUser(savedUser);
    }
  }, []);

  const login = (email: string, password: string): boolean => {
    // Buscar en usuarios de prueba
    const foundUser = DEMO_USERS.find(
      u => u.email === email && u.password === password
    );

    if (foundUser) {
      const userData: User = { email: foundUser.email, name: foundUser.name };
      setUser(userData);
      saveToStorage(STORAGE_KEYS.USER, userData);
      return true;
    }

    // Verificar si el usuario está registrado en localStorage
    const registeredUsers = loadFromStorage<Array<{ email: string; password: string; name?: string }>>('panal_registered_users') || [];
    const registeredUser = registeredUsers.find(u => u.email === email && u.password === password);

    if (registeredUser) {
      const userData: User = { email: registeredUser.email, name: registeredUser.name };
      setUser(userData);
      saveToStorage(STORAGE_KEYS.USER, userData);
      return true;
    }

    return false;
  };

  const register = (email: string, password: string, name?: string): boolean => {
    // Verificar si el email ya existe
    const registeredUsers = loadFromStorage<Array<{ email: string; password: string; name?: string }>>('panal_registered_users') || [];
    
    if (registeredUsers.some(u => u.email === email)) {
      return false; // Email ya registrado
    }

    if (DEMO_USERS.some(u => u.email === email)) {
      return false; // Email ya existe en demo
    }

    // Registrar nuevo usuario
    const newUser = { email, password, name };
    registeredUsers.push(newUser);
    saveToStorage('panal_registered_users', registeredUsers);

    // Iniciar sesión automáticamente
    const userData: User = { email, name };
    setUser(userData);
    saveToStorage(STORAGE_KEYS.USER, userData);

    return true;
  };

  const logout = () => {
    setUser(null);
    removeFromStorage(STORAGE_KEYS.USER);
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      saveToStorage(STORAGE_KEYS.USER, updatedUser);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      register,
      logout,
      updateUser,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
