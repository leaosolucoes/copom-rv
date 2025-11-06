-- Atualizar token do Mapbox no banco de dados
UPDATE system_settings 
SET value = '"pk.eyJ1IjoiYWRpbGFmaWxobyIsImEiOiJjbWhuYW9hb2EwMHdlMnJwdGZ4NzVyeWw1In0.v00sJiC6ynqIDVKzkKLp8A"'::jsonb,
    updated_at = NOW()
WHERE key = 'mapbox_public_token';