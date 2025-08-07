import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Car, CheckCircle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const ChecklistViaturaCard = () => {
  const navigate = useNavigate();

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
            <Car className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Checklist de Viatura</h3>
            <CardDescription>
              Realize a inspeção completa da viatura antes do serviço
            </CardDescription>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle className="h-4 w-4" />
          <span>Verificação de equipamentos obrigatórios</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle className="h-4 w-4" />
          <span>Avaliação do estado da viatura</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle className="h-4 w-4" />
          <span>Controle de combustível e óleo</span>
        </div>
        
        <Button 
          onClick={() => navigate('/checklist-viatura')}
          className="w-full group/button"
        >
          <span>Iniciar Checklist</span>
          <ArrowRight className="h-4 w-4 ml-2 group-hover/button:translate-x-1 transition-transform" />
        </Button>
      </CardContent>
    </Card>
  );
};