import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SystemColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
}

const defaultColors: SystemColors = {
  primary: '#228B22',
  secondary: '#1F4E79',
  accent: '#FF6B35',
  background: '#F8F9FA'
};

export const useSystemColors = () => {
  const [colors, setColors] = useState<SystemColors>(defaultColors);
  const [loading, setLoading] = useState(true);

  const loadSystemColors = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'system_colors')
        .maybeSingle();

      if (error) throw error;

      if (data?.value) {
        const systemColors = data.value as unknown as SystemColors;
        setColors(systemColors);
        applyColorsToCSS(systemColors);
      } else {
        // Aplicar cores padrão se não existir configuração
        applyColorsToCSS(defaultColors);
      }
    } catch (error) {
      console.error('Erro ao carregar cores do sistema:', error);
      applyColorsToCSS(defaultColors);
    } finally {
      setLoading(false);
    }
  };

  const applyColorsToCSS = (systemColors: SystemColors) => {
    const root = document.documentElement;
    
    // Converter hex para HSL
    const hexToHsl = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }

      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    // Aplicar as cores customizadas
    root.style.setProperty('--primary', hexToHsl(systemColors.primary));
    root.style.setProperty('--primary-hover', hexToHsl(adjustBrightness(systemColors.primary, -10)));
    root.style.setProperty('--secondary', hexToHsl(systemColors.secondary));
    root.style.setProperty('--accent', hexToHsl(systemColors.accent));
    
    // Atualizar cores do header
    root.style.setProperty('--header-bg', hexToHsl(systemColors.primary));
    
    // Gradientes
    root.style.setProperty('--gradient-government', `linear-gradient(135deg, ${systemColors.primary}, ${adjustBrightness(systemColors.primary, 10)})`);
    root.style.setProperty('--gradient-header', `linear-gradient(90deg, ${adjustBrightness(systemColors.primary, -5)}, ${adjustBrightness(systemColors.primary, 5)})`);
    
    // Sombras com cor primária
    const primaryHsl = hexToHsl(systemColors.primary);
    root.style.setProperty('--shadow-soft', `0 2px 8px hsl(${primaryHsl} / 0.08)`);
    root.style.setProperty('--shadow-form', `0 4px 12px hsl(${primaryHsl} / 0.12)`);
    root.style.setProperty('--shadow-header', `0 2px 4px hsl(${primaryHsl} / 0.15)`);
  };

  const adjustBrightness = (hex: string, percent: number) => {
    const num = parseInt(hex.slice(1), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    
    return `#${(0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255))
      .toString(16).slice(1)}`;
  };

  useEffect(() => {
    loadSystemColors();
  }, []);

  return {
    colors,
    loading,
    reloadColors: loadSystemColors
  };
};