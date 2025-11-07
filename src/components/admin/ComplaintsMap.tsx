import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Layers, Flame, Map as MapIcon, AlertCircle, ExternalLink } from 'lucide-react';

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
  const [mapInitializing, setMapInitializing] = useState<boolean>(false);
  const [webglError, setWebglError] = useState<boolean>(false);

  // Verificar suporte a WebGL
  const checkWebGLSupport = () => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch (e) {
      return false;
    }
  };

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
        const { data, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'mapbox_public_token')
          .maybeSingle();

        if (error) {
          console.error('Erro ao buscar token do Mapbox:', error);
          return;
        }

        if (data?.value) {
          // O valor vem como JSONB, pode ser string ou objeto
          let tokenValue = data.value;
          
          // Se for string, tentar parsear
          if (typeof tokenValue === 'string') {
            try {
              // Se começar com aspas duplas, remover
              if (tokenValue.startsWith('"') && tokenValue.endsWith('"')) {
                tokenValue = tokenValue.slice(1, -1);
              } else {
                // Tentar parsear como JSON
                tokenValue = JSON.parse(tokenValue);
              }
            } catch {
              // Se falhar, usar como está
            }
          }
          
          const finalToken = String(tokenValue).trim();
          console.log('✅ Token do Mapbox carregado:', finalToken.substring(0, 30) + '...');
          console.log('🔑 Tamanho do token:', finalToken.length);
          console.log('🔍 Começa com pk.?', finalToken.startsWith('pk.'));
          
          if (!finalToken.startsWith('pk.')) {
            console.error('❌ ERRO: Token inválido - deve começar com "pk."');
            alert('ERRO: Token do Mapbox inválido. Verifique a configuração.');
            return;
          }
          
          setMapboxToken(finalToken);
        } else {
          console.warn('⚠️ Nenhum token encontrado no banco de dados');
        }
      } catch (error) {
        console.error('Erro ao buscar token do Mapbox:', error);
      }
    };

    fetchMapboxToken();
  }, []);

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainer.current) {
      return;
    }
    
    if (!mapboxToken) {
      return;
    }

    // Se já existe um mapa, removê-lo antes de criar um novo
    if (map.current) {
      map.current.remove();
      map.current = null;
    }

    // Verificar suporte WebGL antes de inicializar
    if (!checkWebGLSupport()) {
      console.error('❌ WebGL não está disponível');
      setWebglError(true);
      setMapInitializing(false);
      return;
    }

    // Adicionar um pequeno delay para garantir que o container está pronto
    const initMap = setTimeout(() => {
      try {
        setMapInitializing(true);
        setWebglError(false);
        
        console.log('🗺️ Inicializando mapa...');
        console.log('Token a ser usado:', mapboxToken.substring(0, 20) + '...');
        console.log('Estilo do mapa:', `mapbox://styles/mapbox/${mapStyle}`);
        
        mapboxgl.accessToken = mapboxToken;

        map.current = new mapboxgl.Map({
          container: mapContainer.current!,
          style: `mapbox://styles/mapbox/${mapStyle}`,
          center: [-47.9292, -15.7801],
          zoom: 4,
          preserveDrawingBuffer: true,
          antialias: true,
          failIfMajorPerformanceCaveat: false,
        });
        
        console.log('✅ Objeto map.current criado');

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
          console.log('✅ Mapa CARREGADO completamente!');
          setMapLoaded(true);
          setMapInitializing(false);
        });

        map.current.on('error', (e) => {
          console.error('❌ ERRO no mapa Mapbox:', e);
          console.error('📋 Tipo de erro:', e.type);
          console.error('📋 Erro objeto:', e.error);
          
          if (e.error) {
            console.error('📋 Mensagem do erro:', e.error.message);
            
            if (e.error.message) {
              const errorMsg = e.error.message.toLowerCase();
              
              if (errorMsg.includes('token') || errorMsg.includes('unauthorized') || errorMsg.includes('401')) {
                console.error('🔑 ERRO DE AUTENTICAÇÃO: Token inválido ou expirado');
                alert('ERRO: O token do Mapbox está inválido ou expirado.\n\nPor favor:\n1. Vá em https://account.mapbox.com/access-tokens/\n2. Crie ou copie um token válido\n3. Cole no campo de configuração do Mapbox');
                setWebglError(false); // Não é erro de WebGL
              } else if (errorMsg.includes('webgl')) {
                console.error('🎨 ERRO DE WEBGL: WebGL não suportado');
                setWebglError(true);
              } else {
                console.error('⚠️ ERRO DESCONHECIDO:', errorMsg);
                alert('ERRO no Mapbox: ' + errorMsg);
              }
            }
          }
          setMapInitializing(false);
        });

      } catch (error) {
        console.error('❌ ERRO ao inicializar mapa:', error);
        if (error instanceof Error && error.message.includes('WebGL')) {
          setWebglError(true);
        }
        setMapInitializing(false);
      }
    }, 100);

    return () => {
      clearTimeout(initMap);
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      setMapLoaded(false);
      setMapInitializing(false);
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
      return;
    }

    // Remover marcadores antigos
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    // Se showMarkers estiver desabilitado, não adicionar marcadores
    if (!showMarkers) {
      return;
    }

    // Filtrar denúncias com localização válida
    const complaintsWithLocation = complaints.filter(
      (c) => c.user_location?.latitude && c.user_location?.longitude
    );

    if (complaintsWithLocation.length === 0) {
      return;
    }

    console.log('📍 Adicionando', complaintsWithLocation.length, 'marcadores');

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
      <div className="flex items-center justify-center h-[500px] bg-muted rounded-lg border-2 border-dashed">
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

  // Renderizar erro de WebGL com instruções
  if (webglError) {
    const complaintsWithLocation = complaints.filter(
      (c) => c.user_location?.latitude && c.user_location?.longitude
    );

    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>WebGL não está disponível</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              O mapa requer WebGL para funcionar, mas ele não está disponível no seu navegador.
            </p>
            
            <div className="space-y-2 mt-4">
              <p className="font-semibold">Possíveis soluções:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Habilite a aceleração de hardware no seu navegador</li>
                <li>Atualize seu navegador para a versão mais recente</li>
                <li>Atualize os drivers da sua placa de vídeo</li>
                <li>Tente usar outro navegador (Chrome, Firefox, Edge)</li>
              </ul>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://get.webgl.org/', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Testar suporte WebGL
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                Recarregar página
              </Button>
            </div>
          </AlertDescription>
        </Alert>

        {/* Lista alternativa de denúncias com localização */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Denúncias com Localização ({complaintsWithLocation.length})</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {complaintsWithLocation.map((complaint) => (
              <div
                key={complaint.id}
                className="p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">#{complaint.protocol_number}</p>
                    <p className="text-sm text-muted-foreground">{complaint.occurrence_type}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {complaint.complainant_name}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      complaint.status === 'nova'
                        ? 'bg-blue-100 text-blue-700'
                        : complaint.status === 'em_andamento'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {complaint.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  📍 {complaint.user_location?.latitude.toFixed(6)}, {complaint.user_location?.longitude.toFixed(6)}
                </p>
              </div>
            ))}
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
      <div className="relative w-full h-[500px] rounded-lg overflow-hidden shadow-lg border">
        {mapInitializing && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="text-center space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm font-medium">Carregando mapa...</p>
            </div>
          </div>
        )}
        <div ref={mapContainer} className="w-full h-full min-h-[500px]" style={{ minHeight: '500px' }} />
        
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
