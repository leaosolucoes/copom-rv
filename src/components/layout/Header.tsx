import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo2bpm from "@/assets/logo-2bpm.png";

interface HeaderProps {
  showLoginButton?: boolean;
  logoUrl?: string;
}

export const Header = ({ showLoginButton = true, logoUrl }: HeaderProps) => {
  return (
    <header className="bg-gradient-header shadow-header border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <img src={logoUrl || logo2bpm} alt="Logo 2º BPM" className="h-16 w-auto" />
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
