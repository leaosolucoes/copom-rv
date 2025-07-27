import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { logConsultation } from "@/lib/auditLogger";
import { supabase } from "@/integrations/supabase/client";

interface CEPData {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
}

export function CEPLookup() {
  const [cep, setCep] = useState("");
  const [cepData, setCepData] = useState<CEPData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCEP = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 5) {
      return numbers;
    }
    return numbers.replace(/(\d{5})(\d{0,3})/, '$1-$2');
  };

  const validateCEP = (cep: string): boolean => {
    const cleanCep = cep.replace(/\D/g, '');
    return cleanCep.length === 8;
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCEP(e.target.value);
    setCep(formatted);
    if (error) setError(null);
  };

  const handleSearch = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    
    if (!validateCEP(cep)) {
      setError('CEP deve ter 8 dígitos');
      toast.error('CEP deve ter 8 dígitos');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Buscando CEP:', cleanCep);
      
      const { data, error } = await supabase.functions.invoke('search-cep', {
        body: { cep: cleanCep }
      });

      if (error) {
        console.error('Erro na função:', error);
        throw new Error(error.message || 'Erro ao consultar CEP');
      }

      console.log('Resposta da função CEP:', data);

      if (data.error) {
        setError(data.error);
        toast.error(data.error);
        
        // Registrar auditoria de erro
        await logConsultation({
          consultationType: 'CEP',
          searchedData: cleanCep,
          success: false,
          errorMessage: data.error
        });
        return;
      }

      console.log('Dados finais para exibir:', data);
      
      setCepData(data);
      setIsModalOpen(true);
      toast.success('CEP consultado com sucesso!');
      
      // Registrar auditoria
      await logConsultation({
        consultationType: 'CEP',
        searchedData: cleanCep,
        searchResult: data,
        success: true
      });

    } catch (err) {
      console.error("Erro detalhado ao buscar CEP:", err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(`Erro ao consultar CEP: ${errorMessage}`);
      toast.error(`Não foi possível consultar o CEP: ${errorMessage}`);
      
      // Registrar auditoria de erro
      await logConsultation({
        consultationType: 'CEP',
        searchedData: cleanCep,
        success: false,
        errorMessage: errorMessage
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
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <MapPin className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Consulta de CEP</CardTitle>
          <CardDescription>
            Digite o CEP para consultar informações de endereço
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="00000-000"
              value={cep}
              onChange={handleCepChange}
              onKeyPress={handleKeyPress}
              maxLength={9}
              className={error ? "border-red-500" : ""}
            />
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>
          
          <Button 
            onClick={handleSearch} 
            disabled={isLoading || !cep.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Consultando...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Consultar CEP
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Modal com dados do CEP */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Informações do CEP
            </DialogTitle>
          </DialogHeader>
          
          {cepData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">CEP:</label>
                  <p className="font-semibold">{cepData.cep}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">UF:</label>
                  <p className="font-semibold">{cepData.uf}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Cidade:</label>
                  <p className="font-semibold">{cepData.localidade}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Bairro:</label>
                  <p className="font-semibold">{cepData.bairro}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Logradouro:</label>
                  <p className="font-semibold">{cepData.logradouro}</p>
                </div>
                {cepData.complemento && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Complemento:</label>
                    <p className="font-semibold">{cepData.complemento}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}