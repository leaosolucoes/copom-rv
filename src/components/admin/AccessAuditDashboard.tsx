import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function AccessAuditDashboard() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Auditoria de Acessos</CardTitle>
          <CardDescription>
            Monitoramento de logs de acesso ao sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Este recurso requer a configuração de tabelas específicas de auditoria de acesso.
              Entre em contato com o administrador do sistema para habilitar este recurso.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
