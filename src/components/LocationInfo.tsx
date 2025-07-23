import React, { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';

interface LocationInfoProps {
  userLocation: any;
}

export const LocationInfo: React.FC<LocationInfoProps> = ({ userLocation }) => {
  const [address, setAddress] = useState<string>('');
  const [loading, setLoading] = useState(false);

  let latitude: number | null = null;
  let longitude: number | null = null;
  let accuracy: number | null = null;

  // Parse location data
  if (typeof userLocation === 'object' && userLocation.latitude) {
    latitude = userLocation.latitude;
    longitude = userLocation.longitude;
    accuracy = userLocation.accuracy;
  } else if (typeof userLocation === 'string') {
    const lines = userLocation.trim().split('\n');
    if (lines.length === 2) {
      latitude = parseFloat(lines[0]);
      longitude = parseFloat(lines[1]);
    }
  }

  // Fetch address when coordinates change
  useEffect(() => {
    if (latitude && longitude) {
      const getAddress = async () => {
        setLoading(true);
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=pt-BR`
          );
          
          if (response.ok) {
            const data = await response.json();
            setAddress(data.display_name || 'Endereço não encontrado');
          } else {
            setAddress('Erro ao buscar endereço');
          }
        } catch (error) {
          console.error('Erro ao buscar endereço:', error);
          setAddress('Erro ao buscar endereço');
        } finally {
          setLoading(false);
        }
      };
      
      getAddress();
    }
  }, [latitude, longitude]);

  if (!latitude || !longitude) {
    return (
      <div className="text-gray-500">
        Dados de localização inválidos
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <strong>Coordenadas:</strong>
        <div className="ml-4 mt-1">
          <div>Latitude: {latitude}</div>
          <div>Longitude: {longitude}</div>
          {accuracy && (
            <div>Precisão: {Math.round(accuracy)}m</div>
          )}
        </div>
      </div>
      
      <div>
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-4 w-4 text-blue-600" />
          <strong>Localização Aproximada:</strong>
        </div>
        <div className="ml-6 text-sm bg-blue-50 p-2 rounded border-l-4 border-blue-400">
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Buscando endereço...</span>
            </div>
          ) : (
            <span>{address || 'Endereço não disponível'}</span>
          )}
        </div>
      </div>
      
      <div className="pt-2 border-t">
        <a 
          href={`https://www.google.com/maps?q=${latitude},${longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 underline"
        >
          <MapPin className="h-4 w-4" />
          Ver no Google Maps
        </a>
      </div>
    </div>
  );
};