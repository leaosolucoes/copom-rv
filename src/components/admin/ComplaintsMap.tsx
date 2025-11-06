import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layers, Flame, Map as MapIcon } from 'lucide-react';

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
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [heatmapIntensity, setHeatmapIntensity] = useState<number>(1);
  const [heatmapRadius, setHeatmapRadius] = useState<number>(30);
  const [showMarkers, setShowMarkers] = useState<boolean>(true);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [mapStyle, setMapStyle] = useState<string>('streets-v12');

  const mapStyles = [
    { value: 'streets-v12', label: 'Ruas', icon: '🗺️' },
    { value: 'satellite-v9', label: 'Satélite', icon: '🛰️' },
    { value: 'satellite-streets-v12', label: 'Satélite + Ruas', icon: '🌍' },
    { value: 'light-v11', label: 'Claro', icon: '☀️' },
    { value: 'dark-v11', label: 'Escuro', icon: '🌙' },
    { value: 'outdoors-v12', label: 'Outdoor', icon: '🏔️' },
    { value: 'navigation-day-v1', label: 'Navegação', icon: '🧭' },
  ];

  // Buscar token do Mapbox
  useEffect(() => {
    const fetchMapboxToken = async () => {
      try {
        console.log('🔍 Buscando token do Mapbox...');
        const { data, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'mapbox_public_token')
          .maybeSingle();

        if (error) {
          console.error('❌ Erro ao buscar token:', error);
          throw error;
        }

        console.log('📦 Dados recebidos:', data);

        if (data?.value) {
          // O valor pode vir como string JSON, então precisamos fazer o parse
          let tokenValue = data.value;
          console.log('🔑 Token original (tipo:', typeof tokenValue, '):', tokenValue);
          
          if (typeof tokenValue === 'string') {
            try {
              tokenValue = JSON.parse(tokenValue);
              console.log('✅ Token após JSON.parse:', tokenValue);
            } catch {
              console.log('ℹ️ Token não é JSON, usando como está');
            }
          }
          
          const finalToken = tokenValue as string;
          console.log('✅ Token final configurado:', finalToken);
          setMapboxToken(finalToken);
        } else {
          console.warn('⚠️ Nenhum token encontrado no banco de dados');
        }
      } catch (error) {
        console.error('❌ Erro ao buscar token do Mapbox:', error);
      }
    };

    fetchMapboxToken();
  }, []);

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainer.current) {
      console.log('⚠️ Container do mapa não está pronto');
      return;
    }
    
    if (!mapboxToken) {
      console.log('⚠️ Token do Mapbox não está configurado');
      return;
    }

    console.log('🗺️ Inicializando mapa...');
    console.log('📍 Container:', mapContainer.current);
    console.log('🔑 Token:', mapboxToken);
    console.log('🎨 Estilo:', mapStyle);

    // Se já existe um mapa, removê-lo antes de criar um novo
    if (map.current) {
      console.log('🔄 Removendo mapa existente');
      map.current.remove();
      map.current = null;
    }

    try {
      mapboxgl.accessToken = mapboxToken;
      console.log('✅ Token do Mapbox configurado');

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: `mapbox://styles/mapbox/${mapStyle}`,
        center: [-47.9292, -15.7801], // Brasília como centro padrão
        zoom: 4,
      });
      
      console.log('✅ Mapa criado com sucesso');

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

      map.current.on('load', () => {
        console.log('✅ Mapa carregado completamente');
        setMapLoaded(true);
      });

      map.current.on('error', (e) => {
        console.error('❌ Erro no mapa:', e);
      });

    } catch (error) {
      console.error('ERRO ao inicializar mapa:', error);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      setMapLoaded(false);
    };
  }, [mapboxToken, mapStyle]);

  // Adicionar/atualizar camada de heatmap
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const complaintsWithLocation = complaints.filter(
      (c) => c.user_location?.latitude && c.user_location?.longitude
    );

    if (complaintsWithLocation.length === 0) return;

    // Criar GeoJSON para o heatmap
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: complaintsWithLocation.map((complaint) => ({
        type: 'Feature',
        properties: {
          id: complaint.id,
          protocol: complaint.protocol_number,
          status: complaint.status,
        },
        geometry: {
          type: 'Point',
          coordinates: [
            complaint.user_location!.longitude,
            complaint.user_location!.latitude,
          ],
        },
      })),
    };

    // Remover fonte e camada existentes se já existirem
    if (map.current.getSource('complaints-heat')) {
      map.current.removeLayer('complaints-heatmap');
      map.current.removeSource('complaints-heat');
    }

    // Adicionar fonte de dados
    map.current.addSource('complaints-heat', {
      type: 'geojson',
      data: geojson,
    });

    // Adicionar camada de heatmap
    map.current.addLayer({
      id: 'complaints-heatmap',
      type: 'heatmap',
      source: 'complaints-heat',
      maxzoom: 15,
      paint: {
        // Aumentar peso baseado no zoom
        'heatmap-weight': heatmapIntensity,
        
        // Aumentar intensidade conforme o zoom
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 1,
          15, 3
        ],
        
        // Raio do heatmap em pixels
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, heatmapRadius / 2,
          15, heatmapRadius * 2
        ],
        
        // Transição de opacidade baseada no zoom
        'heatmap-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          7, 0.8,
          15, 0.6
        ],
        
        // Cores do heatmap (azul -> verde -> amarelo -> laranja -> vermelho)
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(33,102,172,0)',
          0.2, 'rgb(103,169,207)',
          0.4, 'rgb(209,229,240)',
          0.6, 'rgb(253,219,199)',
          0.8, 'rgb(239,138,98)',
          1, 'rgb(178,24,43)'
        ],
      },
    });

    // Controlar visibilidade do heatmap
    map.current.setLayoutProperty(
      'complaints-heatmap',
      'visibility',
      showHeatmap ? 'visible' : 'none'
    );

  }, [complaints, mapLoaded, showHeatmap, heatmapIntensity, heatmapRadius]);

  // Atualizar marcadores quando as denúncias mudarem
  useEffect(() => {
    if (!map.current || !mapLoaded) {
      console.log('⚠️ Mapa não está pronto para adicionar marcadores');
      return;
    }

    console.log('📍 Processando marcadores para', complaints.length, 'denúncias');

    // Remover marcadores antigos
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    // Se showMarkers estiver desabilitado, não adicionar marcadores
    if (!showMarkers) {
      console.log('ℹ️ Marcadores desabilitados pelo usuário');
      return;
    }

    // Filtrar denúncias com localização válida
    const complaintsWithLocation = complaints.filter(
      (c) => c.user_location?.latitude && c.user_location?.longitude
    );

    console.log('📌 Denúncias com localização válida:', complaintsWithLocation.length);
    
    if (complaintsWithLocation.length > 0) {
      console.log('📊 Primeira denúncia com localização:', {
        id: complaintsWithLocation[0].id,
        protocol: complaintsWithLocation[0].protocol_number,
        location: complaintsWithLocation[0].user_location
      });
    }

    if (complaintsWithLocation.length === 0) {
      console.warn('⚠️ Nenhuma denúncia possui localização válida');
      return;
    }

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
  }, [complaints, mapLoaded, showMarkers]);

  if (!mapboxToken) {
    return (
      <div className="flex items-center justify-center h-96 bg-muted rounded-lg border-2 border-dashed">
        <div className="text-center space-y-4 p-8">
          <MapIcon className="h-12 w-12 mx-auto text-muted-foreground" />
          <div>
            <p className="text-lg font-semibold mb-2">Token do Mapbox não configurado</p>
            <p className="text-sm text-muted-foreground mb-4">
              Configure o token do Mapbox nas configurações do sistema para visualizar o mapa
            </p>
            <code className="bg-muted px-3 py-1.5 rounded text-xs">
              mapbox_public_token
            </code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controles do Heatmap e Estilo */}
      <div className="bg-muted/50 border border-muted rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Controles de Visualização
          </h4>
        </div>

        {/* Seletor de Estilo do Mapa */}
        <div className="space-y-2">
          <Label htmlFor="map-style" className="flex items-center gap-2 text-sm">
            <MapIcon className="h-4 w-4" />
            <span>Estilo do Mapa</span>
          </Label>
          <Select value={mapStyle} onValueChange={setMapStyle}>
            <SelectTrigger id="map-style" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mapStyles.map((style) => (
                <SelectItem key={style.value} value={style.value}>
                  <span className="flex items-center gap-2">
                    <span>{style.icon}</span>
                    <span>{style.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="show-heatmap" className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <span>Heatmap de Densidade</span>
            </Label>
            <Switch
              id="show-heatmap"
              checked={showHeatmap}
              onCheckedChange={setShowHeatmap}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show-markers">Mostrar Marcadores</Label>
            <Switch
              id="show-markers"
              checked={showMarkers}
              onCheckedChange={setShowMarkers}
            />
          </div>
        </div>

        {showHeatmap && (
          <div className="space-y-4 pt-2 border-t">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="heatmap-intensity" className="text-xs">
                  Intensidade do Heatmap
                </Label>
                <span className="text-xs text-muted-foreground">{heatmapIntensity.toFixed(1)}</span>
              </div>
              <Slider
                id="heatmap-intensity"
                min={0.1}
                max={3}
                step={0.1}
                value={[heatmapIntensity]}
                onValueChange={(value) => setHeatmapIntensity(value[0])}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="heatmap-radius" className="text-xs">
                  Raio do Heatmap (px)
                </Label>
                <span className="text-xs text-muted-foreground">{heatmapRadius}</span>
              </div>
              <Slider
                id="heatmap-radius"
                min={10}
                max={100}
                step={5}
                value={[heatmapRadius]}
                onValueChange={(value) => setHeatmapRadius(value[0])}
              />
            </div>

            <div className="bg-background/50 rounded p-2 space-y-1">
              <p className="text-xs font-semibold">Legenda do Heatmap:</p>
              <div className="flex items-center gap-2 text-xs">
                <div className="flex-1 h-4 rounded" style={{
                  background: 'linear-gradient(to right, rgb(103,169,207), rgb(209,229,240), rgb(253,219,199), rgb(239,138,98), rgb(178,24,43))'
                }}></div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Baixa densidade</span>
                <span>Alta densidade</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mapa */}
      <div className="relative w-full h-96 rounded-lg overflow-hidden shadow-lg">
        <div ref={mapContainer} className="absolute inset-0" />
        
        {/* Legenda de Status (apenas se marcadores visíveis) */}
        {showMarkers && (
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
        )}

        {/* Indicador de Heatmap ativo */}
        {showHeatmap && (
          <div className="absolute top-4 left-4 bg-orange-500/90 text-white px-3 py-1.5 rounded-full shadow-lg text-xs font-semibold flex items-center gap-2">
            <Flame className="h-3 w-3" />
            Heatmap Ativo
          </div>
        )}
      </div>
    </div>
  );
};
