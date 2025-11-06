import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';

interface Complaint {
  id: string;
  protocol_number: string;
  complainant_name: string;
  occurrence_type: string;
  status: string;
  user_location?: {
    latitude: number;
    longitude: number;
  };
  created_at: string;
  attendant_id?: string;
}

interface ComplaintsMapProps {
  complaints: Complaint[];
}

export const ComplaintsMap = ({ complaints }: ComplaintsMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string>('');

  // Buscar token do Mapbox
  useEffect(() => {
    const fetchMapboxToken = async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'mapbox_public_token')
          .maybeSingle();

        if (error) throw error;

        if (data?.value) {
          setMapboxToken(data.value as string);
        }
      } catch (error) {
        console.error('Erro ao buscar token do Mapbox:', error);
      }
    };

    fetchMapboxToken();
  }, []);

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-47.9292, -15.7801], // Brasília como centro padrão
      zoom: 4,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    map.current.addControl(
      new mapboxgl.FullscreenControl(),
      'top-right'
    );

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken]);

  // Atualizar marcadores quando as denúncias mudarem
  useEffect(() => {
    if (!map.current) return;

    // Remover marcadores antigos
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    // Filtrar denúncias com localização válida
    const complaintsWithLocation = complaints.filter(
      (c) => c.user_location?.latitude && c.user_location?.longitude
    );

    if (complaintsWithLocation.length === 0) return;

    // Adicionar novos marcadores
    complaintsWithLocation.forEach((complaint) => {
      if (!complaint.user_location) return;

      const { latitude, longitude } = complaint.user_location;

      // Definir cor baseada no status
      const getStatusColor = (status: string): string => {
        switch (status) {
          case 'nova':
            return '#3b82f6'; // Azul
          case 'em_andamento':
            return '#f59e0b'; // Laranja
          case 'processada':
            return '#10b981'; // Verde
          case 'arquivada':
            return '#6b7280'; // Cinza
          default:
            return '#8b5cf6'; // Roxo
        }
      };

      // Criar elemento HTML customizado para o marcador
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = getStatusColor(complaint.status);
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';
      el.style.transition = 'transform 0.2s';

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.2)';
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });

      // Criar popup com informações da denúncia
      const getStatusText = (status: string): string => {
        switch (status) {
          case 'nova':
            return 'Nova';
          case 'em_andamento':
            return 'Em Andamento';
          case 'processada':
            return 'Processada';
          case 'arquivada':
            return 'Arquivada';
          default:
            return status;
        }
      };

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px; min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; font-weight: bold; font-size: 14px;">
            Protocolo #${complaint.protocol_number}
          </h3>
          <div style="font-size: 12px; color: #666;">
            <p style="margin: 4px 0;"><strong>Denunciante:</strong> ${complaint.complainant_name}</p>
            <p style="margin: 4px 0;"><strong>Tipo:</strong> ${complaint.occurrence_type}</p>
            <p style="margin: 4px 0;">
              <strong>Status:</strong> 
              <span style="
                padding: 2px 6px;
                border-radius: 4px;
                background-color: ${getStatusColor(complaint.status)};
                color: white;
                font-size: 10px;
              ">
                ${getStatusText(complaint.status)}
              </span>
            </p>
            <p style="margin: 4px 0;"><strong>Data:</strong> ${new Date(complaint.created_at).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
      `);

      // Criar marcador
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([longitude, latitude])
        .setPopup(popup)
        .addTo(map.current!);

      markers.current.push(marker);
    });

    // Ajustar bounds para mostrar todos os marcadores
    if (complaintsWithLocation.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();

      complaintsWithLocation.forEach((complaint) => {
        if (complaint.user_location) {
          bounds.extend([
            complaint.user_location.longitude,
            complaint.user_location.latitude,
          ]);
        }
      });

      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15,
      });
    }
  }, [complaints]);

  if (!mapboxToken) {
    return (
      <div className="flex items-center justify-center h-96 bg-muted rounded-lg">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            Configure o token do Mapbox nas configurações do sistema
          </p>
          <p className="text-sm text-muted-foreground">
            Chave de configuração: <code className="bg-muted-foreground/20 px-2 py-1 rounded">mapbox_public_token</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-96 rounded-lg overflow-hidden shadow-lg">
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Legenda */}
      <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg p-3 space-y-2">
        <h4 className="font-semibold text-sm mb-2">Status</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#3b82f6] border-2 border-white"></div>
            <span>Nova</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#f59e0b] border-2 border-white"></div>
            <span>Em Andamento</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#10b981] border-2 border-white"></div>
            <span>Processada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#6b7280] border-2 border-white"></div>
            <span>Arquivada</span>
          </div>
        </div>
      </div>
    </div>
  );
};
