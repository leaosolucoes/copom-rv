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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Dados básicos */}
                {data.nomeDaMae && (
                  <div className="p-3 bg-muted rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">Nome da Mãe</label>
                    <p className="text-lg font-semibold">{data.nomeDaMae}</p>
                  </div>
                )}
                
                {data.documento && (
                  <div className="p-3 bg-muted rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">Documento</label>
                    <p className="text-lg font-semibold">{data.documento}</p>
                  </div>
                )}
                
                {data.anos && (
                  <div className="p-3 bg-muted rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">Idade</label>
                    <p className="text-lg font-semibold">{data.anos} anos</p>
                  </div>
                )}
                
                {data.zodiaco && (
                  <div className="p-3 bg-muted rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">Signo</label>
                    <p className="text-lg font-semibold">{data.zodiaco}</p>
                  </div>
                )}
                
                {data.salarioEstimado && (
                  <div className="p-3 bg-muted rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">Salário Estimado</label>
                    <p className="text-lg font-semibold">R$ {data.salarioEstimado}</p>
                  </div>
                )}
                
                {data.lastUpdate && (
                  <div className="p-3 bg-muted rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">Última Atualização</label>
                    <p className="text-lg font-semibold">{data.lastUpdate}</p>
                  </div>
                )}
              </div>
              
              {/* Telefones */}
              {data.listaTelefones && Array.isArray(data.listaTelefones) && data.listaTelefones.length > 0 && (
                <div className="space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">Telefones</label>
                    <div className="mt-2 space-y-1">
                      {data.listaTelefones.map((telefone: any, index: number) => (
                        <p key={index} className="text-lg font-semibold">
                          {typeof telefone === 'object' ? 
                            `${telefone.telefone || telefone.numero || 'N/A'} ${telefone.tipo ? `(${telefone.tipo})` : ''}` 
                            : telefone
                          }
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Emails */}
              {data.listaEmails && Array.isArray(data.listaEmails) && data.listaEmails.length > 0 && (
                <div className="space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">E-mails</label>
                    <div className="mt-2 space-y-1">
                      {data.listaEmails.map((email: any, index: number) => (
                        <p key={index} className="text-lg font-semibold">
                          {typeof email === 'object' ? email.email || email.endereco : email}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Endereços */}
              {data.listaEnderecos && Array.isArray(data.listaEnderecos) && data.listaEnderecos.length > 0 && (
                <div className="space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">Endereços</label>
                    <div className="mt-2 space-y-2">
                      {data.listaEnderecos.map((endereco: any, index: number) => (
                        <div key={index} className="border-l-4 border-primary pl-3">
                          <p className="text-lg font-semibold">
                            {typeof endereco === 'object' ? 
                              `${endereco.logradouro || endereco.rua || ''} ${endereco.numero || ''}, ${endereco.bairro || ''} - ${endereco.cidade || ''}, ${endereco.estado || endereco.uf || ''} ${endereco.cep || ''}`.trim() 
                              : endereco
                            }
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};