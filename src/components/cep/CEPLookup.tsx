import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Loader2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CEPData {
  resultado: string;
  uf: string;
  cidade: string;
  distrito: string;
  endereco: string;
  cep_consultado: string;
}

export function CEPLookup() {
  const [cep, setCep] = useState("");
  const [cepData, setCepData] = useState<CEPData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const formatCEP = (value: string): string => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 5) {
      return cleaned;
    }
    return cleaned.replace(/(\d{5})(\d{3})/, "$1-$2");
  };

  const validateCEP = (cep: string): boolean => {
    const cleaned = cep.replace(/\D/g, "");
    return cleaned.length === 8;
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedCep = formatCEP(e.target.value);
    setCep(formattedCep);
    setError("");
  };

  const handleSearch = async () => {
    if (!validateCEP(cep)) {
      setError("CEP deve ter 8 dígitos");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const cleanCep = cep.replace(/\D/g, "");
      console.log('CEP limpo para consulta:', cleanCep);
      
      // URL da API sem traços no CEP
      const apiUrl = `https://ws.hubdodesenvolvedor.com.br/v2/cep3/?cep=${cleanCep}&token=180482805qTZObEyXPz325856232`;
      console.log('URL da API:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors'
      });
      
      console.log('Status da resposta:', response.status);
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log('Dados recebidos:', data);
      
      if (data.resultado === "0") {
        setError("CEP não encontrado");
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP informado e tente novamente.",
          variant: "destructive",
        });
        return;
      }

      setCepData(data);
      setIsModalOpen(true);
      
      toast({
        title: "CEP encontrado!",
        description: "Dados do endereço carregados com sucesso.",
      });

    } catch (err) {
      console.error("Erro detalhado ao buscar CEP:", err);
      setError(`Erro ao consultar CEP: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      toast({
        title: "Erro na consulta",
        description: `Não foi possível consultar o CEP: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Consulta de CEP
          </CardTitle>
          <CardDescription>
            Digite o CEP para consultar informações do endereço
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Ex: 75901-060"
              value={cep}
              onChange={handleCepChange}
              onKeyPress={handleKeyPress}
              maxLength={9}
              className="flex-1"
            />
            <Button 
              onClick={handleSearch} 
              disabled={isLoading || !cep}
              className="px-6"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Dados do CEP {cepData?.cep_consultado}
            </DialogTitle>
          </DialogHeader>
          
          {cepData && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">CEP</label>
                    <p className="text-lg font-semibold">{cepData.cep_consultado}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">UF</label>
                    <p className="text-lg font-semibold">{cepData.uf}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">Cidade</label>
                    <p className="text-lg font-semibold">{cepData.cidade}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">Distrito</label>
                    <p className="text-lg font-semibold">{cepData.distrito || "Não informado"}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="p-3 bg-muted rounded-lg">
                  <label className="text-sm font-medium text-muted-foreground">Endereço</label>
                  <p className="text-lg font-semibold">{cepData.endereco}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}