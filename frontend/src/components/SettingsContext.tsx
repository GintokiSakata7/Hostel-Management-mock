import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface AppSettings {
  hostelName?: string;
  adminName?: string;
  hostelPhone?: string;
  hostelEmail?: string;
  hostelAddress?: string;
  upiId?: string;
  upiName?: string;
  monthlyFee?: number;
  securityDeposit?: number;
  lateFinePerDay?: number;
  dueDateDay?: number;
}

interface SettingsContextType {
  settings: AppSettings | null;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const refreshSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        setSettings(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch settings:', e);
    }
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
