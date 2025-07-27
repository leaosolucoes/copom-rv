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
      
      console.log('=== DADOS RECEBIDOS DA API CPF ===');
      console.log('Result completo:', result);
      console.log('Result stringified:', JSON.stringify(result, null, 2));
      
      if (!result) {
        throw new Error('Resposta vazia da API');
      }
      
      if (result.error) {
        setError(result.error);
        toast({
          title: "CPF não encontrado",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      // Verificar se a API retornou status false ou erro
      if (result.status === false) {
        throw new Error(result.return || 'CPF não encontrado');
      }

      // Os dados estão dentro de result.result conforme estrutura da API
      let cpfData = result.result;
      
      if (!cpfData) {
        console.log('Tentando acessar diretamente result:', result);
        // Se não encontrar em result, verifica se os dados estão diretamente no result
        if (result.nomeCompleto || result.documento || result.codigoPessoa) {
          cpfData = result;
        } else {
          throw new Error('Dados do CPF não encontrados na resposta da API');
        }
      }
      
      console.log('=== DADOS FINAIS PARA EXIBIR ===');
      console.log('cpfData:', cpfData);
      console.log('cpfData stringified:', JSON.stringify(cpfData, null, 2));
      
      // Log de cada campo específico
      console.log('nomeCompleto:', cpfData.nomeCompleto);
      console.log('nome:', cpfData.nome);
      console.log('documento:', cpfData.documento);
      console.log('cpf:', cpfData.cpf);
      
      // Verificar se há dados válidos na resposta
      if (!cpfData || Object.keys(cpfData).length === 0) {
        throw new Error('Nenhum dado encontrado para este CPF');
      }

      setData(cpfData);
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
            <div className="space-y-6">
              {/* Dados Pessoais */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Dados Pessoais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">Nome Completo</label>
                    <p className="text-lg font-semibold">{data.nomeCompleto || "Não informado"}</p>
                  </div>
                  
                  <div className="p-3 bg-muted rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">Documento (CPF)</label>
                    <p className="text-lg font-semibold">{data.documento || "Não informado"}</p>
                  </div>
                  
                  <div className="p-3 bg-muted rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">Gênero</label>
                    <p className="text-lg font-semibold">{data.genero || "Não informado"}</p>
                  </div>
                  
                  <div className="p-3 bg-muted rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">Data de Nascimento</label>
                    <p className="text-lg font-semibold">{data.dataDeNascimento || "Não informado"}</p>
                  </div>
                  
                  <div className="p-3 bg-muted rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">Idade</label>
                    <p className="text-lg font-semibold">{data.anos ? `${data.anos} anos` : "Não informado"}</p>
                  </div>
                  
                  <div className="p-3 bg-muted rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">Nome da Mãe</label>
                    <p className="text-lg font-semibold">{data.nomeDaMae || "Não informado"}</p>
                  </div>
                </div>
              </div>

              {/* Lista de Telefones */}
              {data.listaTelefones && Array.isArray(data.listaTelefones) && data.listaTelefones.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Telefones</h3>
                  <div className="grid gap-3">
                    {data.listaTelefones.map((telefone: any, index: number) => (
                      <div key={index} className="p-3 bg-muted rounded-lg">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Telefone:</span>
                            <p className="font-semibold">{telefone.telefoneComDDD || "Não informado"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Operadora:</span>
                            <p className="font-semibold">{telefone.operadora || "Não informado"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Tipo:</span>
                            <p className="font-semibold">{telefone.tipoTelefone || "Não informado"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">WhatsApp:</span>
                            <p className="font-semibold">{telefone.whatsApp ? "Sim" : "Não"}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lista de Endereços */}
              {data.listaEnderecos && Array.isArray(data.listaEnderecos) && data.listaEnderecos.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Endereços</h3>
                  <div className="grid gap-3">
                    {data.listaEnderecos.map((endereco: any, index: number) => (
                      <div key={index} className="p-3 bg-muted rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Logradouro:</span>
                            <p className="font-semibold">{endereco.logradouro || "Não informado"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Número:</span>
                            <p className="font-semibold">{endereco.numero || "Não informado"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Complemento:</span>
                            <p className="font-semibold">{endereco.complemento || "Não informado"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Bairro:</span>
                            <p className="font-semibold">{endereco.bairro || "Não informado"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Cidade:</span>
                            <p className="font-semibold">{endereco.cidade || "Não informado"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">UF:</span>
                            <p className="font-semibold">{endereco.uf || "Não informado"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">CEP:</span>
                            <p className="font-semibold">{endereco.cep || "Não informado"}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lista de E-mails */}
              {data.listaEmails && Array.isArray(data.listaEmails) && data.listaEmails.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">E-mails</h3>
                  <div className="grid gap-2">
                    {data.listaEmails.map((emailItem: any, index: number) => (
                      <div key={index} className="p-3 bg-muted rounded-lg">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Endereço de Email:</span>
                          <p className="font-semibold">{emailItem.enderecoEmail || "Não informado"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Última Atualização */}
              {data.lastUpdate && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Informações do Sistema</h3>
                  <div className="p-3 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground">Última Atualização:</span>
                    <p className="font-semibold">{data.lastUpdate}</p>
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