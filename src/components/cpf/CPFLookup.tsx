import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Loader2, User, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CPFData {
  nome?: string;
  cpf?: string;
  situacao_cpf?: string;
  data_nascimento?: string;
  sexo?: string;
  nacionalidade?: string;
  endereco?: {
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    cep?: string;
  };
  telefones?: string[];
  emails?: string[];
  rg?: {
    numero?: string;
    orgao_expedidor?: string;
    uf_expedicao?: string;
  };
  titulo_eleitor?: {
    numero?: string;
    zona?: string;
    secao?: string;
  };
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
      
      // Usar a Edge Function para evitar problemas de CORS
      const response = await fetch('/functions/v1/search-cpf', {
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
      
      if (result.error) {
        throw new Error(result.error);
      }

      setData(result);
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
              {/* Dados Pessoais */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg border-b pb-1">Dados Pessoais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.nome && (
                    <div>
                      <Label className="font-medium">Nome</Label>
                      <p className="text-sm">{data.nome}</p>
                    </div>
                  )}
                  {data.cpf && (
                    <div>
                      <Label className="font-medium">CPF</Label>
                      <p className="text-sm">{data.cpf}</p>
                    </div>
                  )}
                  {data.situacao_cpf && (
                    <div>
                      <Label className="font-medium">Situação CPF</Label>
                      <p className="text-sm">{data.situacao_cpf}</p>
                    </div>
                  )}
                  {data.data_nascimento && (
                    <div>
                      <Label className="font-medium">Data de Nascimento</Label>
                      <p className="text-sm">{data.data_nascimento}</p>
                    </div>
                  )}
                  {data.sexo && (
                    <div>
                      <Label className="font-medium">Sexo</Label>
                      <p className="text-sm">{data.sexo}</p>
                    </div>
                  )}
                  {data.nacionalidade && (
                    <div>
                      <Label className="font-medium">Nacionalidade</Label>
                      <p className="text-sm">{data.nacionalidade}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Endereço */}
              {data.endereco && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg border-b pb-1">Endereço</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {data.endereco.logradouro && (
                      <div>
                        <Label className="font-medium">Logradouro</Label>
                        <p className="text-sm">{data.endereco.logradouro}</p>
                      </div>
                    )}
                    {data.endereco.numero && (
                      <div>
                        <Label className="font-medium">Número</Label>
                        <p className="text-sm">{data.endereco.numero}</p>
                      </div>
                    )}
                    {data.endereco.complemento && (
                      <div>
                        <Label className="font-medium">Complemento</Label>
                        <p className="text-sm">{data.endereco.complemento}</p>
                      </div>
                    )}
                    {data.endereco.bairro && (
                      <div>
                        <Label className="font-medium">Bairro</Label>
                        <p className="text-sm">{data.endereco.bairro}</p>
                      </div>
                    )}
                    {data.endereco.cidade && (
                      <div>
                        <Label className="font-medium">Cidade</Label>
                        <p className="text-sm">{data.endereco.cidade}</p>
                      </div>
                    )}
                    {data.endereco.uf && (
                      <div>
                        <Label className="font-medium">UF</Label>
                        <p className="text-sm">{data.endereco.uf}</p>
                      </div>
                    )}
                    {data.endereco.cep && (
                      <div>
                        <Label className="font-medium">CEP</Label>
                        <p className="text-sm">{data.endereco.cep}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Contatos */}
              {(data.telefones || data.emails) && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg border-b pb-1">Contatos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {data.telefones && data.telefones.length > 0 && (
                      <div>
                        <Label className="font-medium">Telefones</Label>
                        {data.telefones.map((telefone, index) => (
                          <p key={index} className="text-sm">{telefone}</p>
                        ))}
                      </div>
                    )}
                    {data.emails && data.emails.length > 0 && (
                      <div>
                        <Label className="font-medium">E-mails</Label>
                        {data.emails.map((email, index) => (
                          <p key={index} className="text-sm">{email}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Documentos */}
              {(data.rg || data.titulo_eleitor) && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg border-b pb-1">Documentos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {data.rg && (
                      <div>
                        <Label className="font-medium">RG</Label>
                        <p className="text-sm">
                          {data.rg.numero}
                          {data.rg.orgao_expedidor && ` - ${data.rg.orgao_expedidor}`}
                          {data.rg.uf_expedicao && ` - ${data.rg.uf_expedicao}`}
                        </p>
                      </div>
                    )}
                    {data.titulo_eleitor && (
                      <div>
                        <Label className="font-medium">Título de Eleitor</Label>
                        <p className="text-sm">
                          {data.titulo_eleitor.numero}
                          {data.titulo_eleitor.zona && ` - Zona: ${data.titulo_eleitor.zona}`}
                          {data.titulo_eleitor.secao && ` - Seção: ${data.titulo_eleitor.secao}`}
                        </p>
                      </div>
                    )}
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