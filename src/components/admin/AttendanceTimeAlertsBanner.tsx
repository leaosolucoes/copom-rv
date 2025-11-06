import { useState, useEffect } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, RefreshCw, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAttendanceTimeMonitor } from '@/hooks/useAttendanceTimeMonitor';
import { useNavigate } from 'react-router-dom';

export const AttendanceTimeAlertsBanner = () => {
  const { overdueComplaints, totalOverdue, timeLimit, checkNow, soundEnabled } = useAttendanceTimeMonitor();
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasPlayedSound, setHasPlayedSound] = useState(false);
  const navigate = useNavigate();

  // Tocar som de alerta quando há denúncias atrasadas
  useEffect(() => {
    if (totalOverdue > 0 && soundEnabled && !hasPlayedSound) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);

      setHasPlayedSound(true);
      
      setTimeout(() => setHasPlayedSound(false), 60000);
    }
  }, [totalOverdue, soundEnabled, hasPlayedSound]);

  if (totalOverdue === 0) return null;

  const getUrgencyLevel = (complaint: any): 'attention' | 'alert' | 'critical' => {
    const now = new Date().getTime();
    const startTime = complaint.verified_at 
      ? new Date(complaint.verified_at).getTime()
      : new Date(complaint.created_at).getTime();
    
    const elapsedMinutes = Math.floor((now - startTime) / (1000 * 60));
    const percentage = (elapsedMinutes / timeLimit) * 100;

    if (percentage > 150) return 'critical';
    if (percentage > 100) return 'alert';
    return 'attention';
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'alert': return 'bg-orange-500 text-white';
      case 'attention': return 'bg-yellow-500 text-black';
      default: return 'bg-muted';
    }
  };

  const formatDelay = (complaint: any): string => {
    const now = new Date().getTime();
    const startTime = complaint.verified_at 
      ? new Date(complaint.verified_at).getTime()
      : new Date(complaint.created_at).getTime();
    
    const elapsedMinutes = Math.floor((now - startTime) / (1000 * 60));
    const delayMinutes = elapsedMinutes - timeLimit;

    if (delayMinutes < 60) {
      return `${delayMinutes} min`;
    }
    const hours = Math.floor(delayMinutes / 60);
    const minutes = delayMinutes % 60;
    return `${hours}h ${minutes}min`;
  };

  return (
    <Card className="border-destructive bg-destructive/10 mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-destructive animate-pulse" />
            <CardTitle className="text-destructive">
              ATENÇÃO: {totalOverdue} {totalOverdue === 1 ? 'denúncia ultrapassou' : 'denúncias ultrapassaram'} o tempo limite!
            </CardTitle>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={checkNow}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  Ocultar <ChevronUp className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Ver Detalhes <ChevronDown className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-3">
          {overdueComplaints.map((complaint) => {
            const urgency = getUrgencyLevel(complaint);
            return (
              <Card key={complaint.id} className="border-l-4 border-l-destructive">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className={getUrgencyColor(urgency)}>
                          {urgency === 'critical' ? '🔴 CRÍTICO' : urgency === 'alert' ? '🟠 ALERTA' : '🟡 ATENÇÃO'}
                        </Badge>
                        <span className="font-semibold">
                          Protocolo #{complaint.protocol_number}
                        </span>
                        <span className="text-muted-foreground">-</span>
                        <span>{complaint.complainant_name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Tipo:</span> {complaint.occurrence_type}
                      </div>
                      <div className="text-sm font-medium text-destructive">
                        Atrasado: {formatDelay(complaint)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Navegar para a denúncia específica
                          window.open(`#complaint-${complaint.id}`, '_self');
                        }}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Ver Denúncia
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
};
