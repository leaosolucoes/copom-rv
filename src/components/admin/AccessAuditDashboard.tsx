import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Download, Filter, Search, Users, Clock, Globe, Monitor } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface AccessLog {
  id: string
  user_id: string
  user_name: string
  user_email: string
  user_role: string
  login_timestamp: string
  logout_timestamp?: string | null
  session_duration_minutes?: number | null
  ip_address?: unknown
  user_agent?: string | null
  device_type?: string | null
  browser_name?: string | null
  operating_system?: string | null
  location_country?: string | null
  location_region?: string | null
  location_city?: string | null
  login_method: string
  login_success: boolean
  failure_reason?: string | null
}

interface AccessStats {
  total_logins: number
  successful_logins: number
  failed_logins: number
  unique_users: number
  avg_session_duration: number
  most_used_device: string
  most_used_browser: string
}

export default function AccessAuditDashboard() {
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<AccessLog[]>([])
  const [stats, setStats] = useState<AccessStats | null>(null)
  const [users, setUsers] = useState<Array<{id: string, full_name: string, email: string}>>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState("all")
  const [selectedPeriod, setSelectedPeriod] = useState("7")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const { toast } = useToast()

  useEffect(() => {
    fetchUsers()
    fetchAccessLogs()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [accessLogs, searchTerm, selectedUser, selectedPeriod, selectedStatus])

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('is_active', true)
      .order('full_name')

    if (error) {
      console.error('Error fetching users:', error)
      return
    }

    setUsers(data || [])
  }

  const fetchAccessLogs = async () => {
    setLoading(true)
    
    const { data, error } = await supabase
      .from('access_audit_logs')
      .select('*')
      .order('login_timestamp', { ascending: false })
      .limit(1000)

    if (error) {
      console.error('Error fetching access logs:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar logs de acesso",
        variant: "destructive"
      })
      setLoading(false)
      return
    }

    setAccessLogs(data || [])
    calculateStats(data || [])
    setLoading(false)
  }

  const applyFilters = () => {
    let filtered = [...accessLogs]

    // Filtro por período
    if (selectedPeriod !== "all") {
      const days = parseInt(selectedPeriod)
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)
      filtered = filtered.filter(log => new Date(log.login_timestamp) >= cutoffDate)
    }

    // Filtro por usuário
    if (selectedUser !== "all") {
      filtered = filtered.filter(log => log.user_id === selectedUser)
    }

    // Filtro por status
    if (selectedStatus !== "all") {
      const isSuccess = selectedStatus === "success"
      filtered = filtered.filter(log => log.login_success === isSuccess)
    }

    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (typeof log.ip_address === 'string' && log.ip_address.includes(searchTerm)) ||
        log.location_city?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredLogs(filtered)
    calculateStats(filtered)
  }

  const calculateStats = (logs: AccessLog[]) => {
    const successfulLogins = logs.filter(log => log.login_success)
    const failedLogins = logs.filter(log => !log.login_success)
    const uniqueUsers = new Set(logs.map(log => log.user_id)).size
    
    const sessionDurations = logs
      .filter(log => log.session_duration_minutes)
      .map(log => log.session_duration_minutes!)
    const avgSession = sessionDurations.length > 0 
      ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length 
      : 0

    const deviceCounts = logs.reduce((acc, log) => {
      if (log.device_type) {
        acc[log.device_type] = (acc[log.device_type] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    const browserCounts = logs.reduce((acc, log) => {
      if (log.browser_name) {
        acc[log.browser_name] = (acc[log.browser_name] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    const mostUsedDevice = Object.keys(deviceCounts).reduce(
      (a, b) => deviceCounts[a] > deviceCounts[b] ? a : b, 
      Object.keys(deviceCounts)[0] || 'N/A'
    )

    const mostUsedBrowser = Object.keys(browserCounts).reduce(
      (a, b) => browserCounts[a] > browserCounts[b] ? a : b,
      Object.keys(browserCounts)[0] || 'N/A'
    )

    setStats({
      total_logins: logs.length,
      successful_logins: successfulLogins.length,
      failed_logins: failedLogins.length,
      unique_users: uniqueUsers,
      avg_session_duration: Math.round(avgSession),
      most_used_device: mostUsedDevice,
      most_used_browser: mostUsedBrowser
    })
  }

  const exportToPDF = async () => {
    toast({
      title: "Exportação",
      description: "Iniciando exportação do relatório...",
    })
    
    // Aqui você pode implementar a exportação em PDF
    // Usando bibliotecas como jsPDF ou html2pdf
  }

  const formatLocation = (log: AccessLog) => {
    const parts = []
    if (log.location_city) parts.push(log.location_city)
    if (log.location_region) parts.push(log.location_region)
    if (log.location_country) parts.push(log.location_country)
    return parts.join(', ') || 'N/A'
  }

  const formatSessionDuration = (minutes?: number) => {
    if (!minutes) return 'N/A'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Acessos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_logins}</div>
              <p className="text-xs text-muted-foreground">
                {stats.successful_logins} sucessos, {stats.failed_logins} falhas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários Únicos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unique_users}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sessão Média</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatSessionDuration(stats.avg_session_duration)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dispositivo Mais Usado</CardTitle>
              <Monitor className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.most_used_device}</div>
              <p className="text-xs text-muted-foreground">{stats.most_used_browser}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Auditoria</CardTitle>
          <CardDescription>
            Filtre os logs de acesso por usuário, período e status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou IP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os usuários</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo o período</SelectItem>
                <SelectItem value="1">Último dia</SelectItem>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="success">Sucessos</SelectItem>
                <SelectItem value="failed">Falhas</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={exportToPDF} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Logs de Acesso ({filteredLogs.length})</CardTitle>
          <CardDescription>
            Histórico detalhado de todos os acessos ao sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>IP/Localização</TableHead>
                  <TableHead>Dispositivo</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{log.user_name}</div>
                        <div className="text-sm text-muted-foreground">{log.user_email}</div>
                        <Badge variant="outline" className="text-xs">
                          {log.user_role}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {format(new Date(log.login_timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                        </div>
                        {log.logout_timestamp && (
                          <div className="text-sm text-muted-foreground">
                            Logout: {format(new Date(log.logout_timestamp), 'HH:mm:ss', { locale: ptBR })}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatSessionDuration(log.session_duration_minutes)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{String(log.ip_address) || 'N/A'}</div>
                        <div className="text-sm text-muted-foreground flex items-center">
                          <Globe className="h-3 w-3 mr-1" />
                          {formatLocation(log)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{log.device_type || 'N/A'}</div>
                        <div className="text-sm text-muted-foreground">
                          {log.browser_name} • {log.operating_system}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.login_success ? "default" : "destructive"}>
                        {log.login_success ? "Sucesso" : "Falha"}
                      </Badge>
                      {log.failure_reason && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {log.failure_reason}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredLogs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum log de acesso encontrado para os filtros selecionados.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}