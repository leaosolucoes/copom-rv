import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Loader2, User, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CPFData {
  [key: string]: any; // Aceita qualquer estrutura JSON
}

export const CPFLookup = () => {
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CPFData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const formatCPF = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Aplica a máscara XXX.XXX.XXX-XX
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    
    return numbers.slice(0, 11).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const validateCPF = (cpf: string) => {
    const numbers = cpf.replace(/\D/g, '');
    return numbers.length === 11;
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setCpf(formatted);
    setError(null);
  };

  const handleSearch = async () => {
    if (!validateCPF(cpf)) {
      setError('CPF deve conter 11 dígitos');
      toast({
        title: 'CPF inválido',
        description: 'Por favor, insira um CPF válido com 11 dígitos',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cpfNumbers = cpf.replace(/\D/g, ''); // Remove todos os caracteres não numéricos
      
      // Usar a Edge Function - mesmo padrão do CEP
      const response = await fetch('https://smytdnkylauxocqrkchn.supabase.co/functions/v1/search-cpf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cpf: cpfNumbers })
      });
      
      if (!response.ok) {
        throw new Error(`Erro na consulta: ${response.status}`);
      }

      const result = await response.json();
      
      console.log('Dados recebidos da API:', result);
      
      if (result.error) {
        setError(result.error);
        toast({
          title: "CPF não encontrado",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      // Verificar se há dados válidos na resposta
      if (!result.data || Object.keys(result.data).length === 0) {
        throw new Error('Nenhum dado encontrado para este CPF');
      }

      setData(result.data);
      setIsModalOpen(true);
      
      toast({
        title: 'Consulta realizada',
        description: 'Dados do CPF encontrados com sucesso',
      });
    } catch (error: any) {
      console.error('Erro na consulta CPF:', error);
      setError(error.message || 'Erro na consulta do CPF');
      toast({
        title: 'Erro na consulta',
        description: error.message || 'Não foi possível consultar o CPF',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Consulta de CPF
          </CardTitle>
          <CardDescription>
            Digite o CPF para consultar informações cadastrais da pessoa física
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <div className="flex gap-2">
              <Input
                id="cpf"
                type="text"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={handleCPFChange}
                onKeyPress={handleKeyPress}
                maxLength={14}
                className={error ? 'border-destructive' : ''}
              />
              <Button 
                onClick={handleSearch} 
                disabled={loading || !cpf}
                className="min-w-[100px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Consultando...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Consultar
                  </>
                )}
              </Button>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dados do CPF</DialogTitle>
            <DialogDescription>
              Informações cadastrais encontradas para o CPF {cpf}
            </DialogDescription>
          </DialogHeader>
          
          
          {data && (
            <div className="space-y-4">
              {/* Exibir todos os dados da API de forma dinâmica */}
              {Object.entries(data).map(([key, value]) => {
                if (value === null || value === undefined || value === '') return null;
                
                return (
                  <div key={key} className="space-y-2">
                    <h3 className="font-semibold text-lg border-b pb-1 capitalize">
                      {key.replace(/_/g, ' ')}
                    </h3>
                    
                    {typeof value === 'object' && !Array.isArray(value) ? (
                      // Se for um objeto, exibir suas propriedades
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
                        {Object.entries(value).map(([subKey, subValue]) => {
                          if (subValue === null || subValue === undefined || subValue === '') return null;
                          
                          return (
                            <div key={subKey}>
                              <Label className="font-medium capitalize">
                                {subKey.replace(/_/g, ' ')}
                              </Label>
                              <p className="text-sm">{String(subValue)}</p>
                            </div>
                          );
                        })}
                      </div>
                    ) : Array.isArray(value) ? (
                      // Se for um array, exibir cada item
                      <div className="ml-4">
                        <Label className="font-medium capitalize">
                          {key.replace(/_/g, ' ')}
                        </Label>
                        {value.map((item, index) => (
                          <p key={index} className="text-sm">
                            {typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)}
                          </p>
                        ))}
                      </div>
                    ) : (
                      // Se for um valor simples
                      <div className="ml-4">
                        <Label className="font-medium capitalize">
                          {key.replace(/_/g, ' ')}
                        </Label>
                        <p className="text-sm">{String(value)}</p>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Seção com dados brutos para debug */}
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold text-lg border-b pb-1 mb-2">Dados Completos (JSON)</h3>
                <pre className="text-xs overflow-auto max-h-40 bg-background p-2 rounded border">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};