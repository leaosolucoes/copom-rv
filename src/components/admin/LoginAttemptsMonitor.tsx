import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, CheckCircle, XCircle, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LoginAttempt {
  id: string;
  created_at: string;
  ip_address: string | null;
  user_agent: string | null;
  email_attempted: string;
  success: boolean;
  failed_reason: string | null;
  captcha_required: boolean;
  captcha_completed: boolean;
  blocked: boolean;
  block_duration_seconds: number | null;
  geolocation: any;
  device_info: any;
  user_id: string | null;
}

interface Stats {
  total: number;
  successful: number;
  failed: number;
  blocked: number;
  captchaRequired: number;
}

export const LoginAttemptsMonitor = () => {
  const [attempts, setAttempts] = useState<LoginAttempt[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    successful: 0,
    failed: 0,
    blocked: 0,
    captchaRequired: 0
  });
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'1h' | '24h' | '7d' | 'all'>('24h');

  const fetchAttempts = async () => {
    try {
      setLoading(true);

      // Calcular data de início baseado no filtro
      let startDate = new Date();
      switch (timeFilter) {
        case '1h':
          startDate = new Date(Date.now() - 60 * 60 * 1000);
          break;
        case '24h':
          startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'all':
          startDate = new Date(0); // Todos os registros
          break;
      }

      const query = supabase
        .from('login_attempts')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      const { data, error } = await query;

      if (error) throw error;

      setAttempts(data || []);

      // Calcular estatísticas
      const newStats = {
        total: data?.length || 0,
        successful: data?.filter((a: LoginAttempt) => a.success).length || 0,
        failed: data?.filter((a: LoginAttempt) => !a.success && !a.blocked).length || 0,
        blocked: data?.filter((a: LoginAttempt) => a.blocked).length || 0,
        captchaRequired: data?.filter((a: LoginAttempt) => a.captcha_required).length || 0
      };

      setStats(newStats);
    } catch (error) {
      console.error('Erro ao buscar tentativas de login:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttempts();

    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchAttempts, 30000);

    return () => clearInterval(interval);
  }, [timeFilter]);

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('login-attempts-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'login_attempts'
        },
        () => {
          fetchAttempts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [timeFilter]);

  const getStatusIcon = (attempt: LoginAttempt) => {
    if (attempt.blocked) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    if (attempt.success) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  };

  const getStatusBadge = (attempt: LoginAttempt) => {
    if (attempt.blocked) {
      return <Badge variant="destructive">Bloqueado</Badge>;
    }
    if (attempt.success) {
      return <Badge className="bg-green-500">Sucesso</Badge>;
    }
    return <Badge variant="secondary">Falha</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Tentativas no período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              Sucesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.successful}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? `${((stats.successful / stats.total) * 100).toFixed(1)}%` : '0%'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              Falhas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.failed}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? `${((stats.failed / stats.total) * 100).toFixed(1)}%` : '0%'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-600">
              <XCircle className="h-4 w-4" />
              Bloqueados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.blocked}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? `${((stats.blocked / stats.total) * 100).toFixed(1)}%` : '0%'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-600">
              <Shield className="h-4 w-4" />
              CAPTCHA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.captchaRequired}</div>
            <p className="text-xs text-muted-foreground">Verificações exigidas</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de tentativas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Histórico de Tentativas de Login
              </CardTitle>
              <CardDescription>
                Monitoramento em tempo real de todas as tentativas de acesso ao sistema
              </CardDescription>
            </div>
            
            {/* Filtro de tempo */}
            <div className="flex gap-2">
              <button
                onClick={() => setTimeFilter('1h')}
                className={`px-3 py-1 text-sm rounded ${
                  timeFilter === '1h' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                }`}
              >
                1 hora
              </button>
              <button
                onClick={() => setTimeFilter('24h')}
                className={`px-3 py-1 text-sm rounded ${
                  timeFilter === '24h' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                }`}
              >
                24 horas
              </button>
              <button
                onClick={() => setTimeFilter('7d')}
                className={`px-3 py-1 text-sm rounded ${
                  timeFilter === '7d' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                }`}
              >
                7 dias
              </button>
              <button
                onClick={() => setTimeFilter('all')}
                className={`px-3 py-1 text-sm rounded ${
                  timeFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                }`}
              >
                Tudo
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Carregando...</p>
            </div>
          ) : attempts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma tentativa de login registrada no período selecionado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Status</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>CAPTCHA</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attempts.map((attempt) => (
                    <TableRow key={attempt.id}>
                      <TableCell>{getStatusIcon(attempt)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm">
                            {format(new Date(attempt.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(attempt.created_at), 'HH:mm:ss', { locale: ptBR })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{attempt.email_attempted}</TableCell>
                      <TableCell className="font-mono text-sm">{attempt.ip_address || '-'}</TableCell>
                      <TableCell>
                        {attempt.geolocation && typeof attempt.geolocation === 'object' ? (
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3" />
                            <span>
                              {attempt.geolocation.city || '-'}, {attempt.geolocation.country || '-'}
                            </span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {attempt.captcha_required ? (
                          <Badge variant={attempt.captcha_completed ? 'default' : 'secondary'}>
                            {attempt.captcha_completed ? 'Completado' : 'Exigido'}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {getStatusBadge(attempt)}
                          {attempt.failed_reason && (
                            <span className="text-xs text-muted-foreground">{attempt.failed_reason}</span>
                          )}
                          {attempt.blocked && attempt.block_duration_seconds && (
                            <span className="text-xs text-red-600">
                              Bloqueio: {Math.floor(attempt.block_duration_seconds / 60)}min
                            </span>
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
    </div>
  );
};
