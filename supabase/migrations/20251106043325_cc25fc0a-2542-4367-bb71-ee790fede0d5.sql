-- Adicionar configuração do Mapbox token
INSERT INTO system_settings (key, value, description) VALUES
('mapbox_public_token', '""', 'Token público do Mapbox para renderização de mapas')
ON CONFLICT (key) DO NOTHING;