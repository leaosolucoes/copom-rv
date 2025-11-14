import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useRef } from "react";

interface HeaderProps {
  showLoginButton?: boolean;
  logoUrl?: string;
}

export const Header = ({ showLoginButton = true, logoUrl }: HeaderProps) => {
  const navigate = useNavigate();
  const tapCountRef = useRef(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Usar logo do index.html ao invés de importar
  const defaultLogo = "https://storage.googleapis.com/gpt-engineer-file-uploads/4uXswqzJLiaTm5vJMhIP1odvtru2/uploads/1762222738013-2º BPM RIO VERDE (1).png";
  
  const handleLogoClick = () => {
    tapCountRef.current += 1;
    
    // Limpar timeout anterior
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }
    
    // Se chegou a 3 toques, redirecionar
    if (tapCountRef.current === 3) {
      tapCountRef.current = 0;
      navigate('/acesso');
      return;
    }
    
    // Resetar contador após 2 segundos
    tapTimeoutRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, 2000);
  };
  
  return (
    <header className="bg-gradient-header shadow-header border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <img 
                src={logoUrl || defaultLogo} 
                alt="Logo 2º BPM" 
                className="h-24 w-auto cursor-pointer select-none" 
                onClick={handleLogoClick}
                onTouchStart={(e) => {
                  e.preventDefault();
                  handleLogoClick();
                }}
              />
              <div className="text-white">
                <h1 className="text-xl font-bold">2º BPM - PMGO - COPOM - RIO VERDE</h1>
                <p className="text-sm opacity-90">Sistema de Denúncias</p>
              </div>
            </div>
          </div>

          {showLoginButton && (
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              onClick={() => (window.location.href = "/acesso")}
            >
              <Users className="h-4 w-4 mr-2" />
              Acesso Interno
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
