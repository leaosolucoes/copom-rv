import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAudiencias } from '@/hooks/useAudiencias';
import { 
  FileText, 
  Calendar, 
  Clock, 
  User, 
  Search,
  Download,
  ExternalLink 
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatarDataBrasilComTimezone } from '@/utils/dataBrasil';

export const ListaAudiencias = () => {
  const { audiencias, isLoading } = useAudiencias();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  const filteredAudiencias = audiencias?.filter(audiencia => {
    const matchesSearch = 
      audiencia.numero_processo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      audiencia.vara.toLowerCase().includes(searchTerm.toLowerCase()) ||
      audiencia.user.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'todos' || audiencia.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Badge variant="outline" className="text-warning border-warning">Pendente</Badge>;
      case 'assinado':
        return <Badge variant="outline" className="text-success border-success">Assinado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleDownloadOficio = (url: string, numeroProcesso: string) => {
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carregando audiências...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Lista de Audiências
        </CardTitle>
        
        {/* Filtros */}
        <div className="flex gap-4 mt-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por processo, vara ou usuário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="assinado">Assinado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        {!filteredAudiencias || filteredAudiencias.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma audiência encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Processo</TableHead>
                  <TableHead>Vara</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAudiencias.map((audiencia) => (
                  <TableRow key={audiencia.id}>
                    <TableCell className="font-mono text-sm">
                      {audiencia.numero_processo}
                    </TableCell>
                    <TableCell>{audiencia.vara}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {formatarDataBrasilComTimezone(new Date(audiencia.data_audiencia + 'T00:00:00'))}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {audiencia.horario_audiencia}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{audiencia.user.full_name}</div>
                          <div className="text-sm text-muted-foreground">{audiencia.user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={audiencia.eh_presencial ? "default" : "secondary"}>
                        {audiencia.eh_presencial ? 'Presencial' : 'Videoconferência'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(audiencia.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadOficio(
                            `https://smytdnkylauxocqrkchn.supabase.co/storage/v1/object/public/oficios-audiencias/${audiencia.arquivo_oficio_url}`,
                            audiencia.numero_processo
                          )}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {!audiencia.eh_presencial && audiencia.link_videoconferencia && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(audiencia.link_videoconferencia!, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};