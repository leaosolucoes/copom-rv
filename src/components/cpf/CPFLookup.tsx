import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Loader2, User, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logConsultation } from '@/lib/auditLogger';
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

interface CPFData {
  [key: string]: any; // Aceita qualquer estrutura JSON
}

// Componente de marca d'água diagonal
const WatermarkOverlay = ({ userName }: { userName: string }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      <div className="absolute inset-0 grid grid-cols-3 gap-8 opacity-10">
        {Array.from({ length: 15 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center justify-center h-full"
            style={{
              transform: 'rotate(-45deg)',
              transformOrigin: 'center',
            }}
          >
            <span className="text-foreground text-2xl font-bold whitespace-nowrap">
              {userName}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const CPFLookup = () => {
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CPFData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { profile } = useSupabaseAuth();

  // Log dos dados quando mudarem
  useEffect(() => {
    if (data) {
      console.log('=== RENDERIZANDO MODAL COM DATA ===', data);
      console.log('data.nomeCompleto no modal:', data.nomeCompleto);
      console.log('data.documento no modal:', data.documento);
      console.log('JSON do data no modal:', JSON.stringify(data, null, 2));
      
      // VERIFICAR ESTRUTURA REAL DOS DADOS
      console.log('Todas as keys do data:', Object.keys(data));
      console.log('Verificando se data é um objeto:', typeof data);
    }
  }, [data]);

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
      console.log('Tipo do result:', typeof result);
      console.log('Keys do result:', Object.keys(result));
      
      if (!result) {
        console.log('ERRO: Result é null/undefined');
        throw new Error('Resposta vazia da API');
      }
      
      if (result.error) {
        console.log('ERRO: Result contém erro:', result.error);
        setError(result.error);
        toast({
          title: "CPF não encontrado",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      // Verificar se a API retornou status false
      if (result.status === false) {
        console.log('ERRO: Status false da API:', result.return);
        throw new Error(result.return || 'CPF não encontrado');
      }

      console.log('=== VERIFICANDO DADOS ===');
      console.log('result.result existe?', !!result.result);
      console.log('result.result:', result.result);
      console.log('result.data existe?', !!result.data);
      console.log('result.data:', result.data);

      // CORREÇÃO DEFINITIVA: Baseado nos logs, os dados estão sempre em result.result
      let cpfData = result.result;
      
      console.log('=== DADOS SELECIONADOS ===');
      console.log('cpfData (result.result):', cpfData);
      console.log('cpfData existe?', !!cpfData);
      console.log('cpfData tipo:', typeof cpfData);
      
      // Se result.result não existe, tentar outras estruturas
      if (!cpfData) {
        console.log('TENTATIVA 2: Verificando result.data');
        if (result.data && typeof result.data === 'object') {
          cpfData = result.data;
          console.log('SUCESSO: Dados encontrados em result.data');
        } else {
          console.log('TENTATIVA 3: Verificando dados direto no result');
          if (result.nomeCompleto || result.documento || result.codigoPessoa) {
            cpfData = result;
            console.log('SUCESSO: Dados encontrados diretamente no result');
          } else {
            console.log('ERRO: Nenhuma estrutura de dados válida encontrada');
            throw new Error('Dados do CPF não encontrados na resposta da API');
          }
        }
      } else {
        console.log('SUCESSO: Dados encontrados em result.result');
      }
      
      console.log('=== DADOS FINAIS PARA EXIBIR ===');
      console.log('cpfData final:', cpfData);
      console.log('cpfData stringified:', JSON.stringify(cpfData, null, 2));
      console.log('Keys do cpfData:', cpfData ? Object.keys(cpfData) : 'cpfData é null');
      
      // VALIDAÇÃO SIMPLIFICADA: Se chegou até aqui e cpfData existe, é válido
      if (!cpfData || typeof cpfData !== 'object') {
        console.log('ERRO: cpfData não é um objeto válido');
        throw new Error('Nenhum dado válido encontrado para este CPF');
      }
      
      console.log('SUCESSO: Dados considerados válidos, abrindo modal');
      console.log('=== DADOS QUE SERÃO PASSADOS PARA O MODAL ===');
      console.log('cpfData final antes de setData:', cpfData);
      console.log('cpfData.nomeCompleto:', cpfData.nomeCompleto);
      console.log('cpfData.documento:', cpfData.documento);
      console.log('cpfData.genero:', cpfData.genero);
      console.log('cpfData.dataDeNascimento:', cpfData.dataDeNascimento);
      console.log('cpfData.nomeDaMae:', cpfData.nomeDaMae);
      console.log('cpfData.anos:', cpfData.anos);
      
      setData(cpfData);
      setIsModalOpen(true);
      
      toast({
        title: 'Consulta realizada',
        description: 'Dados do CPF encontrados com sucesso',
      });
      
      // Registrar auditoria
      await logConsultation({
        consultationType: 'CPF',
        searchedData: cpfNumbers,
        searchResult: cpfData,
        success: true
      });
    } catch (error: any) {
      console.error('Erro na consulta CPF:', error);
      setError(error.message || 'Erro na consulta do CPF');
      toast({
        title: 'Erro na consulta',
        description: error.message || 'Não foi possível consultar o CPF',
        variant: 'destructive',
      });
      
      // Registrar auditoria de erro
      await logConsultation({
        consultationType: 'CPF',
        searchedData: cpf.replace(/\D/g, ''),
        success: false,
        errorMessage: error.message || 'Erro desconhecido'
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto relative">{" "}
          {/* Marca d'água diagonal */}
          {profile?.full_name && (
            <WatermarkOverlay userName={profile.full_name} />
          )}
          
          <DialogHeader className="relative z-20">
            <DialogTitle>Dados do CPF</DialogTitle>
            <DialogDescription>
              Informações cadastrais encontradas para o CPF {cpf}
            </DialogDescription>
          </DialogHeader>
          
          
          {data && (
            <div className="space-y-6 relative z-20">
              {/* Dados Pessoais */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Dados Pessoais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">Nome Completo</label>
                    <p className="text-lg font-semibold">
                      {data?.nomeCompleto || data?.result?.nomeCompleto || (typeof data === 'string' ? JSON.parse(data)?.nomeCompleto : null) || "Não informado"}
                    </p>
                  </div>
                  
                  <div className="p-3 bg-muted rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">Documento (CPF)</label>
                    <p className="text-lg font-semibold">
                      {data?.documento || data?.codigoPessoa || data?.result?.documento || data?.result?.codigoPessoa || 
                       (typeof data === 'string' ? JSON.parse(data)?.documento : null) || "Não informado"}
                    </p>
                  </div>
                  
                  <div className="p-3 bg-muted rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">Gênero</label>
                    <p className="text-lg font-semibold">
                      {data?.genero || data?.result?.genero || (typeof data === 'string' ? JSON.parse(data)?.genero : null) || "Não informado"}
                    </p>
                  </div>
                  
                  <div className="p-3 bg-muted rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">Data de Nascimento</label>
                    <p className="text-lg font-semibold">
                      {data?.dataDeNascimento || data?.result?.dataDeNascimento || 
                       (typeof data === 'string' ? JSON.parse(data)?.dataDeNascimento : null) || "Não informado"}
                    </p>
                  </div>
                  
                  <div className="p-3 bg-muted rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">Idade</label>
                    <p className="text-lg font-semibold">
                      {(data?.anos || data?.result?.anos) 
                       ? `${data?.anos || data?.result?.anos} anos` : "Não informado"}
                    </p>
                  </div>
                  
                  <div className="p-3 bg-muted rounded-lg">
                    <label className="text-sm font-medium text-muted-foreground">Nome da Mãe</label>
                    <p className="text-lg font-semibold">
                      {data?.nomeDaMae || data?.result?.nomeDaMae || 
                       (typeof data === 'string' ? JSON.parse(data)?.nomeDaMae : null) || "Não informado"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Lista de Telefones */}
              {(data?.listaTelefones || data?.result?.listaTelefones) && Array.isArray(data?.listaTelefones || data?.result?.listaTelefones) && (data?.listaTelefones || data?.result?.listaTelefones).length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Telefones</h3>
                  <div className="grid gap-3">
                    {(data?.listaTelefones || data?.result?.listaTelefones).map((telefone: any, index: number) => (
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
              {(data?.listaEnderecos || data?.result?.listaEnderecos) && Array.isArray(data?.listaEnderecos || data?.result?.listaEnderecos) && (data?.listaEnderecos || data?.result?.listaEnderecos).length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Endereços</h3>
                  <div className="grid gap-3">
                    {(data?.listaEnderecos || data?.result?.listaEnderecos).map((endereco: any, index: number) => (
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
              {(data?.listaEmails || data?.result?.listaEmails) && Array.isArray(data?.listaEmails || data?.result?.listaEmails) && (data?.listaEmails || data?.result?.listaEmails).length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">E-mails</h3>
                  <div className="grid gap-2">
                    {(data?.listaEmails || data?.result?.listaEmails).map((emailItem: any, index: number) => (
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
              {(data?.lastUpdate || data?.result?.lastUpdate) && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Informações do Sistema</h3>
                  <div className="p-3 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground">Última Atualização:</span>
                    <p className="font-semibold">{data?.lastUpdate || data?.result?.lastUpdate}</p>
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