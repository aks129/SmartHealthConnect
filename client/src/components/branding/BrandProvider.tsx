import { createContext, useContext, useEffect, useState } from 'react';

// Define brand themes
export interface BrandTheme {
  id: string;
  name: string;
  description: string;
  logo?: string;
  colors: {
    primary: string;
    primaryForeground: string;
    accent: string;
    accentForeground: string;
  };
  cssVariables: {
    '--primary': string;
    '--primary-foreground': string;
    '--accent': string;
    '--accent-foreground': string;
    '--ring': string;
  };
}

export const brandThemes: BrandTheme[] = [
  {
    id: 'default',
    name: 'Liara Health',
    description: 'Default blue healthcare theme',
    colors: {
      primary: '#2563eb',
      primaryForeground: '#ffffff',
      accent: '#3b82f6',
      accentForeground: '#ffffff',
    },
    cssVariables: {
      '--primary': '221.2 83.2% 53.3%',
      '--primary-foreground': '210 40% 98%',
      '--accent': '217.2 91.2% 59.8%',
      '--accent-foreground': '222.2 47.4% 11.2%',
      '--ring': '221.2 83.2% 53.3%',
    },
  },
  {
    id: 'hospital-red',
    name: 'Hospital Red',
    description: 'Classic hospital red theme',
    colors: {
      primary: '#dc2626',
      primaryForeground: '#ffffff',
      accent: '#ef4444',
      accentForeground: '#ffffff',
    },
    cssVariables: {
      '--primary': '0 84.2% 60.2%',
      '--primary-foreground': '0 0% 98%',
      '--accent': '0 84.2% 60.2%',
      '--accent-foreground': '0 0% 98%',
      '--ring': '0 84.2% 60.2%',
    },
  },
  {
    id: 'clinic-green',
    name: 'Clinic Green',
    description: 'Fresh green clinic theme',
    colors: {
      primary: '#16a34a',
      primaryForeground: '#ffffff',
      accent: '#22c55e',
      accentForeground: '#ffffff',
    },
    cssVariables: {
      '--primary': '142.1 76.2% 36.3%',
      '--primary-foreground': '355.7 100% 97.3%',
      '--accent': '142.1 70.6% 45.3%',
      '--accent-foreground': '144.9 80.4% 10%',
      '--ring': '142.1 76.2% 36.3%',
    },
  },
  {
    id: 'wellness-purple',
    name: 'Wellness Purple',
    description: 'Calming purple wellness theme',
    colors: {
      primary: '#7c3aed',
      primaryForeground: '#ffffff',
      accent: '#8b5cf6',
      accentForeground: '#ffffff',
    },
    cssVariables: {
      '--primary': '262.1 83.3% 57.8%',
      '--primary-foreground': '210 40% 98%',
      '--accent': '263.4 70% 50.4%',
      '--accent-foreground': '210 40% 98%',
      '--ring': '262.1 83.3% 57.8%',
    },
  },
  {
    id: 'medical-teal',
    name: 'Medical Teal',
    description: 'Professional teal medical theme',
    colors: {
      primary: '#0d9488',
      primaryForeground: '#ffffff',
      accent: '#14b8a6',
      accentForeground: '#ffffff',
    },
    cssVariables: {
      '--primary': '173.4 80.4% 40%',
      '--primary-foreground': '166.1 76.5% 96.7%',
      '--accent': '172.5 66% 50.4%',
      '--accent-foreground': '171.8 77% 6.5%',
      '--ring': '173.4 80.4% 40%',
    },
  },
  {
    id: 'corporate-navy',
    name: 'Corporate Navy',
    description: 'Professional navy enterprise theme',
    colors: {
      primary: '#1e40af',
      primaryForeground: '#ffffff',
      accent: '#3b82f6',
      accentForeground: '#ffffff',
    },
    cssVariables: {
      '--primary': '224.3 76.3% 48%',
      '--primary-foreground': '226 100% 97.1%',
      '--accent': '217.2 91.2% 59.8%',
      '--accent-foreground': '222.2 47.4% 11.2%',
      '--ring': '224.3 76.3% 48%',
    },
  },
];

interface BrandContextType {
  currentBrand: BrandTheme;
  setBrand: (brandId: string) => void;
  availableBrands: BrandTheme[];
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

const BRAND_STORAGE_KEY = 'liara-brand-theme';

interface BrandProviderProps {
  children: React.ReactNode;
  defaultBrand?: string;
}

export function BrandProvider({ children, defaultBrand = 'default' }: BrandProviderProps) {
  const [currentBrand, setCurrentBrand] = useState<BrandTheme>(() => {
    // Check localStorage for saved brand
    const saved = localStorage.getItem(BRAND_STORAGE_KEY);
    if (saved) {
      const found = brandThemes.find(b => b.id === saved);
      if (found) return found;
    }
    return brandThemes.find(b => b.id === defaultBrand) || brandThemes[0];
  });

  // Apply CSS variables when brand changes
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(currentBrand.cssVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Save to localStorage
    localStorage.setItem(BRAND_STORAGE_KEY, currentBrand.id);
  }, [currentBrand]);

  const setBrand = (brandId: string) => {
    const brand = brandThemes.find(b => b.id === brandId);
    if (brand) {
      setCurrentBrand(brand);
    }
  };

  return (
    <BrandContext.Provider value={{ currentBrand, setBrand, availableBrands: brandThemes }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
}
