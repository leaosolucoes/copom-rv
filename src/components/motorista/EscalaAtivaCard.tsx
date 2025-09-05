import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Car, Clock, User, Phone, AlertTriangle, StopCircle } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { ImprevistosModal } from "./ImprevistosModal";
import { EncerrarEscalaModal } from "./EncerrarEscalaModal";

interface EscalaAtivaCardProps {
  escala: {
    id: string;
    viatura_id: string;
    data_servico: string;
    hora_entrada: string;
    hora_saida: string;
    km_inicial: number;
    celular_funcional: string | null;
    viaturas: { prefixo: string; modelo: string; placa: string } | null;
    fiscal: { full_name: string }[] | null;
  };
  onEscalaUpdated: () => void;
}

export const EscalaAtivaCard = ({ escala, onEscalaUpdated }: EscalaAtivaCardProps) => {
  const [showImprevistosModal, setShowImprevistosModal] = useState(false);
  const [showEncerrarModal, setShowEncerrarModal] = useState(false);

  return (
    <>
      <Card className="border-success bg-success/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <Car className="h-6 w-6 text-success" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Escala Ativa</h3>
              <Badge className="bg-success text-success-foreground mt-1">
                Em Serviço
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{escala.viaturas?.prefixo}</span>
              <span className="text-muted-foreground">- {escala.viaturas?.modelo}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Data: {formatInTimeZone(new Date(escala.data_servico + 'T12:00:00'), 'America/Sao_Paulo', 'dd/MM/yyyy')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Horário: {escala.hora_entrada} - {escala.hora_saida}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">KM Inicial: </span>
                  <span>{escala.km_inicial.toLocaleString()}</span>
                </div>
                {escala.fiscal && escala.fiscal.length > 0 && (
                  <div className="flex items-start gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="font-medium">Fiscais: </span>
                      {escala.fiscal.map((f, index) => (
                        <div key={index}>{f.full_name}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {escala.celular_funcional && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>Contato: {escala.celular_funcional}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEncerrarModal(true)}
              className="flex-1 justify-center"
            >
              <StopCircle className="h-4 w-4 mr-2" />
              Encerrar Escala
            </Button>
            <Button
              className="bg-warning text-warning-foreground hover:bg-warning/90 flex-1 justify-center"
              size="sm"
              onClick={() => setShowImprevistosModal(true)}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Informar Imprevisto
            </Button>
          </div>
        </CardContent>
      </Card>

      <ImprevistosModal
        open={showImprevistosModal}
        onOpenChange={setShowImprevistosModal}
        escalaId={escala.id}
        viaturaPrefixo={escala.viaturas?.prefixo || ""}
        onSuccess={() => {
          setShowImprevistosModal(false);
          onEscalaUpdated();
        }}
      />

      <EncerrarEscalaModal
        open={showEncerrarModal}
        onOpenChange={setShowEncerrarModal}
        escala={escala}
        onSuccess={() => {
          setShowEncerrarModal(false);
          onEscalaUpdated();
        }}
      />
    </>
  );
};