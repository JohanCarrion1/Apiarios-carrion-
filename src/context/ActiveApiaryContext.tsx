import { createContext, useContext, useState, ReactNode } from 'react';

interface ActiveApiaryContextType {
  activeApiaryId: string | null;
  setActiveApiaryId: (id: string | null) => void;
}

const ActiveApiaryContext = createContext<ActiveApiaryContextType | undefined>(undefined);

export function ActiveApiaryProvider({ children }: { children: ReactNode }) {
  const [activeApiaryId, setActiveApiaryId] = useState<string | null>(null);

  return (
    <ActiveApiaryContext.Provider value={{ activeApiaryId, setActiveApiaryId }}>
      {children}
    </ActiveApiaryContext.Provider>
  );
}

export function useActiveApiary() {
  const context = useContext(ActiveApiaryContext);
  if (context === undefined) {
    throw new Error('useActiveApiary must be used within an ActiveApiaryProvider');
  }
  return context;
}
